import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildDeepLXUrl, deeplxTranslate } from "../deeplx"

const fetchMock = vi.fn<(...args: any[]) => any>()

describe("buildDeepLXUrl", () => {
  describe("token placeholder functionality", () => {
    it("replaces {{apiKey}} with API key in path", () => {
      const result = buildDeepLXUrl("https://api.deeplx.com/{{apiKey}}/translate", "abc123")
      expect(result).toBe("https://api.deeplx.com/abc123/translate")
    })

    it("replaces {{apiKey}} with API key as query parameter", () => {
      const result = buildDeepLXUrl("https://api.deeplx.com/v1/translate?token={{apiKey}}", "mykey")
      expect(result).toBe("https://api.deeplx.com/v1/translate?token=mykey")
    })

    it("replaces multiple {{apiKey}} occurrences", () => {
      const result = buildDeepLXUrl(
        "https://{{apiKey}}.api.deeplx.com/{{apiKey}}/translate",
        "test",
      )
      expect(result).toBe("https://test.api.deeplx.com/test/translate")
    })

    it("trims API key only when replacing placeholders", () => {
      const result = buildDeepLXUrl("https://api.deeplx.com/{{apiKey}}/translate", "  abc123  ")
      expect(result).toBe("https://api.deeplx.com/abc123/translate")
    })

    it("throws error when {{apiKey}} is used without API key", () => {
      expect(() => buildDeepLXUrl("https://api.deeplx.com/{{apiKey}}/translate")).toThrow(
        "API key is required when using {{apiKey}} placeholder in DeepLX baseURL",
      )
      expect(() => buildDeepLXUrl("https://api.deeplx.com/{{apiKey}}/translate", "   ")).toThrow(
        "API key is required when using {{apiKey}} placeholder in DeepLX baseURL",
      )
    })
  })

  describe("explicit URL handling", () => {
    it("returns baseURL unchanged when it has no placeholder", () => {
      expect(buildDeepLXUrl("https://deeplx.vercel.app")).toBe("https://deeplx.vercel.app")
      expect(buildDeepLXUrl("https://deeplx.vercel.app/")).toBe("https://deeplx.vercel.app/")
      expect(buildDeepLXUrl("https://api.deeplx.org", "token123")).toBe("https://api.deeplx.org")
      expect(buildDeepLXUrl("https://api.example.com/v1/translate?token=abc/")).toBe(
        "https://api.example.com/v1/translate?token=abc/",
      )
    })

    it("does not append /translate after placeholder replacement", () => {
      const result = buildDeepLXUrl("https://api.deeplx.com/{{apiKey}}", "abc123")
      expect(result).toBe("https://api.deeplx.com/abc123")
    })
  })
})

describe("deeplxTranslate configured URL", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn<(...args: any[]) => any>().mockResolvedValue({ data: "你好" }),
      text: vi.fn<(...args: any[]) => any>().mockResolvedValue(""),
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects a missing URL without making a network request", async () => {
      await expect(deeplxTranslate("Hi", "auto", "zh", { id: "deeplx-default", enabled: true, name: "DeepLX", provider: "deeplx" })).rejects.toThrow("DeepLX baseURL is not configured")
      expect(fetchMock).not.toHaveBeenCalled()
    })

  it.each(["plain", undefined] as const)(
    "omits tag_handling for %s text format",
    async (textFormat) => {
      await deeplxTranslate(
        "Hi",
        "en",
        "zh",
        {
          id: "deeplx-default",
          enabled: true,
          name: "DeepLX",
          provider: "deeplx",
          apiKey: "token123", baseURL: "https://api.deeplx.org/{{apiKey}}/translate" },
        { textFormat },
      )

      const [, requestInit] = fetchMock.mock.calls[0]!
      expect(JSON.parse(requestInit.body)).toEqual({
        text: "Hi",
        source_lang: "EN",
        target_lang: "ZH",
      })
    },
  )

  it("sets tag_handling to html for html input", async () => {
    await deeplxTranslate(
      '<p class="message">Hi</p>',
      "en",
      "zh",
      {
        id: "deeplx-default",
        enabled: true,
        name: "DeepLX",
        provider: "deeplx",
        apiKey: "token123", baseURL: "https://api.deeplx.org/{{apiKey}}/translate" },
      { textFormat: "html" },
    )

    const [, requestInit] = fetchMock.mock.calls[0]!
    expect(JSON.parse(requestInit.body)).toEqual({
      text: '<p class="message">Hi</p>',
      source_lang: "EN",
      target_lang: "ZH",
      tag_handling: "html",
    })
  })

  it("rejects a missing key for a configured URL with a key placeholder", async () => {
    await expect(
      deeplxTranslate("Hi", "auto", "zh", {
        id: "deeplx-default",
        enabled: true,
        name: "DeepLX",
        provider: "deeplx", baseURL: "https://api.deeplx.org/{{apiKey}}/translate" }),
    ).rejects.toThrow("API key is required when using {{apiKey}} placeholder in DeepLX baseURL")

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
