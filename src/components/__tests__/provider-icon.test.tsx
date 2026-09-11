// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { browser } from "#imports"
import ProviderIcon from "../provider-icon"
afterEach(cleanup)
describe("provider icon", () => {
  it("renders bundled images from the extension", () => {
    const logo = new URL("/assets/provider.svg", browser.runtime.getURL("/")).href
    render(<ProviderIcon logo={logo} name="Custom" />)
    expect(screen.getByRole("img", { name: "Custom" })).toHaveAttribute("src", logo)
  })
  it("normalizes relative extension asset paths", () => {
    render(<ProviderIcon logo="/assets/provider.svg" name="Custom" />)
    expect(screen.getByRole("img", { name: "Custom" })).toHaveAttribute("src", new URL("/assets/provider.svg", browser.runtime.getURL("/")).href)
  })
  it("uses a bundled fallback for remote image URLs", () => {
    render(<ProviderIcon logo="https://cdn.example.com/tracker.webp" name="Custom" />)
    expect(screen.getByRole("img", { name: "Custom" }).getAttribute("src")).toContain("custom-provider.svg")
  })
})
