import "@/utils/zod-config"
import type { Config, UiLanguage } from "@/types/config/config"
import { browser, defineBackground } from "#imports"
import { storageAdapter } from "@/utils/atoms/storage-adapter"
import { CONFIG_STORAGE_KEY } from "@/utils/constants/config"
import { initI18n, setUiLanguage } from "@/utils/i18n"
import { logger } from "@/utils/logger"
import { onMessage } from "@/utils/message"
import { openOptionsPage } from "@/utils/navigation"
import { runAiSegmentSubtitles } from "./ai-segmentation"
import { dispatchBackgroundStreamPort } from "./background-stream"
import { initializeActionIcons, registerActionIconListeners } from "./browser-action-icon"
import { ensureInitializedConfig } from "./config"
import { setUpConfigBackup } from "./config-backup"
import { initializeContextMenu, registerContextMenuListeners } from "./context-menu"
import {
  cleanupAllAiSegmentationCache,
  cleanupAllSummaryCache,
  cleanupAllTranslationCache,
  setUpDatabaseCleanup,
} from "./db-cleanup"

import { setupIframeInjection } from "./iframe-injection"
import { setupLLMGenerateTextMessageHandlers } from "./llm-generate-text"
import { initMockData } from "./mock-data"
import { setupPageTranslationHandlers } from "./page-translation"

import { setupSidePanelMessageHandler } from "./side-panel"
import { setupSubtitlesTranslationHandlers } from "./subtitles-translation"
import { translationMessage } from "./translation-signal"

import { setupVideoSummaryHandlers } from "./video-summary"

export default defineBackground({
  type: "module",
  main: () => {
    logger.info("Hello background!", { id: browser.runtime.id })

    browser.runtime.onInstalled.addListener(async (details) => {
      await ensureInitializedConfig()
      await removeLegacyServiceState()

      if (details.reason === "install") {
        await openOptionsPage({ route: "/api-providers" })
      }
    })

    void browser.runtime.setUninstallURL("")

    onMessage("openPage", async (message) => {
      const { url, active } = message.data
      logger.info("openPage", { url, active })
      await browser.tabs.create({ url, active: active ?? true })
    })

    onMessage("openOptionsPage", async (message) => {
      logger.info("openOptionsPage", message.data)
      await openOptionsPage(message.data)
    })

    setupSidePanelMessageHandler({
      extensionBrowser: browser,
      logger,
      registerMessageHandler: onMessage,
    })

    onMessage("aiSegmentSubtitles", async (message) => {
      try {
        return await runAiSegmentSubtitles(message.data)
      } catch (error) {
        logger.error("[Background] aiSegmentSubtitles failed", error)
        throw error
      }
    })

    browser.runtime.onConnect.addListener((port) => {
      dispatchBackgroundStreamPort(port)
    })

    onMessage("clearAllTranslationRelatedCache", async () => {
      await cleanupAllTranslationCache()
      await cleanupAllSummaryCache()
    })

    onMessage("clearAiSegmentationCache", async () => {
      await cleanupAllAiSegmentationCache()
    })

    translationMessage()
    registerActionIconListeners()

    // Register context menu listeners synchronously
    // This ensures listeners are registered before Chrome completes initialization
    registerContextMenuListeners()

    // Initialize action icons asynchronously
    void initializeActionIcons()

    // Synchronous: all translation and summary handlers register in the first turn of
    // the SW so wake-triggering messages are never dropped during init.
    setupPageTranslationHandlers()
    setupSubtitlesTranslationHandlers()
    setupVideoSummaryHandlers()
    void setUpDatabaseCleanup()
    setUpConfigBackup()

    // Start config and i18n initialization without delaying synchronous listener
    // registration. Consumers that materialize localized config-derived data await
    // this shared barrier before reading it.
    let currentUiLanguage: UiLanguage | undefined
    const backgroundReady = (async () => {
      const config = await ensureInitializedConfig()
      currentUiLanguage = config?.uiLanguage ?? "auto"
      await initI18n(currentUiLanguage)
    })()

    setupLLMGenerateTextMessageHandlers()
    void initMockData()

    // Setup on-demand iframe injection after page translation is enabled.
    setupIframeInjection()

    void (async () => {
      await backgroundReady
      void initializeContextMenu()
    })()

    // Keep background-resolved strings in the selected language when it changes.
    // The context menu re-creates itself via its own config watcher
    // (registerContextMenuListeners), so here we only drive the i18next singleton.
    storageAdapter.watch<Config>(CONFIG_STORAGE_KEY, (newConfig) => {
      void (async () => {
        await backgroundReady
        if (newConfig.uiLanguage === currentUiLanguage) return
        currentUiLanguage = newConfig.uiLanguage
        await setUiLanguage(newConfig.uiLanguage)
      })()
    })
  },
})

async function removeLegacyServiceState() {
  const localState = await browser.storage.local.get(null)
  const localKeys = Object.keys(localState).filter(
    (key) => key.startsWith("__googleDriveToken") || key.startsWith("analytics"),
  )
  if (localKeys.length > 0) await browser.storage.local.remove(localKeys)

  const sessionState = await browser.storage.session.get(null)
  const sessionKeys = Object.keys(sessionState).filter(
    (key) =>
      key.startsWith("cache_auth_") ||
      key.startsWith("proxyFetchAuthCookieLastSeen") ||
      key.startsWith("hostedAiStatus"),
  )
  if (sessionKeys.length > 0) await browser.storage.session.remove(sessionKeys)
}
