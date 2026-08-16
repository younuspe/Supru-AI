import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeftIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  FolderIcon,
  LoadingIcon,
  PlusIcon,
  ServerIcon,
  TestIcon
} from "../Icons"
import { copyToClipboard } from "../clipboard"
import {
  BACKEND_KINDS,
  backendDefaultPort,
  backendDefaultUsername,
  backendDisplayName,
  backendSetupCommand
} from "../backendSetup"
import type { Translator } from "../i18n"
import type { BackendKind, FileEntry, MachineSnapshot, ServerConfig } from "../types"

export function pathSegments(path: string): Array<{ label: string; path: string }> {
  if (!path) return []
  const windows = /^[A-Za-z]:/.test(path)
  const parts = path.split(/[\\/]+/).filter(Boolean)
  if (parts.length === 0) return [{ label: "/", path: "/" }]
  if (windows) {
    const segments = [{ label: parts[0], path: `${parts[0]}\\` }]
    let current = parts[0]
    for (const part of parts.slice(1)) {
      current = `${current}\\${part}`
      segments.push({ label: part, path: current })
    }
    return segments
  }
  const segments = [{ label: "/", path: "/" }]
  let current = ""
  for (const part of parts) {
    current = `${current}/${part}`
    segments.push({ label: part, path: current })
  }
  return segments
}

function CopyButton({ text, copyLabel, copiedLabel }: { text: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])
  return (
    <button type="button" className="btn-secondary compact" onClick={() => { void copyToClipboard(text); setCopied(true) }}>
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? copiedLabel : copyLabel}
    </button>
  )
}

export function NewSessionDialog({
  t, path, items, loading, error, creating, recentDirectories, onBrowse, onCreate, onUseServerDefault, onClose
}: {
  t: Translator
  path: string
  items: FileEntry[]
  loading: boolean
  error: string | null
  creating: boolean
  recentDirectories: string[]
  onBrowse: (path: string) => void
  onCreate: (directory: string) => void
  onUseServerDefault: () => void
  onClose: () => void
}) {
  const [typedPath, setTypedPath] = useState("")
  const segments = useMemo(() => pathSegments(path), [path])
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal-card wizard fade-in" role="dialog" aria-modal="true" aria-labelledby="new-session-title" onClick={(event) => event.stopPropagation()}>
        <div className="wizard-header">
          <div className="wizard-header-text">
            <h2 id="new-session-title">{t('sessions.newSessionTitle')}</h2>
            <p className="subtle">{t('sessions.projectDirectoryDefault')}</p>
          </div>
          <button type="button" className="btn-icon btn-ghost" onClick={onClose} aria-label={t('session.cancel')}><CloseIcon size={16} /></button>
        </div>
        <div className="wizard-body">
          {recentDirectories.length > 0 && <div className="field"><span className="eyebrow">{t('sessions.recentProjects')}</span><div className="recent-projects">
            {recentDirectories.map((directory) => <button key={directory} type="button" className={`recent-project${directory === path ? " selected" : ""}`} onClick={() => onBrowse(directory)} title={directory}><FolderIcon size={14} /><span>{directory}</span></button>)}
          </div></div>}
          <div className="field">
            <span className="eyebrow">{t('sessions.browseFolders')}</span>
            <div className="path-breadcrumb" aria-label={t('sessions.browseFolders')}>
              {segments.map((segment, index) => <span key={segment.path} style={{ display: "inline-flex", alignItems: "center" }}>{index > 0 && <span className="path-breadcrumb-sep" aria-hidden="true">/</span>}<button type="button" onClick={() => onBrowse(segment.path)}>{segment.label}</button></span>)}
            </div>
            <div className="folder-list">
              {loading ? <div className="empty-state compact"><LoadingIcon size={24} /><p>{t('sessions.folderPickerLoading')}</p></div> : items.length === 0 ? <p className="subtle model-empty">{t('sessions.folderPickerEmpty')}</p> : items.map((item) => <button key={item.absolute} type="button" className="folder-row" onClick={() => onBrowse(item.absolute)}><FolderIcon size={15} /><span>{item.name}</span></button>)}
            </div>
          </div>
          <div className="field">
            <span>{t('sessions.typePathLabel')}</span>
            <div className="inline-actions">
              <input value={typedPath} onChange={(event) => setTypedPath(event.target.value)} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); if (typedPath.trim()) onBrowse(typedPath.trim()) }} placeholder={t('sessions.typePathPlaceholder')} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" style={{ flex: "1 1 14rem" }} />
              <button type="button" className="btn-secondary" disabled={!typedPath.trim()} onClick={() => onBrowse(typedPath.trim())}>{t('sessions.goToPath')}</button>
            </div>
          </div>
          <div className="folder-picker-current"><span className="eyebrow">{t('sessions.projectDirectoryLabel')}</span><strong>{path || t('detail.loadingProject')}</strong></div>
          {error && <div className="error fade-in">✗ {error}</div>}
        </div>
        <div className="wizard-footer">
          <button type="button" className="btn-ghost" onClick={onUseServerDefault} disabled={creating}>{t('sessions.useServerDefault')}</button><span className="spacer" />
          <button type="button" className="btn-secondary" onClick={onClose}>{t('session.cancel')}</button>
          <button type="button" className="btn-primary" onClick={() => onCreate(path)} disabled={creating || !path}>{creating ? <LoadingIcon size={15} /> : <PlusIcon size={15} />}{creating ? t('sessions.creating') : t('sessions.useThisFolder')}</button>
        </div>
      </section>
    </div>
  )
}

