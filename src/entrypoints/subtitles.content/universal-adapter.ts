import type { ControlsConfig, PlatformConfig } from "@/entrypoints/subtitles.content/platforms"

import type { Config } from "@/types/config/config"
import type { SubtitlesSource } from "@/utils/constants/subtitles"
import type { SubtitlesFetcher } from "@/utils/subtitles/fetchers/types"
import type { SubtitlesVideoContext } from "@/utils/subtitles/processor/translator"
import type { SubtitlesFragment } from "@/utils/subtitles/types"
import { toastManager } from "@/components/ui/base-ui/toast"



import { getLocalConfig } from "@/utils/config/storage"
import {
  HIDE_NATIVE_CAPTIONS_STYLE_ID,
  NAVIGATION_HANDLER_DELAY,
  SUBTITLES_SOURCE,
  TRANSLATE_BUTTON_CONTAINER_ID,
} from "@/utils/constants/subtitles"
import { getDocumentDescription } from "@/utils/content/metadata"
import { resolveLanguageCodeFromLocale } from "@/utils/content/page-language"
import { waitForElement } from "@/utils/dom/wait-for-element"
import { i18n } from "@/utils/i18n"
import { canProviderRefGenerateText } from "@/utils/providers/provider-ref"

import { OverlaySubtitlesError, ToastSubtitlesError } from "@/utils/subtitles/errors"
import { optimizeSubtitles } from "@/utils/subtitles/processor/optimizer"
import {
  buildSubtitlesSummaryContextHash,
  resolveSubtitlesProviderRef,
  fetchSubtitlesSummary,
} from "@/utils/subtitles/processor/translator"
import { downloadSubtitlesAsSrt } from "@/utils/subtitles/srt"
import { showSubtitlesErrorToast } from "@/utils/subtitles/toast"
import { requestVideoSummary, VIDEO_SUMMARY_QUERY_SCOPE } from "@/utils/subtitles/video-summary"
import { queryClient } from "@/utils/tanstack-query"
import {
  adPlayingAtom,
  currentTimeMsAtom,
  currentVideoIdAtom,
  sourceTrackAtom,
  translatedTrackAtom,
  videoSummaryPartialAtom,
  subtitlesPositionAtom,
  subtitlesSettingsPanelOpenAtom,
  subtitlesSettingsPanelViewAtom,
  subtitlesSidebarOpenAtom,
  subtitlesSourceAtom,
  subtitlesStore,
} from "./atoms"
import { renderSubtitlesTranslateButton } from "./renderer/render-translate-button"
import { SegmentationPipeline } from "./segmentation-pipeline"
import { SubtitlesScheduler } from "./subtitles-scheduler"
import { TranslatedSubtitlesDownloader } from "./translated-subtitles-downloader"
import { TranslationCoordinator } from "./translation-coordinator"
import { ROOT_VIEW } from "./ui/subtitles-settings-panel/views"





type SubtitlesFetcherFactories = {
  native: () => SubtitlesFetcher
}

const LOADING_MESSAGE: Record<SubtitlesSource, string | undefined> = {
  [SUBTITLES_SOURCE.NATIVE]: undefined,
}

export interface SubtitlesProvidersAdapter {
  readonly embedded: boolean | undefined
  readonly containerShrinkRatio: ((container: HTMLElement) => number | null) | undefined
  
  getControlsConfig: () => ControlsConfig | undefined
  readonly supportsSidebar: boolean
  generateVideoSummary: (config: Config, videoId?: string | null) => Promise<string | null>
  hasSubtitlesAvailable: () => Promise<boolean>
  ensureSourceTrackPublished: () => Promise<void>
  seekTo: (seconds: number) => void
  toggleSubtitlesManually: (enabled: boolean) => void
  toggleSubtitlesByShortcut: (enabled: boolean) => void
  
  downloadSourceSubtitles: () => Promise<void>
  downloadTranslatedSubtitles: () => Promise<void>
}

