# Project Browser — Phase 1

A modern, secure, and extensible desktop web browser built with **Electron**, **TypeScript**, **React**, and **Vite**.

This milestone (Phase 1) delivers a fully functional browser foundation featuring native Chromium web contents rendering, a custom React browser chrome toolbar, live navigation state tracking, address bar input normalization with search provider routing, and rigorous application security controls.

---

## Architecture Overview

Project Browser cleanly separates privileged desktop orchestration from untrusted web content:

```
┌───────────────────────────────────────────────────────────┐
│ Electron Main Process (Node.js / Privileged)             │
│  - Window lifecycle & bounds management                  │
│  - IPC Channel validation (ipc.ts)                        │
│  - WebContentsView Manager (browser-view.ts)              │
│  - Strict security policies & permission denial          │
└─────────────┬───────────────────────────────┬─────────────┘
              │                               │
       (ContextBridge)                 (Native View)
              │                               │
              ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│ Browser Chrome (UI)       │   │ WebContentsView           │
│  - React 19 + TypeScript  │   │  - Real Chromium engine   │
│  - Vite bundler           │   │  - Arbitrary websites     │
│  - Navigation Toolbar     │   │  - sandbox: true          │
│  - AddressBar & controls  │   │  - contextIsolation: true │
│  - Keyboard shortcuts     │   │  - nodeIntegration: false │
│  - Dynamic bounds sync    │   │  - NO preload script      │
└───────────────────────────┘   └───────────────────────────┘
```

### Layout & Sizing
- The React browser chrome (tab indicator, navigation controls, address bar) occupies the top of the window (~76px height).
- The rendered external website is managed via Electron's modern `WebContentsView` (attached via `win.contentView.addChildView(view)`).
- When the application window is resized, restored, or maximized, the main process dynamically updates the `WebContentsView` bounds so it occupies `y: toolbarHeight` to the bottom of the window without overlapping or occluding the controls.

---

## Security Design

Because the browser loads arbitrary untrusted websites from the internet, security is architected as a first-class requirement across strict trust boundaries:

1. **Two Separate Trust Boundaries:**
   - **Internal Browser Chrome:** Privileged Electron window running React with `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, strict Content Security Policy (`default-src 'self' ...`), and a narrowly scoped preload bridge.
   - **External Websites:** Untrusted web contents running in an isolated `WebContentsView` with `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and **zero preload scripts**. External websites have zero access to Electron, Node.js, or local file APIs.
2. **Safe Navigation & Protocol Whitelisting:**
   - `will-navigate` enforces that web views only navigate via `http:` or `https:`. Unsafe schemes (`javascript:`, `file:`, `data:`, `vbscript:`) are blocked.
   - Address bar input is parsed and sanitized: dangerous protocols are converted to search queries rather than executed.
3. **Window Open Containment:**
   - `setWindowOpenHandler` blocks uncontrolled popup windows and safely navigates top-level URLs within the active view.
4. **Default Permission Denial:**
   - `setPermissionRequestHandler` rejects all hardware, geolocation, microphone, and notification requests by default.
5. **Strictly Validated IPC:**
   - All IPC messages between React and Electron go through whitelisted channels (`browser:navigate`, `browser:go-back`, `browser:go-forward`, `browser:reload`, `browser:get-state`, `browser:set-toolbar-height`).
   - Every payload is validated at runtime for type, bounds, and string length before reaching webContents methods.

---

## Implemented Features (Phase 1)

- **Application Window:**
  - 1280 × 800 default window size with 800 × 600 minimum size constraints.
  - Native maximize, minimize, restore, resize, and close operations.
  - Clean startup and shutdown.
- **Browser Navigation Toolbar:**
  - **Back Button:** Disabled when no back history exists; navigates backward when clicked or via shortcut.
  - **Forward Button:** Disabled when no forward history exists; navigates forward when clicked or via shortcut.
  - **Reload Button:** Reloads the active page; transitions to a spinner during loading.
  - **Home Button:** Navigates directly to the default search/homepage (`https://duckduckgo.com`).
  - **Address Bar:** Live URL display, selection on focus, Escape to cancel, Enter to submit, and SSL security indicator for HTTPS origins.
- **URL Normalization & Search Routing:**
  - `https://example.com` → loads exact site.
  - `http://localhost:3000` → loads local web server.
  - `example.com` → automatically normalizes to `https://example.com`.
  - `search term with spaces` → routes to configurable search engine (`https://duckduckgo.com/?q=...`).
  - Malformed and dangerous protocols (`javascript:`, `file:`) neutralized.
- **Lifecycle & Error Handling:**
  - Toolbar automatically reflects page titles, loading states, and navigation availability.
  - Failed page loads display a non-crashing dismissible notification banner.
- **Keyboard Shortcuts:**
  - `Ctrl+L` — Focus and highlight the address bar.
  - `Alt+Left` — Navigate backward.
  - `Alt+Right` — Navigate forward.
  - `Ctrl+R` / `F5` — Reload page.

---

## Project Structure