type WizardStep = "harness" | "address"
const WIZARD_STEPS: WizardStep[] = ["harness", "address"]

/** Phase 1 deliberately keeps connection setup simple: choose a harness, enter an address, click Connect. */
export function ConnectServerWizard({ t, initialName, onCancel, onSave, onTest }: {
  t: Translator
  initialName: string
  onCancel: () => void
  onSave: (name: string, config: ServerConfig) => void
  onTest: (config: ServerConfig) => Promise<{ ok: boolean; message: string }>
  onDiscover?: (config: ServerConfig) => Promise<MachineSnapshot | null>
}) {
  const [step, setStep] = useState<WizardStep>("harness")
  const [backend, setBackend] = useState<BackendKind>("opencode")
  const [name, setName] = useState(initialName)
  const [host, setHost] = useState("127.0.0.1")
  const [port, setPort] = useState(backendDefaultPort("opencode"))
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const config: ServerConfig = {
    backend,
    host: host.trim(),
    port,
    username: backendDefaultUsername(backend),
    password: ""
  }
  const command = backendSetupCommand(backend, { port })
  const stepIndex = WIZARD_STEPS.indexOf(step)
  const canConnect = Boolean(host.trim()) && port > 0

  function chooseBackend(next: BackendKind) {
    setBackend(next)
    setPort(backendDefaultPort(next))
    setName(`${backendDisplayName(next)} server`)
    setTestResult(null)
    setStep("address")
  }

  async function connect() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await onTest(config)
      setTestResult(result)
      if (result.ok) onSave(name || `${backendDisplayName(backend)} server`, config)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <section className="modal-card wizard fade-in" role="dialog" aria-modal="true" aria-labelledby="connect-server-title" onClick={(event) => event.stopPropagation()}>
        <div className="wizard-header">
          <div className="wizard-header-text">
            <h2 id="connect-server-title">{t('connect.title')}</h2>
            <p className="subtle">{t('connect.subtitle')}</p>
          </div>
          <button type="button" className="btn-icon btn-ghost" onClick={onCancel} aria-label={t('session.cancel')}><CloseIcon size={16} /></button>
        </div>
        <ol className="wizard-steps">
          {WIZARD_STEPS.map((candidate, index) => <li key={candidate} className={`wizard-step${candidate === step ? " active" : index < stepIndex ? " done" : ""}`}>
            <button type="button" className="wizard-step-button" onClick={() => setStep(candidate)} aria-current={candidate === step ? "step" : undefined}>
              <span className="wizard-step-index" aria-hidden="true">{index < stepIndex ? "✓" : index + 1}</span>{t(`connect.step.${candidate}`)}
            </button>
            {index < WIZARD_STEPS.length - 1 && <span className="wizard-step-divider" aria-hidden="true" />}
          </li>)}
        </ol>
        <div className="wizard-body">
          {step === "harness" && <div className="choice-grid">
            {BACKEND_KINDS.map((kind) => <button key={kind} type="button" className={`choice-card${backend === kind ? " selected" : ""}`} onClick={() => chooseBackend(kind)}>
              <strong><span className={`harness-badge harness-${kind}`}>{backendDisplayName(kind)}</span></strong><small>{t(`connect.harness.${kind}`)}</small>
            </button>)}
          </div>}
          {step === "address" && <>
            <label className="field"><span>{t('settings.serverName')}</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" /></label>
            <div className="form-grid">
              <label className="field"><span>{t('settings.host')}</span><input value={host} onChange={(event) => setHost(event.target.value)} placeholder={t('settings.hostPlaceholder')} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" /></label>
              <label className="field"><span>{t('settings.port')}</span><input value={port || ""} onChange={(event) => { const value = event.target.value.trim(); if (value === "" || /^\d+$/.test(value)) setPort(value === "" ? 0 : Number(value)) }} inputMode="numeric" pattern="[0-9]*" autoComplete="off" /></label>
            </div>
            <p className="field-hint">{t('connect.addressHint')}</p>
            <div className="code-callout">
              <div className="code-callout-head"><span className="eyebrow">{t('connect.runOnHost')}</span><CopyButton text={command} copyLabel={t('connect.copyCommand')} copiedLabel={t('connect.copied')} /></div>
              <pre>{command}</pre>
            </div>
          </>}
        </div>
        {step === "address" && <div className="wizard-test">
          <button type="button" className="btn-primary" onClick={() => void connect()} disabled={testing || !canConnect}>
            {testing ? <LoadingIcon size={15} /> : <TestIcon size={15} />}
            {testing ? t('settings.testing') : "Connect"}
          </button>
          {testResult && <div className={`notice ${testResult.ok ? "success" : "error"} fade-in`}>{testResult.ok ? "✓ " : "✗ "}{testResult.message}</div>}
        </div>}
        <div className="wizard-footer">
          {step !== "harness" && <button type="button" className="btn-ghost" onClick={() => setStep("harness")}><ArrowLeftIcon size={15} />{t('connect.back')}</button>}
          <span className="spacer" />
          <button type="button" className="btn-secondary" onClick={onCancel}>{t('session.cancel')}</button>
          {step === "harness" ? <button type="button" className="btn-primary" onClick={() => setStep("address")}>{t('connect.next')}</button> : <span className="subtle" style={{ alignSelf: "center" }}>Click Connect to save this server.</span>}
        </div>
      </section>
    </div>
  )
}
