/**
 * The Clipboard API is secure-context only, and this app is also meant to be served over plain http
 * on a LAN, where `navigator.clipboard` is not rejected but absent: reaching through it throws
 * before there is a promise to catch, so the copy fails with nothing in the clipboard and nothing on
 * screen. The deprecated selection copy is the only thing that still works there.
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Writing an empty string is not a harmless no-op: it succeeds, and it replaces whatever the user
  // had in the clipboard with nothing. Refusing it keeps a bubble with no text from quietly wiping a
  // selection the user copied a moment earlier.
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // A missing API and a refused write need the same fallback from here.
  }
  const carrier = document.createElement("textarea")
  carrier.value = text
  carrier.setAttribute("readonly", "")
  carrier.style.position = "fixed"
  carrier.style.top = "0"
  carrier.style.opacity = "0"
  document.body.appendChild(carrier)
  // The carrier has to own the selection to be copied, which takes it away from whatever the user
  // had highlighted. Their range is put back afterwards, so falling back does not also cost them
  // the selection they made.
  const selection = window.getSelection()
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  carrier.select()
  carrier.setSelectionRange(0, text.length)
  try {
    document.execCommand("copy")
  } catch {
    // Out of options: both paths are gone.
  } finally {
    carrier.remove()
    if (previousRange && selection) {
      selection.removeAllRanges()
      selection.addRange(previousRange)
    }
  }
}
