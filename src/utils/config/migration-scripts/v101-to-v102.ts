export function migrate(oldConfig: any): any {
  const config = structuredClone(oldConfig)
  if (!config || typeof config !== "object" || !Array.isArray(config.providersConfig)) return config

  for (const [provider, name] of [
    ["google-translate", "Google Translate"],
    ["microsoft-translate", "Microsoft Translate"],
  ]) {
    if (config.providersConfig.some((item: any) => item.provider === provider)) continue
    let id = `${provider}-default`
    let nextName = name
    let suffix = 2
    while (config.providersConfig.some((item: any) => item.id === id))
      id = `${provider}-default-${suffix++}`
    suffix = 2
    while (config.providersConfig.some((item: any) => item.name === nextName))
      nextName = `${name} ${suffix++}`
    config.providersConfig.push({ id, name: nextName, enabled: true, provider })
  }

  const enabledProviders = config.providersConfig.filter((item: any) => item.enabled)
  const defaultProvider =
    enabledProviders.find((item: any) => item.provider === "microsoft-translate") ??
    enabledProviders.find((item: any) => item.provider === "google-translate") ??
    enabledProviders[0]

  for (const feature of [
    config.pageTranslation,
    config.videoSubtitles,
    config.inputTranslation,
    config.selectionToolbar?.features?.translate,
  ]) {
    if (!feature || enabledProviders.some((item: any) => item.id === feature.providerId)) continue
    const provider =
      feature === config.pageTranslation && feature.mode === "translationOnly"
        ? (enabledProviders.find((item: any) => item.provider === "google-translate") ??
          defaultProvider)
        : defaultProvider
    feature.providerId = provider?.id ?? ""
  }

  return config
}
