# Supru AI

A full-stack AI companion application for controlling GitHub Copilot coding agent sessions from desktop or mobile devices. Monitor real-time agent progress, manage sessions, and interact with AI-powered development workflows across Windows, macOS, Linux, and Android.

## 🚀 Quick Start

### Prerequisites
- **Node.js:** 20+ (bridge backend), 22+ (web development)
- **Git:** For version control and worktree management
- **Docker** (optional): For containerized builds

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/younuspe/Supru-AI.git
cd Supru-AI

# Install root dependencies
npm install

# Install bridge backend
cd bridge
npm install
npm run daemon

# In another terminal, install and run web app
cd web
npm install
npm run dev

# For desktop (Electron)
npm run electron:dev
```

### Build & Package

```bash
# Desktop Applications
npm run package:win     # Windows (NSIS installer)
npm run package:mac     # macOS (DMG + ZIP)
npm run package:linux   # Linux (AppImage + DEB)

# Android Mobile App
cd web
npm run cap:sync:android
npm run build:desktop-renderer
```

## 📁 Architecture

### Repository Structure

```
Supru-AI/
├── bridge/                    # Node.js backend service
│   ├── src/                   # ~30 core modules
│   │   ├── cli.js             # Command-line interface
│   │   ├── daemon-cli.js      # Daemon mode startup
│   │   ├── task-launcher.js   # Task orchestration
│   │   ├── task-run-controller.js
│   │   ├── session-history.js # Session management
│   │   ├── worktree-manager.js
│   │   ├── agent-router.js
│   │   ├── acp-*.js           # ACP protocol support
│   │   └── ...more modules
│   ├── test/                  # Test suite
│   └── package.json           # Node 20+ dependencies
│
├── web/                       # React + TypeScript web application
│   ├── src/
│   │   ├── App.tsx            # Main React component
│   │   ├── components/        # React component library
│   │   ├── api.ts             # Backend API client
│   │   ├── agentRuns.ts
│   │   ├── backendSetup.ts
│   │   ├── desktopBridge.ts
│   │   ├── serverProfiles.ts
│   │   └── ...
│   ├── electron/              # Electron main process
│   ├── native-android/        # Capacitor Android layer
│   ├── scripts/               # Build utilities
│   ├── public/                # Static assets
│   └── package.json           # React + Vite + Electron deps
│
├── docs/                      # Documentation
│   ├── QUICK_START.md         # Quick setup guide
│   ├── DEPENDENCIES.md        # Dependency documentation
│   └── assets/                # Documentation images
│
├── .github/
│   ├── workflows/
│   │   ├── build.apk.yml      # Android APK build
│   │   ├── android-aab.yml    # Android AAB build
│   │   ├── desktop-apps.yml   # Desktop builds (Win/Mac/Linux)
│   │   ├── gh-pages.yml       # GitHub Pages deployment
│   │   └── ...
│   └── ISSUE_TEMPLATE/        # GitHub issue templates
│
└── package.json               # Root monorepo configuration
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Node.js, Express | API server, session management |
| **Web Frontend** | React 18, TypeScript, Vite | Desktop & mobile web UI |
| **Desktop** | Electron 43 | Windows, macOS, Linux apps |
| **Mobile** | Capacitor 8, React Native | Android/iOS support |
| **Build** | electron-builder, Vite | Packaging & optimization |
| **Testing** | Node.js Test Runner | Unit & integration tests |

### Data Flow

```
┌─────────────┐
│  Electron   │ (Desktop App)
│  / Browser  │
└──────┬──────┘
       │ HTTP + SSE
       ▼
┌──────────────────────┐
│  React App           │ (Web UI)
│  (web/src/App.tsx)   │
└──────┬───────────────┘
       │ API calls
       ▼
┌──────────────────────────┐
│  Bridge Backend          │ (Node.js)
│  (bridge/src/server.js)  │
└──────┬───────────────────┘
       │ CLI/System
       ▼
┌──────────────────────────┐
│  Copilot Agent / Tasks   │
│  (Git worktree mgmt)     │
└──────────────────────────┘
```

## 📋 API Overview

### Backend Endpoints

The bridge service exposes REST + SSE APIs:

- **Task Management:** Create, launch, monitor, and finish tasks
- **Session History:** Retrieve past sessions and run history
- **Profile Management:** Server and backend profiles configuration
- **Machine Registry:** Track connected machines and daemons
- **Real-time Events:** SSE streams for live task progress

See `web/src/api.ts` for full endpoint documentation.

## ✅ Testing

```bash
# Bridge tests
cd bridge
npm test

# Web UI regression tests
cd web
npm run test:ui           # Full UI regression
npm run test:settings     # Settings UI
npm run test:model        # Model selection
npm run test:events       # Event handling
npm run test:profiles     # Profile management
npm run test:markdown     # Markdown rendering
npm run test:attachments  # File attachment handling
npm run test:desktop      # Desktop-specific tests
```

## 🔧 Development Commands

### Bridge Service
```bash
cd bridge
npm run start              # Run CLI mode
npm run daemon             # Run daemon service
npm test                   # Run tests
```

### Web Application
```bash
cd web
npm run dev                # Development server (Vite)
npm run build              # Production build
npm run preview            # Preview production build
npm run electron:dev       # Run in Electron
npm run build:desktop      # Build desktop app
npm run build:desktop-renderer  # Build web for desktop
npm run build:electron     # Build Electron main process
npm run cap:sync          # Sync with Capacitor
```

## 📱 Platform-Specific Builds

### Windows
```bash
cd web
npm run package:win       # Creates NSIS installer
npm run package:win:dir   # Creates portable directory
```

### macOS
```bash
cd web
npm run package:mac       # Creates DMG + ZIP for Intel & Apple Silicon
```

### Linux
```bash
cd web
npm run package:linux     # Creates AppImage + DEB packages
```

### Android
```bash
cd web
npm run cap:add:android   # Initialize Android project
npm run cap:sync:android  # Sync web build to Android
npm run build:desktop-renderer  # Build with desktop mode
```

## 🐛 Troubleshooting

### Node Version Mismatch
```bash
# Verify Node version
node --version

# Use nvm to switch versions
nvm install 22
nvm use 22
```

### Dependencies Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Failures
```bash
# Clean build
npm run build -- --clean

# Check TypeScript
tsc -b
```

## 🤝 Contributing

1. **Create a feature branch** from `main`
2. **Use the issue template** for tracking progress
3. **Run tests** before submitting PRs
4. **Follow the existing code structure** and naming conventions
5. **Update documentation** for new features

### Issue Template
Use the `[PLAN]:` template in GitHub Issues to track:
- Screen/feature name and purpose
- Required package components (Layout, Logic, Navigation, API, Assets)
- File structure checklist

## 📦 Project Status

- **Phase 1 (In Progress):** Foundation - repository structure cleanup
- **Phase 2 (Planned):** Feature screens and mobile UI refinement
- **Phase 3 (Planned):** Advanced session management and analytics

See [Issues](https://github.com/younuspe/Supru-AI/issues) for detailed roadmap.

## 📄 License

This project is part of the Supru-AI ecosystem. See LICENSE file for details.

## 🔗 Resources

- [Quick Start Guide](./docs/QUICK_START.md)
- [Dependencies Documentation](./docs/DEPENDENCIES.md)
- [GitHub Issues](https://github.com/younuspe/Supru-AI/issues)

---

**Built with ❤️ for AI-driven development**
