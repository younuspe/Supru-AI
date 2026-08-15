import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronDownIcon, SearchIcon, ServerIcon } from "../Icons"

/** Closes a popup on the three things that all mean "not this": a press elsewhere, Escape, and a
 *  resize that moves whatever the popup was anchored to. Every menu in the app shares it so a
 *  second one can never open on top of a first that has no way of leaving. */
export function useDismissable(open: boolean, onDismiss: () => void, container: { current: HTMLElement | null }) {
  useEffect(() => {
    if (!open) return
    const dismissOnPointer = (event: PointerEvent) => {
      if (!container.current || !container.current.contains(event.target as Node)) onDismiss()
    }
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        onDismiss()
      }
    }
    window.addEventListener("pointerdown", dismissOnPointer)
    window.addEventListener("keydown", dismissOnEscape)
    window.addEventListener("resize", onDismiss)
    return () => {
      window.removeEventListener("pointerdown", dismissOnPointer)
      window.removeEventListener("keydown", dismissOnEscape)
      window.removeEventListener("resize", onDismiss)
    }
  }, [open, onDismiss, container])
}

export type MenuEntry =
  | {
      kind: "item"
      id: string
      label: string
      shortcut?: string
      disabled?: boolean
      checked?: boolean
      onSelect: () => void
    }
  | { kind: "separator"; id: string }

export type MenuDefinition = {
  id: string
  label: string
  entries: MenuEntry[]
}

function MenuEntries({ entries, onChosen }: { entries: MenuEntry[]; onChosen: () => void }) {
  return (
    <>
      {entries.map((entry) =>
        entry.kind === "separator" ? (
          <div key={entry.id} className="menu-separator" role="separator" />
        ) : (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            className="menu-item"
            disabled={entry.disabled}
            aria-checked={entry.checked === undefined ? undefined : entry.checked}
            onClick={() => {
              onChosen()
              entry.onSelect()
            }}
          >
            <span className="menu-item-label">{entry.label}</span>
            {entry.shortcut && <span className="menu-item-shortcut">{entry.shortcut}</span>}
          </button>
        )
      )}
    </>
  )
}

/**
 * The desktop menu bar for the browser build. The packaged desktop app gets the platform's own
 * application menu instead and passes `menus: []`, which leaves this as the title/status strip —
 * the brand, the server switcher and the palette hint still have to live somewhere.
 *
 * Menus behave the way a menu bar is expected to: once one is open, moving the pointer across the
 * others switches between them without a second click.
 */
export function MenuBar({
  menus,
  brand,
  right
}: {
  menus: MenuDefinition[]
  brand: ReactNode
  right: ReactNode
}) {
  const [openMenuID, setOpenMenuID] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  useDismissable(openMenuID !== null, () => setOpenMenuID(null), barRef)

  return (
    <header className="app-menubar" ref={barRef}>
      <div className="menubar-brand">{brand}</div>
      {menus.length > 0 && (
        <nav className="menubar-menus" aria-label="Application menu">
          {menus.map((menu) => (
            <div key={menu.id} className="menubar-root">
              <button
                type="button"
                className="menubar-trigger"
                aria-haspopup="menu"
                aria-expanded={openMenuID === menu.id}
                onClick={() => setOpenMenuID((current) => (current === menu.id ? null : menu.id))}
                onPointerEnter={() => setOpenMenuID((current) => (current === null ? current : menu.id))}
              >
                {menu.label}
              </button>
              {openMenuID === menu.id && (
                <div className="menubar-dropdown menu-surface fade-in" role="menu" aria-label={menu.label}>
                  <MenuEntries entries={menu.entries} onChosen={() => setOpenMenuID(null)} />
                </div>
              )}
            </div>
          ))}
        </nav>
      )}
      <div className="menubar-spacer" />
      <div className="menubar-right">{right}</div>
    </header>
  )
}

export type ServerProfileSummary = {
  id: string
  name: string
  backendLabel: string
  backendClass: string
  address: string
}

/**
 * Picking which machine you are driving used to be a bare `<select>` showing only a name. A server
 * is a harness, an address and a live connection, and choosing the wrong one is the single most
 * confusing thing that can happen in this app — so the switcher shows all three, and carries the
 * "add another" and "manage" actions that previously only existed inside Settings.
 */
