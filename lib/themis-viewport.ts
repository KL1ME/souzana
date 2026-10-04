/** Keep the chat inside the visible viewport when a phone keyboard opens. */
export function trackThemisViewport(
  panel: HTMLElement,
  conversation: HTMLElement | null,
  browser: Pick<Window, "visualViewport" | "innerHeight" | "addEventListener" | "removeEventListener"> = window,
) {
  const viewport = browser.visualViewport
  function update() {
    const followingLatest = conversation
      && conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop < 24
    panel.style.setProperty("--themis-viewport-height", `${viewport?.height ?? browser.innerHeight}px`)
    panel.style.setProperty("--themis-viewport-top", `${viewport?.offsetTop ?? 0}px`)
    // Resizing the message area should keep the latest reply visible, while
    // leaving visitors who scrolled to earlier messages at their reading position.
    if (followingLatest) conversation.scrollTop = conversation.scrollHeight
  }

  update()
  viewport?.addEventListener("resize", update)
  viewport?.addEventListener("scroll", update)
  browser.addEventListener("resize", update)
  return () => {
    viewport?.removeEventListener("resize", update)
    viewport?.removeEventListener("scroll", update)
    browser.removeEventListener("resize", update)
    panel.style.removeProperty("--themis-viewport-height")
    panel.style.removeProperty("--themis-viewport-top")
  }
}
