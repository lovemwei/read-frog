import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { duplicateSelectionToolbarAction, getBuiltInDictionaryAction, getSelectionToolbarActions, replaceSelectionToolbarAction } from "@/utils/custom-actions"
describe("selection toolbar actions", () => {
  it("resolves Dictionary before custom actions", () => {
    const toolbar = structuredClone(DEFAULT_CONFIG.selectionToolbar)
    const dictionary = getBuiltInDictionaryAction(toolbar)
    toolbar.customActions = [{ ...dictionary, id: "custom", name: "Custom" }]
    expect(getSelectionToolbarActions(toolbar).map(action => action.id)).toEqual(["default-dictionary", "custom"])
  })
  it("persists only mutable Dictionary state", () => {
    const toolbar = structuredClone(DEFAULT_CONFIG.selectionToolbar)
    const dictionary = getBuiltInDictionaryAction(toolbar)
    const next = replaceSelectionToolbarAction(toolbar, { ...dictionary, name: "Edited", prompt: "Edited", enabled: false, providerId: "custom" })
    expect(next.builtInActions.dictionary).toEqual({ enabled: false, providerId: "custom" })
    expect(getBuiltInDictionaryAction(next)).toMatchObject({ name: dictionary.name, prompt: dictionary.prompt, enabled: false, providerId: "custom" })
  })
  it("deep-copies output fields into an editable duplicate", () => {
    const dictionary = getBuiltInDictionaryAction(DEFAULT_CONFIG.selectionToolbar)
    const duplicate = duplicateSelectionToolbarAction(dictionary, [dictionary])
    expect(duplicate.id).not.toBe(dictionary.id)
    expect(duplicate.name).not.toBe(dictionary.name)
    expect(duplicate.outputSchema).toEqual(dictionary.outputSchema)
    expect(duplicate.outputSchema).not.toBe(dictionary.outputSchema)
    expect(duplicate.outputSchema[0]).not.toBe(dictionary.outputSchema[0])
  })
})