export class UniversalVideoAdapter implements SubtitlesProvidersAdapter {
  private config: PlatformConfig
  private subtitlesScheduler: SubtitlesScheduler | null = null
  private fetchers: SubtitlesFetcherFactories
  private source: SubtitlesSource = SUBTITLES_SOURCE.NATIVE
  private fetcher: SubtitlesFetcher
  private switchOperationId = 0
  private navigationReinitTimeoutId: ReturnType<typeof setTimeout> | null = null
  private hasPendingNavigationReset = false
  private trackChangeRefreshPromise: Promise<void> | null = null
  private pendingTranscriptLoads = 0

  private sourceSubtitles: SubtitlesFragment[] = []
  private sourceProcessedSubtitles: SubtitlesFragment[] = []
  private summaryAbortController: AbortController | null = null
  private sourceVideoId: string | null = null
  private sourceCacheVersion = 0
  private navigationVideoId: string | null

  private sessionSubtitles: SubtitlesFragment[] = []
  private sessionProcessedFragments: SubtitlesFragment[] = []
  private sessionVideoId: string | null = null

  private isNativeSubtitlesHidden = false
  private segmentationPipeline: SegmentationPipeline | null = null
  private translationCoordinator: TranslationCoordinator | null = null
  private translatedSubtitlesDownloader: TranslatedSubtitlesDownloader | null = null
  private subtitlesSummaryContextHash: string | null = null
  private adObserver: MutationObserver | null = null
  private observedAdPlayer: HTMLElement | null = null

  get embedded() {
    return this.config.embedded
  }

  get containerShrinkRatio() {
    return this.config.containerShrinkRatio
  }

  get supportsSidebar() {
    return this.config.supportsSidebar ?? false
  }

  get videoIdChanged() {
    const currentVideoId = this.config.getVideoId?.() ?? null
    const knownVideoId = this.navigationVideoId ?? this.sessionVideoId ?? this.sourceVideoId
    return knownVideoId !== null && currentVideoId !== knownVideoId
  }

  

  constructor({
    config,
    fetchers,
  }: {
    config: PlatformConfig
    fetchers: SubtitlesFetcherFactories
  }) {
    this.config = config
    this.navigationVideoId = config.getVideoId?.() ?? null
    this.fetchers = fetchers
    this.fetcher = fetchers.native()
  }

  async initialize() {
    this.publishVideoId()
    this.initializeTranslatedSubtitlesDownloader()
    void this.restorePosition()
    void this.renderTranslateButton()

    await this.initializeScheduler()
    this.setupAdObserver()
    await this.tryAutoStartSubtitles()
    this.setupNavigationListeners()
  }

  getControlsConfig(): ControlsConfig | undefined {
    return this.config.controls
  }

  toggleSubtitlesManually = (enabled: boolean) => {
    this.toggleSubtitlesWithSource(enabled)
  }

  toggleSubtitlesByShortcut = (enabled: boolean) => {
    this.toggleSubtitlesWithSource(enabled)
  }

  async handleSourceTrackChanged(): Promise<void> {
    if (!this.trackChangeRefreshPromise) {
      this.trackChangeRefreshPromise = this.refreshSourceTrackIfNeeded().finally(() => {
        this.trackChangeRefreshPromise = null
      })
    }

    await this.trackChangeRefreshPromise
  }

  generateVideoSummary = async (config: Config, videoId = this.config.getVideoId?.() ?? null) => {
    // A stale query must not cancel the new video's stream or borrow its subtitles.
    if (
      videoId === null ||
      videoId !== subtitlesStore.get(currentVideoIdAtom) ||
      videoId !== (this.config.getVideoId?.() ?? null)
    ) {
      throw new DOMException("Video summary superseded", "AbortError")
    }
    this.summaryAbortController?.abort()
    const abortController = new AbortController()
    this.summaryAbortController = abortController
    const { signal } = abortController
    subtitlesStore.set(videoSummaryPartialAtom, "")
    try {
      await this.getOrLoadSourceSubtitles(signal)
      signal.throwIfAborted()
      const summary = await requestVideoSummary(this.sourceProcessedSubtitles, config, {
        signal,
        onChunk: (partialMarkdown) => {
          if (!signal.aborted) {
            subtitlesStore.set(videoSummaryPartialAtom, partialMarkdown)
          }
        },
      })
      signal.throwIfAborted()
      return summary
    } finally {
      if (this.summaryAbortController === abortController) {
        this.summaryAbortController = null
      }
    }
  }

