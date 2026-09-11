import type { ResolvedProviderRef } from "./provider-registry"
import type { Config } from "@/types/config/config"
import type { LLMProviderConfig, TranslateProviderConfig } from "@/types/config/provider"
import { isLLMProviderConfig } from "@/types/config/provider"
import { resolveProviderRefForCapability } from "./provider-registry"

export type SerializableProviderRef = { kind: "local"; config: TranslateProviderConfig }
export type PromptableProviderRef = { kind: "local"; config: LLMProviderConfig }

export function resolvePageTranslationProvider(config: Config): ResolvedProviderRef<TranslateProviderConfig> {
  const resolved = resolvePageTranslationProviderOrNull(config)
  if (!resolved) throw new Error("Configure a custom translation provider in extension settings.")
  return resolved
}

export function resolvePageTranslationProviderOrNull(config: Config): ResolvedProviderRef<TranslateProviderConfig> | null {
  return resolveProviderRefForCapability("pageTranslation", config.providersConfig, config.pageTranslation.providerId)
}

export function getProviderCacheIdentity(ref: SerializableProviderRef): string {
  return JSON.stringify(ref.config)
}

export function canProviderRefGenerateText(ref: SerializableProviderRef): ref is PromptableProviderRef {
  return isLLMProviderConfig(ref.config)
}

export function canResolvedProviderRefGenerateText(ref: ResolvedProviderRef): ref is ResolvedProviderRef<LLMProviderConfig> {
  return isLLMProviderConfig(ref.config)
}

export function serializeProviderRef(provider: ResolvedProviderRef<LLMProviderConfig>): Promise<PromptableProviderRef>
export function serializeProviderRef(provider: ResolvedProviderRef<TranslateProviderConfig>): Promise<SerializableProviderRef>
export async function serializeProviderRef(provider: ResolvedProviderRef<TranslateProviderConfig>): Promise<SerializableProviderRef> {
  return { kind: "local", config: provider.config }
}

export type ProviderAvailability<Ref extends SerializableProviderRef = SerializableProviderRef> =
  | { available: true; providerRef: Ref }
  | { available: false; message: string }

export function checkProviderAvailability(provider: ResolvedProviderRef<LLMProviderConfig>): Promise<ProviderAvailability<PromptableProviderRef>>
export function checkProviderAvailability(provider: ResolvedProviderRef<TranslateProviderConfig>): Promise<ProviderAvailability>
export async function checkProviderAvailability(provider: ResolvedProviderRef<TranslateProviderConfig>): Promise<ProviderAvailability> {
  return { available: true, providerRef: await serializeProviderRef(provider) }
}
