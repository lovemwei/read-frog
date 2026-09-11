import { describe, expect, it } from "vitest"
import { createConfiguredTestConfig } from "@/utils/host/__tests__/utils"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { getSelectableProvidersForCapability } from "@/utils/providers/provider-registry"
import { computeLanguageDetectionFallbackAfterDeletion, computeProviderFallbacksAfterDeletion, computeSelectionToolbarCustomActionFallbacksAfterDeletion, resolveLanguageDetectionConfigForModeChange } from "../helpers"

describe("feature providers", () => {
  it("builds patches for multiple feature assignments", () => {
    expect(buildFeatureProviderPatch({ pageTranslation: "custom", selectionTranslation: "custom" })).toEqual({ pageTranslation: { providerId: "custom" }, selectionToolbar: { features: { translate: { providerId: "custom" } } } })
  })
  it("has no selectable providers until the user configures one", () => {
    expect(getSelectableProvidersForCapability("customAction", [])).toEqual([])
  })
  it("returns only enabled custom providers with the required capability", () => {
    const config = createConfiguredTestConfig()
    const providers = [...config.providersConfig, { ...DEFAULT_PROVIDER_CONFIG.google, enabled: false }, DEFAULT_PROVIDER_CONFIG["google-translate"]]
    expect(getSelectableProvidersForCapability("customAction", providers).map(provider => provider.id)).toEqual(["openai-default", "deepseek-default"])
  })
  it("reassigns affected features to an enabled remaining provider", () => {
    const config = createConfiguredTestConfig()
    expect(computeProviderFallbacksAfterDeletion("openai-default", config, [DEFAULT_PROVIDER_CONFIG.deepseek])).toEqual({ pageTranslation: "deepseek-default", videoSubtitles: "deepseek-default", selectionTranslation: "deepseek-default", inputTranslation: "deepseek-default" })
  })
  it("leaves features unconfigured when the last provider is deleted", () => {
    expect(computeProviderFallbacksAfterDeletion("openai-default", createConfiguredTestConfig(), [])).toEqual({ pageTranslation: "", videoSubtitles: "", selectionTranslation: "", inputTranslation: "" })
  })
  it("reassigns Dictionary without changing custom actions", () => {
    const config = createConfiguredTestConfig()
    const result = computeSelectionToolbarCustomActionFallbacksAfterDeletion("openai-default", config, [DEFAULT_PROVIDER_CONFIG.deepseek])
    expect(result?.builtInActions.dictionary.providerId).toBe("deepseek-default")
    expect(result?.customActions).toEqual(config.selectionToolbar.customActions)
  })
  it("leaves actions unconfigured without a remaining LLM provider", () => {
    const result = computeSelectionToolbarCustomActionFallbacksAfterDeletion("openai-default", createConfiguredTestConfig(), [])
    expect(result?.builtInActions.dictionary.providerId).toBe("")
  })
  it("requires an explicitly configured provider for LLM language detection", () => {
    expect(resolveLanguageDetectionConfigForModeChange({ mode: "basic" }, "llm", [])).toBeNull()
    expect(resolveLanguageDetectionConfigForModeChange({ mode: "basic" }, "llm", [DEFAULT_PROVIDER_CONFIG.deepseek])).toEqual({ mode: "llm", providerId: "deepseek-default" })
  })
  it("preserves the selected language detection provider when it is enabled", () => {
    expect(resolveLanguageDetectionConfigForModeChange({ mode: "llm", providerId: "deepseek-default" }, "llm", [DEFAULT_PROVIDER_CONFIG.openai, DEFAULT_PROVIDER_CONFIG.deepseek])).toEqual({ mode: "llm", providerId: "deepseek-default" })
  })
  it("has no language detection fallback after the last LLM is deleted", () => {
    const config = createConfiguredTestConfig()
    config.languageDetection = { mode: "llm", providerId: "openai-default" }
    expect(computeLanguageDetectionFallbackAfterDeletion("openai-default", config, [])).toBeUndefined()
  })
})