  hasSubtitlesAvailable = () => this.fetcher.hasAvailableSubtitles()

  /**
   * The transcript reads `sourceTrackAtom`, which only fills once a subtitles
   * session starts. Publishing it here does not put captions on the video:
   * rendering is gated on `subtitlesVisibleAtom`, which only the scheduler sets.
   */
  ensureSourceTrackPublished = async () => {
    if (subtitlesStore.get(sourceTrackAtom).length > 0) {
      return
    }
    const operationId = this.switchOperationId
    this.pendingTranscriptLoads++
    try {
      await this.getOrLoadSourceSubtitles()
    } finally {
      this.pendingTranscriptLoads--
    }

    if (operationId !== this.switchOperationId) {
      return
    }
    this.publishSourceTrack(this.sourceProcessedSubtitles)
  }

  seekTo = (seconds: number) => {
    const video = this.subtitlesScheduler?.getVideoElement()
    if (video) {
      video.currentTime = seconds
    }
  }

  downloadSourceSubtitles = async () => {
    await this.getOrLoadSourceSubtitles()

    await downloadSubtitlesAsSrt({
      subtitles: this.sourceProcessedSubtitles,
      pageTitle: document.title || "",
      videoId: this.config.getVideoId?.(),
    })
  }

  downloadTranslatedSubtitles = async () => {
    this.initializeTranslatedSubtitlesDownloader()
    await this.translatedSubtitlesDownloader!.download()
  }

  private initializeTranslatedSubtitlesDownloader() {
    this.translatedSubtitlesDownloader ??= new TranslatedSubtitlesDownloader(
      () => this.fetcher,
      this.config,
    )
  }

  private async restorePosition() {
    const config = await getLocalConfig()
    const position = config?.videoSubtitles?.position
    if (position) {
      subtitlesStore.set(subtitlesPositionAtom, { ...position })
    }
  }

  private publishVideoId() {
    this.navigationVideoId = this.config.getVideoId?.() ?? null
    subtitlesStore.set(currentVideoIdAtom, this.navigationVideoId)
  }

  private prepareSummaryForNavigation() {
    subtitlesStore.set(currentVideoIdAtom, null)
    this.cancelVideoSummary()
  }

  private cancelVideoSummary() {
    this.summaryAbortController?.abort()
    this.summaryAbortController = null
    subtitlesStore.set(videoSummaryPartialAtom, "")
  }

  private resetForNavigation() {
    this.switchOperationId++
    this.prepareSummaryForNavigation()
    // Keyed by video id already; this only stops them accumulating.
    queryClient.removeQueries({ queryKey: VIDEO_SUMMARY_QUERY_SCOPE })
    this.clearNavigationReinitTimeout()
    this.teardownAdObserver()
    this.destroyScheduler()
    this.clearRuntimeSession()
    this.clearSourceCache()
    this.fetcher.cleanup()
    // A pending old fetch may still mutate its own cache after cleanup.
    this.source = SUBTITLES_SOURCE.NATIVE
    this.fetcher = this.fetchers.native()
    subtitlesStore.set(subtitlesSourceAtom, SUBTITLES_SOURCE.NATIVE)
    subtitlesStore.set(subtitlesSettingsPanelOpenAtom, false)
    subtitlesStore.set(subtitlesSettingsPanelViewAtom, ROOT_VIEW)
    this.showNativeSubtitles()
    void this.restorePosition()
    // Keep the sidebar open, but publish the next query only after old state is cleared.
    this.publishVideoId()
  }

