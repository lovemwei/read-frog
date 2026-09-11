import type { Config } from "@/types/config/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import type { TranslationMode } from "@/types/config/translate"
import { expect } from "vitest"
import {
  CONTENT_WRAPPER_CLASS,
  NOTRANSLATE_CLASS,
  TRANSLATION_MODE_ATTRIBUTE,
  TRANSLATION_ONLY_ATTRIBUTE,
} from "@/utils/constants/dom-labels"

export const MOCK_TRANSLATION = "translation"
export const MOCK_ORIGINAL_TEXT =
  "This is deliberately long source text for block translation layout tests"

export function expectTranslationWrapper(node: Element, mode: TranslationMode) {
  const wrapper = node.querySelector(`.${CONTENT_WRAPPER_CLASS}`)
  expect(wrapper).toBeTruthy()
  expect(wrapper).toHaveAttribute(TRANSLATION_MODE_ATTRIBUTE, mode)
  expect(wrapper).toHaveClass(NOTRANSLATE_CLASS)
  return wrapper
}

export function expectTranslatedContent(
  wrapper: Element | null,
  contentClass: string,
  text: string = MOCK_TRANSLATION,
) {
  const content = wrapper?.querySelector(`.${contentClass}`)
  expect(content).toBeTruthy()
  expect(content).toHaveTextContent(text)
  expect(content).toHaveClass(NOTRANSLATE_CLASS)
  return content
}

/**
 * Assert a successful in-place text swap (translationOnly Strategy A): the
 * translation lives in the site's own text nodes, no wrapper remains, and the
 * run's anchor element carries the restore marker attribute.
 */
export function expectInPlaceTranslation(anchor: Element, text: string = MOCK_TRANSLATION) {
  expect(anchor).toHaveAttribute(TRANSLATION_ONLY_ATTRIBUTE)
  expect(anchor.querySelector(`.${CONTENT_WRAPPER_CLASS}`)).toBeFalsy()
  expect(anchor).toHaveTextContent(text)
}

export function expectNodeLabels(node: Element, attributes: string[]) {
  attributes.forEach((attr) => {
    expect(node).toHaveAttribute(attr)
  })
}

export function createConfiguredTestConfig(): Config {
  const config = structuredClone(DEFAULT_CONFIG)
  config.providersConfig = [
    { ...structuredClone(DEFAULT_PROVIDER_CONFIG.openai), apiKey: "unit-test", baseURL: "http://localhost:12345/v1" },
    structuredClone(DEFAULT_PROVIDER_CONFIG.deepseek),
    { ...structuredClone(DEFAULT_PROVIDER_CONFIG.deeplx), baseURL: "http://localhost:12345/translate" },
  ]
  config.pageTranslation.providerId = "openai-default"
  config.videoSubtitles.providerId = "openai-default"
  config.inputTranslation.providerId = "openai-default"
  config.selectionToolbar.features.translate.providerId = "openai-default"
  config.selectionToolbar.builtInActions.dictionary.providerId = "openai-default"
  return config
}
