import { afterEach, describe, expect, it, vi } from "vitest"

describe("dEFAULT_CONFIG", () => {
  const originalCrypto = globalThis.crypto

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    })
    vi.resetModules()
  })

  it("initializes when crypto.randomUUID is unavailable but crypto.getRandomValues exists", async () => {
    const getRandomValues = vi.fn<(...args: any[]) => any>((array: Uint8Array<ArrayBuffer>) =>
      originalCrypto.getRandomValues(array),
    )

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues,
      },
    })
    vi.resetModules()

    const { createDefaultDictionaryAction, DEFAULT_CONFIG } = await import("../config")
    const defaultDictionaryAction = createDefaultDictionaryAction()

    expect(defaultDictionaryAction).toEqual(
      expect.objectContaining({
        id: "default-dictionary",
      }),
    )
    expect(defaultDictionaryAction?.outputSchema).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "default-dictionary-term" })]),
    )
    expect(
      defaultDictionaryAction?.outputSchema.every(
        (field) => typeof field.id === "string" && field.id.length > 0,
      ),
    ).toBe(true)
    expect(DEFAULT_CONFIG.selectionToolbar.customActions).toEqual([])
  })

  it("starts with basic online translation and no automatic translation sites", async () => {
      const { DEFAULT_CONFIG } = await import("../config")
      const { configSchema } = await import("@/types/config/config")
      expect(configSchema.safeParse(DEFAULT_CONFIG).success).toBe(true)
      expect(DEFAULT_CONFIG.providersConfig.map(provider => provider.provider)).toEqual(["google-translate", "microsoft-translate"])
      expect(DEFAULT_CONFIG.pageTranslation.providerId).toBe("microsoft-translate-default")
      expect(DEFAULT_CONFIG.selectionToolbar.features.translate.providerId).toBe("microsoft-translate-default")
      expect(DEFAULT_CONFIG.inputTranslation.providerId).toBe("microsoft-translate-default")
      expect(DEFAULT_CONFIG.videoSubtitles.providerId).toBe("microsoft-translate-default")
      expect(DEFAULT_CONFIG.pageTranslation.page.autoTranslatePatterns).toEqual([])
      expect(DEFAULT_CONFIG).not.toHaveProperty("tts")
    })

  it("defaults fresh hover translation off", async () => {
    const { DEFAULT_CONFIG } = await import("../config")

    expect(DEFAULT_CONFIG.pageTranslation.node.forceRetranslation).toBe(false)
  })

  it("keeps pre-v090 config parseable until the background migration runs", async () => {
    const { DEFAULT_CONFIG } = await import("../config")
    const { configSchema } = await import("@/types/config/config")
    const legacyConfig = structuredClone(DEFAULT_CONFIG)
    const legacyNode = legacyConfig.pageTranslation.node as Partial<
      typeof legacyConfig.pageTranslation.node
    >

    delete legacyNode.forceRetranslation
    legacyConfig.language.targetCode = "jpn"

    const result = configSchema.safeParse(legacyConfig)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.pageTranslation.node.forceRetranslation).toBe(false)
    expect(result.data.language.targetCode).toBe("jpn")
  })

  it("rebuilds schema-valid built-in action state for persistence", async () => {
    const { buildFreshDefaultConfig, createDefaultDictionaryAction, DEFAULT_CONFIG } =
      await import("../config")
    const { configSchema } = await import("@/types/config/config")

    const config = buildFreshDefaultConfig()

    expect(config).not.toBe(DEFAULT_CONFIG)
    expect(config.selectionToolbar.customActions).not.toBe(
      DEFAULT_CONFIG.selectionToolbar.customActions,
    )
    expect(config.selectionToolbar.builtInActions.dictionary).toEqual({
      enabled: true,
      providerId: "",
    })
    expect(config.selectionToolbar.customActions).toEqual([])
    expect(createDefaultDictionaryAction()).toEqual(
      expect.objectContaining({
        id: "default-dictionary",
        name: expect.any(String),
        systemPrompt: expect.any(String),
        prompt: expect.any(String),
      }),
    )
    expect(configSchema.safeParse(config).success).toBe(true)
  })
})
