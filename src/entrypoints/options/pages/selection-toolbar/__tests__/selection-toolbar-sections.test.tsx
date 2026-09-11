// @vitest-environment jsdom

import type { Config } from "@/types/config/config"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { ActionsSection } from "../actions"
import { DisplaySection } from "../display"
import { EnableItem } from "../enable-item"

const { selectionToolbarAtom, setSelectionToolbarMock, testState } = vi.hoisted(() => ({
  selectionToolbarAtom: {},
  setSelectionToolbarMock: vi.fn<(value: Partial<Config["selectionToolbar"]>) => Promise<void>>(),
  testState: {
    selectionToolbar: null as Config["selectionToolbar"] | null,
  },
}))

vi.mock("jotai", () => ({
  useAtom: (atom: object) => {
    if (atom !== selectionToolbarAtom || !testState.selectionToolbar) {
      throw new Error("Unexpected atom")
    }
    return [testState.selectionToolbar, setSelectionToolbarMock]
  },
}))

vi.mock("@/utils/atoms/config", () => ({
  configFieldsAtomMap: {
    selectionToolbar: selectionToolbarAtom,
  },
}))

// The note-suggestion provider row pulls in the full provider stack (jotai
// atoms, hosted-AI status queries); this suite only cares about the section
// wiring, so keep that row shallow.
vi.mock("@/components/llm-providers/use-feature-providers", () => ({
  useFeatureProvider: () => ({
    providers: [],
    providerId: "read-frog-free-ai",
    providerConfig: null,
    setProviderId: vi.fn<(id: string) => void>(),
  }),
}))

vi.mock("@/components/llm-providers/provider-selector", () => ({
  default: () => <div>ProviderSelector</div>,
}))

describe("selection toolbar page sections", () => {
  beforeEach(() => {
    testState.selectionToolbar = structuredClone(DEFAULT_CONFIG.selectionToolbar)
    setSelectionToolbarMock.mockReset()
    setSelectionToolbarMock.mockResolvedValue()
  })

  it("writes the page-wide switch without touching the rest of the config", () => {
    const selectionToolbar = testState.selectionToolbar!

    render(<EnableItem />)
    fireEvent.click(screen.getByRole("switch"))

    expect(setSelectionToolbarMock).toHaveBeenCalledWith({
      ...selectionToolbar,
      enabled: !selectionToolbar.enabled,
    })
  })

  it("switches translation without changing other toolbar settings", () => {
    const selectionToolbar = testState.selectionToolbar!

    render(<ActionsSection />)
    const translate = screen.getByRole("switch")

    fireEvent.click(translate)

    expect(setSelectionToolbarMock).toHaveBeenCalledWith({
      ...selectionToolbar,
      features: {
        ...selectionToolbar.features,
        translate: { ...selectionToolbar.features.translate, enabled: false },
      },
    })
    expect(screen.getAllByRole("switch")).toHaveLength(1)
  })

  it("adds a disabled site without dropping the rest of the toolbar config", () => {
    const selectionToolbar = testState.selectionToolbar!

    render(<DisplaySection />)

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "example.com" } })
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })

    expect(setSelectionToolbarMock).toHaveBeenCalledWith({
      ...selectionToolbar,
      disabledSelectionToolbarPatterns: [
        "example.com",
        ...selectionToolbar.disabledSelectionToolbarPatterns,
      ],
    })
  })
})