  private destroyScheduler() {
    this.subtitlesScheduler?.reset()
    this.subtitlesScheduler?.stop()
    this.subtitlesScheduler = null
  }

  private async initializeScheduler() {
    const video = (await waitForElement(
      this.config.selectors.video,
      (el) => !!el.closest(this.config.selectors.playerContainer),
    )) as HTMLVideoElement | null

    if (!video) {
      toastManager.add({ type: "error", title: i18n.t("subtitles.errors.videoNotFound") })
      return
    }

    this.subtitlesScheduler = new SubtitlesScheduler({ videoElement: video })
    this.subtitlesScheduler.start()
    this.subtitlesScheduler.hide()
  }

  private async getOrLoadSourceSubtitles(signal?: AbortSignal): Promise<SubtitlesFragment[]> {
    const currentVideoId = this.config.getVideoId?.() ?? null
    const fetcher = this.fetcher
    const cacheVersion = this.sourceCacheVersion
    const assertCurrent = () => {
      signal?.throwIfAborted()
      if (
        cacheVersion !== this.sourceCacheVersion ||
        fetcher !== this.fetcher ||
        currentVideoId !== (this.config.getVideoId?.() ?? null)
      ) {
        throw new DOMException("Subtitle load superseded", "AbortError")
      }
    }
    assertCurrent()
    const useSameTrack = await fetcher.shouldUseSameTrack()
    assertCurrent()

    if (useSameTrack && this.sourceVideoId === currentVideoId && this.sourceSubtitles.length > 0) {
      return this.sourceSubtitles
    }

    const hasSubtitles = await fetcher.hasAvailableSubtitles()
    assertCurrent()
    if (!hasSubtitles) {
      throw new OverlaySubtitlesError(i18n.t("subtitles.errors.noSubtitlesFound"))
    }

    const subtitles = await fetcher.fetch()
    assertCurrent()
    if (subtitles.length === 0) {
      throw new OverlaySubtitlesError(i18n.t("subtitles.errors.noSubtitlesFound"))
    }

    this.sourceVideoId = currentVideoId
    this.sourceSubtitles = subtitles
    this.sourceProcessedSubtitles = this.buildSourceProcessedSubtitles(subtitles)

    return subtitles
  }

  private buildSourceProcessedSubtitles(rawSubtitles: SubtitlesFragment[]): SubtitlesFragment[] {
    if (this.fetcher.isPreSegmented?.()) return rawSubtitles
    const sourceLanguage = this.fetcher.getSourceLanguage()
    return optimizeSubtitles(rawSubtitles, sourceLanguage)
  }

  private clearSourceProcessedSubtitles() {
    this.sourceProcessedSubtitles = []
  }

  private clearSourceCache() {
    this.sourceCacheVersion++
    this.sourceSubtitles = []
    this.clearSourceProcessedSubtitles()
    this.sourceVideoId = null
  }

  private clearRuntimeSession() {
    this.translationCoordinator?.stop()
    this.segmentationPipeline?.stop()
    this.translationCoordinator = null
    this.segmentationPipeline = null
    this.sessionSubtitles = []
    this.sessionProcessedFragments = []
    this.sessionVideoId = null
    this.subtitlesSummaryContextHash = null
    subtitlesStore.set(sourceTrackAtom, [])
  }

  private clearVisibleStateForNavigation() {
    this.prepareSummaryForNavigation()
    this.clearNavigationReinitTimeout()
    this.teardownAdObserver()
    this.translatedSubtitlesDownloader?.dispose()
    this.destroyScheduler()
    this.translationCoordinator?.stop()
    this.segmentationPipeline?.stop()
    subtitlesStore.set(subtitlesSettingsPanelOpenAtom, false)
    subtitlesStore.set(subtitlesSettingsPanelViewAtom, ROOT_VIEW)
    this.showNativeSubtitles()
  }

  private clearNavigationReinitTimeout() {
    if (this.navigationReinitTimeoutId !== null) {
      clearTimeout(this.navigationReinitTimeoutId)
      this.navigationReinitTimeoutId = null
    }
  }

