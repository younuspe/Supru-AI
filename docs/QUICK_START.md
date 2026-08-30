# Supru AI quick start

The shortest setup path uses the `supru-ai` launcher.

```bash
npx github:younuspe/Supru-AI
```

From a local checkout:

```bash
npm install
npm start
```

## Authentication

Supru AI does **not** require the user to invent or enter a username or password for the normal local desktop/localhost connection. The bridge is bound to loopback by default and accepts local requests without Basic Auth credentials.

For a LAN/non-loopback connection, explicit HTTP Basic Auth credentials are still required. Those credentials are connection credentials for the bridge; they are not Supru AI user accounts and are not AI-provider API tokens.

The bridge does not currently implement email/password accounts, OAuth, JWT access tokens, or refresh tokens.

## Local bridge flow

```text
Supru AI UI
    -> local bridge (127.0.0.1:4097)
    -> ACP/backend
    -> AI provider/runtime
```

The browser is restricted by the configured CORS origins. Desktop IPC additionally validates that requests come from the trusted Supru AI renderer.

## Multi-agent daemon

On a machine with multiple supported CLIs, `supru-ai` can start one machine daemon and route agent-scoped requests through it. Managed OpenCode remains loopback-only by default. The client does not need direct access to the managed OpenCode port.

For an explicitly exposed LAN daemon, supply credentials yourself, for example:

```bash
supru-ai --backend claude --port 4900 --username supru --password 'choose-a-strong-password'
```

These credentials are optional for loopback-only operation and mandatory for non-loopback binding.

## OpenCode

When OpenCode is selected, Supru AI manages its internal connection separately. The UI does not need to ask the user for OpenCode's internal server credentials during the normal managed flow.

## Images

The repository's Supru AI PNG assets are kept as design/source assets. UI code should reference the appropriate asset for each surface and render it with responsive sizing rather than stretching a single PNG into every slot.

## Advanced/manual setup

Backend-specific bridge commands remain supported for custom adapter commands, networking, CORS, roots, and other advanced settings.