export function ServerSwitcher({
  profiles,
  activeProfileID,
  connectionState,
  connectionLabel,
  onSelect,
  onAddServer,
  onManageServers,
  addLabel,
  manageLabel,
  ariaLabel
}: {
  profiles: ServerProfileSummary[]
  activeProfileID: string
  connectionState: string
  connectionLabel: string
  onSelect: (profileID: string) => void
  onAddServer: () => void
  onManageServers: () => void
  addLabel: string
  manageLabel: string
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useDismissable(open, () => setOpen(false), rootRef)
  const active = profiles.find((profile) => profile.id === activeProfileID) ?? profiles[0]

  return (
    <div className="server-switcher" ref={rootRef}>
      <button
        type="button"
        className="server-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={active ? `${active.name} — ${active.address} (${connectionLabel})` : ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`status-dot ${connectionState}`} aria-hidden="true" />
        <span className="server-switcher-name">{active?.name ?? ariaLabel}</span>
        <ChevronDownIcon size={14} />
      </button>
      {open && (
        <div className="server-switcher-menu menu-surface fade-in" role="menu" aria-label={ariaLabel}>
          <div className="menu-group-label">{ariaLabel}</div>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              role="menuitemradio"
              aria-checked={profile.id === activeProfileID}
              className={`server-option${profile.id === activeProfileID ? " active" : ""}`}
              onClick={() => {
                setOpen(false)
                onSelect(profile.id)
              }}
            >
              <ServerIcon size={16} />
              <span className="server-option-text">
                <strong>{profile.name}</strong>
                <small>{profile.address}</small>
              </span>
              <span className={`harness-badge harness-${profile.backendClass}`}>{profile.backendLabel}</span>
            </button>
          ))}
          <div className="menu-separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false)
              onAddServer()
            }}
          >
            <span className="menu-item-label">{addLabel}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false)
              onManageServers()
            }}
          >
            <span className="menu-item-label">{manageLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export type PaletteCommand = {
  id: string
  group: string
  label: string
  hint?: string
  keywords?: string
  icon?: ReactNode
  disabled?: boolean
  run: () => void
}

/** Every character of the query has to appear in order somewhere in the haystack. Cheap, and it is
 *  what makes "nsd" find "New session in this directory" the way a developer expects. */
function fuzzyScore(haystack: string, query: string): number | null {
  if (!query) return 0
  let score = 0
  let cursor = 0
  for (const character of query) {
    const index = haystack.indexOf(character, cursor)
    if (index === -1) return null
    // Adjacent matches and matches at a word boundary are what the user meant; scattered ones
    // are a coincidence, and ranking has to be able to tell them apart.
    score += index === cursor ? 3 : haystack[index - 1] === " " ? 2 : 1
    cursor = index + 1
  }
  return score
}

/**
 * Ctrl/Cmd+K. Everything the menus can do, plus every open session, reachable by typing. This is
 * what keeps the app usable as it grows: a new capability becomes one more command rather than one
 * more button competing for room in the chrome.
 */
export function CommandPalette({
  commands,
  placeholder,
  emptyLabel,
  navigateHint,
  runHint,
  closeHint,
  onClose
}: {
  commands: PaletteCommand[]
  placeholder: string
  emptyLabel: string
  navigateHint: string
  runHint: string
  closeHint: string
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return commands.filter((command) => !command.disabled)
    return commands
      .filter((command) => !command.disabled)
      .map((command) => ({
        command,
        score: fuzzyScore(`${command.group} ${command.label} ${command.keywords ?? ""} ${command.hint ?? ""}`.toLowerCase(), text)
      }))
      .filter((entry): entry is { command: PaletteCommand; score: number } => entry.score !== null)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.command)
  }, [commands, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // The keyboard is the point of a palette, so the highlighted row has to stay on screen while
  // arrowing past the bottom of the list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(".palette-item.active")?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, matches])

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => (matches.length === 0 ? 0 : (index + 1) % matches.length))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => (matches.length === 0 ? 0 : (index - 1 + matches.length) % matches.length))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const chosen = matches[activeIndex]
      if (chosen) {
        onClose()
        chosen.run()
      }
    } else if (event.key === "Escape") {
      event.preventDefault()
      onClose()
    }
  }

  let lastGroup: string | null = null

  return (
    <div className="palette-backdrop" role="presentation" onClick={onClose}>
      <section
        className="palette fade-in"
        role="dialog"
        aria-modal="true"
        aria-label={placeholder}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="palette-input-row">
          <SearchIcon size={18} />
          <input
            className="palette-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={placeholder}
            aria-activedescendant={matches[activeIndex] ? `palette-${matches[activeIndex].id}` : undefined}
          />
        </div>
        <div className="palette-list" ref={listRef} role="listbox" aria-label={placeholder}>
          {matches.length === 0 ? (
            <p className="palette-empty subtle">{emptyLabel}</p>
          ) : (
            matches.map((command, index) => {
              const groupLabel = command.group !== lastGroup ? command.group : null
              lastGroup = command.group
              return (
                <div key={command.id}>
                  {groupLabel && <div className="menu-group-label">{groupLabel}</div>}
                  <button
                    type="button"
                    id={`palette-${command.id}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`palette-item${index === activeIndex ? " active" : ""}`}
                    onPointerEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      onClose()
                      command.run()
                    }}
                  >
                    {command.icon && <span className="palette-item-icon">{command.icon}</span>}
                    <span className="palette-item-label">{command.label}</span>
                    {command.hint && <span className="palette-item-hint">{command.hint}</span>}
                  </button>
                </div>
              )
            })
          )}
        </div>
        <div className="palette-footer">
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> {navigateHint}</span>
          <span><kbd className="kbd">↵</kbd> {runHint}</span>
          <span><kbd className="kbd">esc</kbd> {closeHint}</span>
        </div>
      </section>
    </div>
  )
}