  private setupNavigationListeners() {
    const { events } = this.config

    if (events.navigateStart) {
      window.addEventListener(events.navigateStart, this.handleNavigationStart)
    }

    if (events.navigateFinish) {
      window.addEventListener(events.navigateFinish, this.handleNavigationFinish)
    }
  }

  private handleNavigationStart = () => {
    if (!this.videoIdChanged) {
      return
    }

    this.hasPendingNavigationReset = true
    this.clearVisibleStateForNavigation()
  }

  private handleNavigationFinish = () => {
    if (!this.hasPendingNavigationReset) {
      return
    }

    this.clearNavigationReinitTimeout()
    this.navigationReinitTimeoutId = setTimeout(() => {
      this.navigationReinitTimeoutId = null
      void this.handleNavigation()
    }, NAVIGATION_HANDLER_DELAY)
  }

  notifyNavigation() {
    this.hasPendingNavigationReset = true
    this.clearVisibleStateForNavigation()

    this.clearNavigationReinitTimeout()
    this.navigationReinitTimeoutId = setTimeout(() => {
      this.navigationReinitTimeoutId = null
      void this.handleNavigation()
    }, NAVIGATION_HANDLER_DELAY)
  }

  private async handleNavigation() {
    // A -> B -> A still needs to restore the state torn down at navigation start.
    if (!this.hasPendingNavigationReset) {
      return
    }

    this.hasPendingNavigationReset = false
    this.resetForNavigation()
    void this.renderTranslateButton()

    await this.initializeScheduler()
    this.setupAdObserver()
    await this.tryAutoStartSubtitles()
  }

  private setupAdObserver() {
    if (!this.config.isAdPlaying) {
      return
    }

    this.teardownAdObserver()

    const player = document.querySelector<HTMLElement>(this.config.selectors.playerContainer)
    if (!player) {
      subtitlesStore.set(adPlayingAtom, false)
      return
    }

    this.observedAdPlayer = player
    this.syncAdPlayingState()

    this.adObserver = new MutationObserver(() => {
      this.syncAdPlayingState()
    })
    this.adObserver.observe(player, { attributes: true, attributeFilter: ["class"] })
  }

  private teardownAdObserver() {
    this.adObserver?.disconnect()
    this.adObserver = null
    this.observedAdPlayer = null
    subtitlesStore.set(adPlayingAtom, false)
  }

  private syncAdPlayingState() {
    const isAdPlaying = this.config.isAdPlaying
    if (!isAdPlaying) {
      return
    }

    const player =
      this.observedAdPlayer ??
      document.querySelector<HTMLElement>(this.config.selectors.playerContainer)

    const playing = !!player && isAdPlaying(player)
    const wasPlaying = subtitlesStore.get(adPlayingAtom)
    if (playing === wasPlaying) {
      return
    }

    subtitlesStore.set(adPlayingAtom, playing)

    // Resync content time when the ad ends so the next cue is correct immediately.
    if (!playing) {
      this.subtitlesScheduler?.resyncFromVideo()
      this.translationCoordinator?.requestTick()
    }
  }

  private async renderTranslateButton() {
    const controlsBar = this.config.selectors.controlsBar
    if (!controlsBar) {
      return
    }

    const container = await waitForElement(controlsBar)
    if (!container) {
      if (!this.config.embedded) {
        toastManager.add({
          type: "error",
          title: i18n.t("subtitles.errors.controlsBarNotFound"),
        })
      }
      return
    }

    const existingButton = container.querySelector(`#${TRANSLATE_BUTTON_CONTAINER_ID}`)
    existingButton?.remove()

    const toggleButton = renderSubtitlesTranslateButton({ adapter: this })

    if (this.config.embedded) {
      container.appendChild(toggleButton)
    } else {
      container.insertBefore(toggleButton, container.firstChild)
    }
  }

