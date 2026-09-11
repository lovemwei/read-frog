import type {
  ProviderAvailability,
  PromptableProviderRef,
  SerializableProviderRef,
} from "../provider-ref"
import type { ResolvedProviderRef } from "../provider-registry"
import type { LLMProviderConfig, TranslateProviderConfig } from "@/types/config/provider"

import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest"

// The background owns the request and its cache; content only asks for it.
const sendMessageMock = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock("@/utils/message", () => ({
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
}))

const {
  canProviderRefGenerateText,
  canResolvedProviderRefGenerateText,
  checkProviderAvailability,
  resolvePageTranslationProvider,
  serializeProviderRef,
} = await import("../provider-ref")







/** A promise whose settlement the test controls, so overlap is deterministic. */


describe("local provider serialization", () => {
  beforeEach(() => {
    sendMessageMock.mockReset()
  })

  

  

  

  

  

  it("never reaches the status endpoint for a local provider", async () => {
    const local = { provider: "openai", id: "openai-1" } as unknown as LLMProviderConfig
    const localRef: ResolvedProviderRef<LLMProviderConfig> = {
      kind: "local",
      config: local,
      id: "openai-1",
      name: "OpenAI",
    }

    await expect(serializeProviderRef(localRef)).resolves.toEqual({
      kind: "local",
      config: local,
    })
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it("keeps the narrow overload's promise: a serialized LLM ref passes the transport guard", async () => {
    const local = { provider: "openai", id: "openai-1" } as unknown as LLMProviderConfig
    const ref = await serializeProviderRef(
      { kind: "local", config: local, id: "openai-1", name: "OpenAI" })
    // The overload asserts PromptableProviderRef; the implementation must
    // actually deliver one, or every payload typed on the narrow ref lies.
    expect(canProviderRefGenerateText(ref)).toBe(true)
  })
})

describe("overload contracts", () => {
  it("pins the promptable overloads at the type level", () => {
    // Never called — the assertions inside are checked by the type-aware
    // linter, not executed. They are what fails if someone widens the narrow
    // overloads or lets the resolvers hand back an asymmetric ref again.
    function pinOverloadContracts(
      promptable: ResolvedProviderRef<LLMProviderConfig>,
      translate: ResolvedProviderRef<TranslateProviderConfig>,
      bareConfig: TranslateProviderConfig,
    ) {
      expectTypeOf(serializeProviderRef(promptable)).toEqualTypeOf<
        Promise<PromptableProviderRef>
      >()
      expectTypeOf(serializeProviderRef(translate)).toEqualTypeOf<
        Promise<SerializableProviderRef>
      >()
      expectTypeOf(checkProviderAvailability(promptable)).toEqualTypeOf<
        Promise<ProviderAvailability<PromptableProviderRef>>
      >()
      expectTypeOf(checkProviderAvailability(translate)).toEqualTypeOf<
        Promise<ProviderAvailability>
      >()
      expectTypeOf(resolvePageTranslationProvider).returns.toEqualTypeOf<
        ResolvedProviderRef<TranslateProviderConfig>
      >()
      if (canResolvedProviderRefGenerateText(translate)) {
        expectTypeOf(translate).toEqualTypeOf<ResolvedProviderRef<LLMProviderConfig>>()
      }
      // @ts-expect-error — a bare provider config is no longer a resolvable ref
      void serializeProviderRef(bareConfig)
    }
    expect(pinOverloadContracts).toBeInstanceOf(Function)
  })
})