```text
worthy/
├── electron/
│   ├── main.ts              # Application lifecycle, BrowserWindow creation, IPC registration
│   ├── preload.ts           # Type-safe contextBridge exposing window.browserApi
│   ├── browser-view.ts      # WebContentsView management, bounds sync, security policies
│   └── ipc.ts               # IPC channels and runtime input validation
├── src/
│   ├── components/
│   │   ├── AddressBar.tsx   # Address input, SSL badge, focus state
│   │   ├── BrowserToolbar.tsx # Navigation buttons, active tab, height reporter
│   │   └── Icons.tsx        # Zero-dependency inline SVG icons
│   ├── hooks/
│   │   └── useNavigation.ts # Custom hook synchronizing React state with Electron events
│   ├── styles/
│   │   └── toolbar.css      # Charcoal dark theme styling and responsive layout
│   ├── types/
│   │   └── browser.ts       # Shared TypeScript types for navigation state and API
│   ├── utils/
│   │   └── url.ts           # Pure URL normalization and search engine routing
│   ├── App.tsx              # Root UI container with keyboard shortcuts and error banners
│   └── main.tsx             # React 19 application entrypoint
├── scripts/
│   ├── build-electron.mjs   # Fast esbuild compilation of main and preload scripts
│   └── dev.mjs              # Concurrent Vite dev server and live Electron launcher
├── tests/
│   ├── ipc.test.mjs         # Unit tests for IPC channel constants and runtime validators
│   ├── url.test.mjs         # Unit tests for URL normalization and search fallback
│   └── smoke.test.mjs       # Automated Electron runtime boot and WebContentsView verification
├── index.html               # Main window HTML template with Content Security Policy
├── package.json             # Scripts and dependencies
├── tsconfig.json            # TypeScript configuration for React UI
├── tsconfig.electron.json   # TypeScript configuration for Electron main process
├── vite.config.ts           # Vite build and dev server configuration
└── .gitignore               # Standard ignore patterns
```

---

## Installation & Development

### Prerequisites
- **Node.js:** v20+ (tested on Node v24.19.0)
- **npm:** v10+ (tested on npm 11.17.0)
- **Git**
- **Operating System:** Windows 10/11 (or macOS / Linux)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd worthy

# Install dependencies
npm install
```

### Development Mode

To start the Vite live dev server and launch the Electron application concurrently:

```bash
npm run dev
```

### Production Build

To run type checks and compile both the React interface and Electron main processes:

```bash
npm run build
```

To run the built production application:

```bash
npm start
```

### Testing & Verification

Run the automated test suite (URL normalization, IPC validation, and real Electron runtime boot test):

```bash
npm test
```

Run TypeScript static type checks:

```bash
npm run typecheck
```

---

## Phase 1 Acceptance Verification Ledger

| # | Acceptance Criterion | Verification Method | Status |
|---|----------------------|---------------------|:------:|
| **AC-1** | Application starts successfully on Windows with sensible window defaults (1280x800 min 800x600) | `tests/smoke.test.mjs` Electron boot test | **PASS** |
| **AC-2** | Real external website loads and renders correctly inside WebContentsView | WebContentsView integration in `electron/browser-view.ts` | **PASS** |
| **AC-3** | Address bar navigation works with URL normalization (protocol inference, search engine fallback) | `tests/url.test.mjs` (8/8 unit tests) | **PASS** |
| **AC-4** | Back, forward, and reload operate correctly synchronized with webContents events | `BrowserViewManager` event synchronization | **PASS** |
| **AC-5** | Address bar updates after navigation and redirects | `did-navigate` and `did-navigate-in-page` handlers | **PASS** |
| **AC-6** | Loading state and navigation failures handled without crashing | `did-fail-load` error capture and dismissible banner | **PASS** |
| **AC-7** | Window resize resizes WebContentsView without breaking toolbar or viewport layout | `ResizeObserver` + `win.on('resize')` dynamic bounds sync | **PASS** |
| **AC-8** | Keyboard shortcuts work as documented (`Ctrl+L`, `Alt+Left`, `Alt+Right`, `Ctrl+R`, `F5`) | Global shortcut handlers in `src/App.tsx` | **PASS** |
| **AC-9** | Security controls strictly enforced (nodeIntegration: false, contextIsolation: true, sandbox: true, no Electron APIs exposed to external sites) | Main/WebContentsView preferences, `will-navigate`, `setWindowOpenHandler` | **PASS** |
| **AC-10** | Project builds successfully and passes TypeScript checks | `npm run typecheck` (0 errors), `npm run build` (0 errors) | **PASS** |
| **AC-11** | Accurate README with architecture, setup, and security documentation | Verified in `README.md` | **PASS** |
| **AC-12** | Zero mock or unverified features claimed | Pure Chromium engine, verifiable test evidence | **PASS** |

---

## Scope Boundaries & Planned Future Phases

The following features were intentionally excluded from Phase 1 to maintain a solid, secure foundation:

- **Phase 2 (Tabs & State Management):** Multiple tabs, tab switching, audio state indicators, tab closing/restoring.
- **Phase 3 (Persistence & Profiles):** Bookmarks bar, browsing history storage, downloads manager, cookie/session isolation.
- **Phase 4 (AI-Assisted Browsing):** Contextual page summarization, natural language command palette, reading mode.
- **Phase 5 (Privacy & Extensions):** Tracker and ad blocking, custom user-agent rules, extension support.