  private async tryAutoStartSubtitles() {
    const config = await getLocalConfig()
    const autoStart = config?.videoSubtitles?.autoStart ?? false

    const learningOpen = subtitlesStore.get(subtitlesSidebarOpenAtom)

    if (!autoStart && !learningOpen) return

    if (this.config.embedded) {
      const video = this.subtitlesScheduler?.getVideoElement()
      if (!video) return

      const start = () => {
        video.removeEventListener("playing", start)
        this.toggleSubtitlesWithSource(true)
      }

      if (!video.paused) {
        this.toggleSubtitlesWithSource(true)
      } else {
        video.addEventListener("playing", start)
      }
      return
    }

    this.toggleSubtitlesWithSource(true)
  }

  private toggleSubtitlesWithSource(enabled: boolean) { this.handleToggleSubtitles(enabled) }

  private handleToggleSubtitles(enabled: boolean, ) {
    if (enabled) {
      void this.switchSubtitlesFetcher(SUBTITLES_SOURCE.NATIVE, )
    } else {
      this.subtitlesScheduler?.hide()
      this.showNativeSubtitles()
      this.translationCoordinator?.stop()
    }
  }

  

  private async switchSubtitlesFetcher(
    next: SubtitlesSource,
    
  ): Promise<void> {
    const make = this.fetchers[next]
    if (!make) {
      return
    }

    const operationId = ++this.switchOperationId

    if (next !== this.source) {
      this.fetcher.cleanup()
      this.source = next
      subtitlesStore.set(subtitlesSourceAtom, next)
      this.fetcher = make()
      this.clearSourceCache()
      this.clearRuntimeSession()
    }

    this.subtitlesScheduler?.start()
    this.subtitlesScheduler?.show()
    this.hideNativeSubtitles()

    const message = LOADING_MESSAGE[next]
    if (message) {
      this.subtitlesScheduler?.setState("loading", { message })
    }

    const succeeded = await this.startTranslation()
    if (operationId !== this.switchOperationId) {
      return
    }
    if (!succeeded && next !== SUBTITLES_SOURCE.NATIVE) {
      this.revertToNativeSource()
    }
  }

  private revertToNativeSource() {
    this.fetcher.cleanup()
    this.source = SUBTITLES_SOURCE.NATIVE
    this.fetcher = this.fetchers.native()
    subtitlesStore.set(subtitlesSourceAtom, SUBTITLES_SOURCE.NATIVE)
    this.clearSourceCache()
    this.clearRuntimeSession()
    this.showNativeSubtitles()
  }

  private async refreshSourceTrackIfNeeded(): Promise<void> {
    const scheduler = this.subtitlesScheduler
    const isSchedulerActive = !!scheduler?.isActive()

    const isTranscriptInUse =
      subtitlesStore.get(sourceTrackAtom).length > 0 || this.pendingTranscriptLoads > 0
    if (!isSchedulerActive && !isTranscriptInUse) {
      return
    }

    const useSameTrack = await this.fetcher.shouldUseSameTrack()
    if (useSameTrack) {
      return
    }

    if (!scheduler || !isSchedulerActive) {
      const operationId = ++this.switchOperationId
      this.clearRuntimeSession()
      this.clearSourceCache()
      this.fetcher.cleanup()
      scheduler?.reset()
      subtitlesStore.set(translatedTrackAtom, [])
      await this.getOrLoadSourceSubtitles()
      if (operationId !== this.switchOperationId) {
        return
      }
      this.publishSourceTrack(this.sourceProcessedSubtitles)
      return
    }

    this.clearRuntimeSession()
    this.clearSourceCache()
    this.fetcher.cleanup()
    scheduler.reset()
    scheduler.setState("loading")

    await this.startTranslation()
  }

  private showNativeSubtitles() {
    if (!this.isNativeSubtitlesHidden) {
      return
    }

    const style = document.getElementById(HIDE_NATIVE_CAPTIONS_STYLE_ID)
    style?.remove()
    this.isNativeSubtitlesHidden = false
  }

