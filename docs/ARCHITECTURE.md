# Architecture & Design

## Overview

Supru-AI is a three-tier architecture:

1. **Bridge Backend** (Node.js) - Core task management and orchestration
2. **Web/Mobile Frontend** (React + Electron + Capacitor) - User interface
3. **System Integration** (Git, CLI, Daemon) - OS-level integration

## Backend Architecture (bridge/)

### Core Modules

| Module | Purpose |
|--------|---------|
| `cli.js` | Command-line entry point |
| `daemon-cli.js` | Daemon mode startup & management |
| `server.js` | HTTP API server |
| `task-launcher.js` | Initiates new AI tasks |
| `task-run-controller.js` | Manages active task execution |
| `task-store.js` | Task persistence & queries |
| `session-history.js` | Session tracking & archival |
| `machine-registry.js` | Connected machine registry |
| `worktree-manager.js` | Git worktree lifecycle |
| `agent-router.js` | Routes to backend AI services |
| `acp-client.js` / `acp-service.js` | ACP protocol support |
| `project-catalog.js` | Project discovery & metadata |
| `extension-actions.js` | External action handlers |
| `http-policy.js` | CORS & security policies |
| `information-gateway.js` | Data aggregation layer |

### Request Flow

```
HTTP Request
    ↓
server.js (Express middleware)
    ↓
Route Handler (task-launcher, session-history, etc.)
    ↓
Data Layer (task-store, machine-registry)
    ↓
System Integration (git, CLI, worktree-manager)
    ↓
Response / Event Stream
```

## Frontend Architecture (web/)

### Component Hierarchy

```
App.tsx
├── Dashboard
│   ├── SessionList
│   │   └── SessionCard
│   └── SessionDetail
│       ├── ChatHistory
│       ├── CodeViewer
│       └── Controls
├── Settings
│   ├── ServerConfig
│   ├── ProfileSelector
│   └── DebugPanel
└── Navigation
    └── SidebarMenu
```

### State Management

- **React Hooks:** `useState`, `useReducer` for local component state
- **SSE (Server-Sent Events):** Real-time updates from backend
- **localStorage:** User preferences and session state
- **TypeScript:** Type safety across all components

### API Integration

File: `web/src/api.ts`

Key endpoints:
```javascript
// Tasks
POST   /api/tasks                // Create new task
GET    /api/tasks/:id           // Get task details
POST   /api/tasks/:id/start     // Start task
POST   /api/tasks/:id/finish    // Complete task

// Sessions
GET    /api/sessions            // List all sessions
GET    /api/sessions/:id        // Get session details
DELETE /api/sessions/:id        // Archive session

// Server Config
GET    /api/server/config       // Get backend config
POST   /api/server/config       // Update config

// Real-time
GET    /api/events/stream       // SSE event stream
```

## Desktop Application (Electron)

### Main Process
File: `web/electron/main.ts`

- Window management
- IPC bridge to Node.js
- Menu & app lifecycle
- File system access

### Preload Script
Secure IPC between renderer and main process.

## Mobile Application (Capacitor + Android)

### Native Layer
Directory: `web/native-android/`

Capacitor plugins:
- `@capacitor/core` - Core APIs
- `@capacitor/app` - App lifecycle
- `@capacitor/filesystem` - File system access

### Build Process
```
React App (web/src/)
    ↓
Vite Build → dist/
    ↓
Capacitor Sync → native-android/
    ↓
Gradle Build → APK/AAB
```

## CI/CD Pipeline

### Workflows

1. **build-android.yml** (Consolidated)
   - Tests (web + bridge)
   - APK build on push
   - AAB build on workflow_dispatch

2. **desktop-apps.yml**
   - Windows (NSIS installer)
   - macOS (DMG + ZIP)
   - Linux (AppImage + DEB)

3. **gh-pages.yml**
   - Deploy documentation & demo

### Artifact Outputs
- APK: `web/android/app/build/outputs/apk/debug/*.apk`
- AAB: `web/android/app/build/outputs/bundle/release/*.aab`
- Desktop: `web/release/*.exe`, `*.dmg`, `*.AppImage`

## Security

### API Authentication
- Bearer tokens (optional setup in backendSetup.ts)
- CORS policy enforcement (http-policy.js)

### Data Storage
- Session tokens in localStorage (encrypted in production)
- Keystore for Android signing (secrets-based)

### Transport
- HTTPS in production
- SSE for real-time, firewall-friendly streams

## Performance Considerations

### Frontend
- Code splitting via Vite
- Lazy loading of components
- Virtual scrolling for large session lists

### Backend
- Connection pooling
- Task queue for async operations
- Caching for frequently accessed data

### Mobile
- Progressive image loading
- Offline mode support (future)
- Battery-aware networking

## Testing Strategy

### Unit Tests
- Bridge: `bridge/test/` with Node.js Test Runner
- Web: Individual component tests

### Integration Tests
- Web: Regression tests (ui, settings, model, events)
- End-to-end: Full flow testing

### Manual Testing
- Desktop app: electron:dev
- Mobile: Capacitor sync + Android emulator

## Error Handling

### Backend
- Global error handler in server.js
- Task error tracking (task-errors.js)
- Graceful degradation for missing services

### Frontend
- ErrorBoundary component wraps app
- User-facing error messages
- Retry logic for failed API calls

## Future Improvements

1. **Authentication:** OAuth2 / GitHub integration
2. **Database:** Persistent storage layer
3. **Notifications:** Push notifications for task completion
4. **Offline:** Service Workers + IndexedDB
5. **Scaling:** Load balancing for multiple daemons
