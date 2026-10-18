# Eclipse Browser

**An AI-assisted desktop browser exploring agentic engineering, iterative development, and modern interface design.**

Eclipse is an experimental, production-grade desktop browser built with **Electron**, **Chromium**, **TypeScript**, **React**, and **Vite**. The project explores how autonomous AI coding agents can accelerate software engineering when guided by deliberate architecture, structured contracts, iterative implementation, and rigorous human-led evaluation.

Rather than treating AI-generated code as a disposable prototype or unvetted output, Eclipse emphasizes architectural discipline, technical verification, and continuous refinement—turning rapid agentic engineering into an opportunity to master desktop application architecture, Chromium integration, and secure systems design.

---

### Project Philosophy

- **AI-Assisted Development:** Employ coding agents to accelerate implementation, prototype complex subsystems, and explore alternative architectural solutions.
- **Agentic Engineering:** Structure agent workflows around explicit specifications, incremental tasks, tool-assisted execution, and verifiable outcomes backed by automated test suites.
- **Human-Guided Decisions:** Retain deliberate control over architecture, feature scope, security boundaries, and design direction.
- **Iterative Experimentation:** Build, execute, test, evaluate, and refine features in atomic increments with persistent version control.
- **Engineering Through Practice:** Explore real-world desktop application challenges: multi-process lifecycle management, `WebContentsView` bounds synchronization, local persistence, IPC security, and custom UI design systems.

---

## Visual Identity: Gothic Obsidian

Eclipse introduces a restrained, gothic-inspired dark design system crafted for deep focus, contrast clarity, and aesthetic distinction.

| Token | Hex Value | Semantic Purpose |
|---|---|---|
| **Obsidian Black** | `#101312` | Root window chrome, active tab background, deep backdrop |
| **Ash Grey** | `#202522` | Navigation toolbar, settings panels, tab sidebar, menus |
| **Arsenic Grey** | `#777F79` | Secondary text, subtle borders, inactive control outlines |
| **Arsenic Green** | `#3F8F68` | Primary accent, active tab indicators, focus rings |
| **Badge Green** | `#8DC9A6` | Status highlights, verified HTTPS security pills, badges |
| **Bone White** | `#E2E6E2` | High-legibility primary typography |

### Themes & Customization
- **Theme Modes:** Obsidian Dark (default), Bone Light, and Follow System (`prefers-color-scheme`).
- **Restrained Accents:** Arsenic Green, Ash Grey, and Badge Green.
- **Viewport Isolation:** The website viewport remains completely pristine and isolated from Eclipse's browser chrome. Eclipse never injects arbitrary styles into external web content.

---

## Architecture & Engineering

```
┌────────────────────────────────────────────────────────────────────────┐
│               Electron Main Process (Node.js Privileged)               │
│  - Application lifecycle & native window management (1280x800)         │
│  - IPC Channel validation with runtime payload schemas (ipc.ts)         │
│  - Settings Store: Atomic local JSON persistence (settings-store.ts)   │
│  - Downloads Manager: Electron session will-download tracking           │
│  - Privacy Controller: Cache, cookies, and local session data clearing  │
│  - WebContentsView Manager: Dynamic layout bounds & visibility sync    │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
             (ContextBridge)                  (Native View)
                    │                                │
                    ▼                                ▼
┌───────────────────────────────────────┐  ┌─────────────────────────────┐
│  Browser Chrome (React 19 + Vite)     │  │ Isolated WebContentsView    │
│  - Dedicated Vertical Tab Sidebar     │  │  - Real Chromium engine     │
│  - Navigation Toolbar & Address Bar   │  │  - External arbitrary web   │
│  - Settings Center Modal (Ctrl+,)     │  │  - sandbox: true            │
│  - Dynamic Theme & Accent Engine      │  │  - contextIsolation: true   │
│  - Keyboard shortcuts & error banners │  │  - nodeIntegration: false   │
│  - Zero privileged Node/Electron APIs │  │  - Zero preload scripts     │
└───────────────────────────────────────┘  └─────────────────────────────┘
```

### Core Systems

1. **Chromium WebContentsView Integration:**
   - External websites render inside native `WebContentsView` instances managed strictly from the main process.
   - Dynamic bounds calculation coordinates seamlessly with React's vertical tab sidebar (240px) and top toolbar (44px) on window resize, restore, or maximize.
   - When the React Settings Center modal is opened, the active `WebContentsView` is hidden to prevent native viewport z-index occlusion.

2. **Vertical Tab Management:**
   - Dedicated left tab sidebar for clean, scalable navigation.
   - Tab status indicators (loading spinners, titles, close actions, and new tab triggers via `Ctrl+T` / `Ctrl+W`).

3. **Persistent Settings Center (`Ctrl+,`):**
   - **Appearance:** Toggle Obsidian Dark, Bone Light, or Follow System themes; select from 3 restrained accents.
   - **General:** Configure custom homepage and browser startup destinations.
   - **Search Engine:** Choose default search provider (DuckDuckGo, Google, Bing) or configure a custom template with `%s`.
   - **Privacy & Security:** Zero-trust site permission defaults (camera, microphone, geolocation blocked by default). One-click browsing data clearance for cache, cookies, and local storage.
   - **Session Downloads:** Real-time download tracker with status states, received byte metrics, folder revelation, and cancellation.
   - **About:** Live runtime telemetry (Eclipse, Chromium, Electron, Node.js, OS).

4. **Zero-Trust Security Perimeter:**
   - `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` enforced on all renderer and web contents.
   - Strict Content Security Policy (CSP).
   - Typed, validated IPC handlers rejecting malformed payloads, excessive strings, or unknown channels.
   - Neutralization of unsafe protocols (`javascript:`, `file:`, `data:`).

---

## Technology Stack

- **Electron:** Desktop application lifecycle and privileged process management.
- **Chromium:** Real web content rendering and engine isolation.
- **TypeScript:** Strict end-to-end type safety and typed IPC contracts.
- **React 19:** Modular, reactive browser interface and settings UI.
- **Vite:** High-speed development server and optimized bundle generation.
- **Node.js Test Runner:** Fast, zero-dependency unit and integration testing.

---

## Quickstart

### Prerequisites
- **Node.js:** v20+ (tested on Node v24.19.0)
- **npm:** v10+ (tested on npm 11.17.0)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/Himanshub0/Eclipse.git
cd Eclipse

# Install dependencies
npm install
```

### Running in Development

```bash
# Start Vite development server & launch Electron with live HMR
npm run dev
```

### Production Build & Launch

```bash
# Run type checks and build both UI and Electron bundles
npm run build

# Launch the production browser
npm start
```

### Verification & Testing

```bash
# Run automated test suite (URL normalization, IPC validation, settings, and boot smoke tests)
npm test

# Run TypeScript typecheck across renderer and main process
npm run typecheck
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + L` / `Cmd + L` | Focus and highlight the address bar |
| `Ctrl + T` / `Cmd + T` | Open a new tab |
| `Ctrl + W` / `Cmd + W` | Close the active tab |
| `Ctrl + ,` / `Cmd + ,` | Open / close Settings Center |
| `Alt + Left` | Navigate back in history |
| `Alt + Right` | Navigate forward in history |
| `Ctrl + R` / `F5` | Reload the current page |
| `Escape` | Stop loading current page / Close modal |

---

## Project Status

Eclipse is under active, iterative development. Architecture, capabilities, and interface design are continuously evolved through deliberate engineering, experimental validation, and measurable proof.

**Development Approach:** AI-assisted, human-directed, and iteration-driven.