  private hideNativeSubtitles() {
    if (this.isNativeSubtitlesHidden) {
      return
    }

    if (document.getElementById(HIDE_NATIVE_CAPTIONS_STYLE_ID)) {
      this.isNativeSubtitlesHidden = true
      return
    }

    const style = document.createElement("style")
    style.id = HIDE_NATIVE_CAPTIONS_STYLE_ID
    style.textContent = `
      ${this.config.selectors.nativeSubtitles},
      ${this.config.selectors.nativeSubtitles} * {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `
    document.head.appendChild(style)
    this.isNativeSubtitlesHidden = true
  }

  private async startTranslation() {
    

    try {
      
      
      
      const currentVideoId = this.config.getVideoId?.() ?? ""
      const hasCurrentSession =
        this.sessionProcessedFragments.length > 0 && this.sessionVideoId === currentVideoId
      this.sessionVideoId = currentVideoId

      const useSameTrack = await this.fetcher.shouldUseSameTrack()

      if (useSameTrack && hasCurrentSession) {
        // Translated sessions create a coordinator; passthrough sessions only cache rendered fragments.
        if (this.translationCoordinator) {
          // Clear failed states to allow retry on resume
          this.translationCoordinator.clearFailed()
          this.segmentationPipeline?.clearFailedStarts()
          this.translationCoordinator.start()
        } else {
          this.subtitlesScheduler?.supplementSubtitles(this.sessionProcessedFragments)
          this.subtitlesScheduler?.setState("idle")
        }
        
        return true
      }

      this.clearRuntimeSession()
      this.sessionVideoId = currentVideoId
      this.subtitlesScheduler?.reset()

      this.subtitlesScheduler?.setState("loading", { message: LOADING_MESSAGE[this.source] })

      await this.getOrLoadSourceSubtitles()
      this.sessionSubtitles = this.sourceSubtitles

      if (await this.shouldSkipTranslationForCurrentTrack()) {
        this.processPassthroughSubtitles()
      } else {
        await this.processTranslatedSubtitles()
      }
      
      return true
    } catch (error) {
      

      // A deliberate teardown — a superseded switch or a navigation — not a
      // failure the user should read about. Its message is the literal string
      // "Aborted", which would otherwise be painted onto the player untranslated.
      if (error instanceof DOMException && error.name === "AbortError") {
        return false
      }

      const errorMessage = error instanceof Error ? error.message : String(error)

      if (error instanceof ToastSubtitlesError) {
        // The loading state has no auto-hide of its own (unlike "error"), so
        // the toast branch has to clear it — otherwise the "Loading AI
        // subtitles" pill stays on the player forever after a wall.
        this.subtitlesScheduler?.setState("idle")
        // Only the AI request has a control on screen to point at; the source
        // is still AI here because reverting to native happens after this.
        {
          showSubtitlesErrorToast(errorMessage, error.action)
        }
      } else {
        this.subtitlesScheduler?.setState("error", {
          message: this.config.silentErrors ? "" : errorMessage,
        })
      }
      return false
    }
  }

  private async shouldSkipTranslationForCurrentTrack(): Promise<boolean> {
    const config = await getLocalConfig()
    const targetLanguage = config?.language.targetCode
    const sourceLanguage = resolveLanguageCodeFromLocale(this.fetcher.getSourceLanguage())

    if (!targetLanguage || !sourceLanguage) {
      return false
    }

    return sourceLanguage === targetLanguage
  }

  private processPassthroughSubtitles() {
    this.sessionProcessedFragments = this.sourceProcessedSubtitles.map((fragment) => ({
      ...fragment,
      translation: fragment.text,
    }))
    this.publishSourceTrack(this.sourceProcessedSubtitles)
    this.subtitlesScheduler?.supplementSubtitles(this.sessionProcessedFragments)
    this.subtitlesScheduler?.setState("idle")
  }

  private publishSourceTrack(fragments: SubtitlesFragment[]) {
    // timeupdate may not have fired yet (paused / enable mid-video); keep display time fresh.
    const video = this.subtitlesScheduler?.getVideoElement()
    if (video) {
      subtitlesStore.set(currentTimeMsAtom, video.currentTime * 1000)
    }
    subtitlesStore.set(sourceTrackAtom, [...fragments])
  }

