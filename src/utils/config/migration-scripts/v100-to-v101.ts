export function migrate(oldConfig: any): any {
  const config = structuredClone(oldConfig)
  if (!config || typeof config !== "object") return config

  if (Array.isArray(config.providersConfig)) {
    config.providersConfig = config.providersConfig.filter(
      (provider: any) =>
        provider.provider !== "google-translate" && provider.provider !== "microsoft-translate",
    )
  }

  const enabledIds = new Set(
    (config.providersConfig ?? [])
      .filter((provider: any) => provider.enabled)
      .map((provider: any) => provider.id),
  )
  const clearRemovedProvider = (feature: any) => {
    if (feature && !enabledIds.has(feature.providerId)) feature.providerId = ""
  }

  clearRemovedProvider(config.pageTranslation)
  clearRemovedProvider(config.videoSubtitles)
  clearRemovedProvider(config.inputTranslation)
  clearRemovedProvider(config.selectionToolbar?.features?.translate)
  clearRemovedProvider(config.selectionToolbar?.builtInActions?.dictionary)

  if (config.languageDetection && !enabledIds.has(config.languageDetection.providerId)) {
    config.languageDetection = { mode: "basic" }
  }

  if (config.selectionToolbar) {
    delete config.selectionToolbar.noteSuggestion
    if (config.selectionToolbar.features) delete config.selectionToolbar.features.speak
    const dictionary = config.selectionToolbar.builtInActions?.dictionary
    if (dictionary) delete dictionary.notebaseConnection
    for (const action of config.selectionToolbar.customActions ?? []) {
      clearRemovedProvider(action)
      delete action.notebaseConnection
      for (const field of action.outputSchema ?? []) delete field.speaking
    }
  }

  delete config.tts

  return config
}