  private replaceSourceTrackWindow(
    windowStartMs: number,
    windowEndMs: number,
    nextFragments: SubtitlesFragment[],
  ) {
    const previous = subtitlesStore.get(sourceTrackAtom)
    // Drop any cue that overlaps the window (not just cues whose start falls inside it).
    // Half-open: keep if end <= windowStart || start >= windowEnd.
    const kept = previous.filter(
      (fragment) => fragment.end <= windowStartMs || fragment.start >= windowEndMs,
    )
    const next = [...kept, ...nextFragments].sort((a, b) => a.start - b.start)
    this.publishSourceTrack(next)
  }

  private async processTranslatedSubtitles() {
    const scheduler = this.subtitlesScheduler
    if (!scheduler) return

    const config = await getLocalConfig()

    const useAiSegmentation = !!config?.videoSubtitles?.aiSegmentation

    this.sessionProcessedFragments = [...this.sourceProcessedSubtitles]

    
    this.publishSourceTrack(this.sessionProcessedFragments)

    
    const providerRef = config ? await resolveSubtitlesProviderRef(config, "lineTranslation") : null
    const promptableProviderRef =
      providerRef && canProviderRefGenerateText(providerRef) ? providerRef : null

    const videoContext: SubtitlesVideoContext = {
      videoTitle: document.title || "",
      videoDescription: getDocumentDescription(document),
      subtitlesTextContent: this.sessionSubtitles.map((f) => f.text).join(""),
    }

    if (useAiSegmentation) {
      this.segmentationPipeline = new SegmentationPipeline({
        baselineFragments: this.sourceProcessedSubtitles,
        rawFragments: this.sessionSubtitles,
        getVideoElement: () => this.subtitlesScheduler?.getVideoElement() ?? null,
        getSourceLanguage: () => this.fetcher.getSourceLanguage(),
        
        providerRef: promptableProviderRef,
        preSegmented: this.fetcher.isPreSegmented?.(),
        onChunkSegmented: (chunk, nextFragments) => {
          if (chunk.length === 0 || !chunk[0]) return
          const chunkStart = chunk[0].start
          const chunkEnd = chunk.at(-1)!.end
          this.replaceSourceTrackWindow(chunkStart, chunkEnd, nextFragments)
          // Drop identity-changed/spanning translations; keep translations for unchanged cues
          // so preSegmented (and partial AI recuts) do not wipe work then skip re-translate.
          scheduler.reconcileTranslatedCuesAfterRecut(chunkStart, chunkEnd, nextFragments)
          this.translationCoordinator?.noteFragmentListChanged()
        },
      })
    }

    this.translationCoordinator = new TranslationCoordinator({
      getFragments: () =>
        this.segmentationPipeline
          ? this.segmentationPipeline.processedFragments
          : this.sessionProcessedFragments,
      getVideoElement: () => scheduler.getVideoElement(),
      getCurrentState: () => scheduler.getState(),
      segmentationPipeline: this.segmentationPipeline,
      onTranslated: (fragments) => scheduler.supplementSubtitles(fragments),
      onStateChange: (state, data) => scheduler.setState(state, data),
    })
    this.translationCoordinator.start(videoContext)
    // The hash and the summary must share one ref — the promptable one — or
    // the cache identity and the ref that rides the message could diverge.
    const summaryContextHash = buildSubtitlesSummaryContextHash(
      videoContext,
      promptableProviderRef ?? undefined,
    )
    this.subtitlesSummaryContextHash = summaryContextHash ?? null

    void fetchSubtitlesSummary(videoContext, config ?? undefined, promptableProviderRef).then(
      (summary) => {
        if (!summaryContextHash) {
          return
        }

        if (this.subtitlesSummaryContextHash !== summaryContextHash) {
          return
        }

        videoContext.summary = summary
      },
    )
  }
}
