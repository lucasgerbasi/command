# ⌘ Command

Your personal desktop command center. One window, everything you need.

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Live overview — tasks, today's events, recent clipboard, notes, bookmarks |
| **Clipboard History** | Auto-captures copied text, searchable, pin favourites |
| **Quick Launcher** | Type an alias (e.g. `gh`, `mail`) → opens in browser |
| **Tasks** | Minimal daily task list with completion tracking |
| **Notes** | Fast persistent notes with auto-save |
| **Quick Links** | Click-to-open grid of favourite websites |
| **Bookmarks** | Launch apps or websites, organised by category |
| **Calendar** | Lightweight daily planner |

## Setup

### Requirements
- [Node.js](https://nodejs.org) v18 or later
- npm (comes with Node)

### Install & Run

```bash
# 1. Clone or download this folder
cd command

# 2. Install dependencies
npm install

# 3. Start the app
npm start
```

### Development mode (with DevTools)
```bash
npm run dev
```

## Building a distributable

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Outputs go into the `dist/` folder.

## Keyboard Shortcut

**Ctrl+Shift+Space** — Show/hide Command from anywhere

## Data storage

All your data is stored locally in:
- **Windows:** `%APPDATA%\command\data\`
- **macOS:** `~/Library/Application Support/command/data/`
- **Linux:** `~/.config/command/data/`

JSON files, easy to back up.

## Project structure

```
command/
├── main/
│   ├── index.js       ← Electron main process, IPC, clipboard watcher
│   └── preload.js     ← Secure bridge to renderer
├── renderer/
│   ├── index.html     ← App shell
│   ├── css/main.css   ← Dark gold theme
│   └── js/
│       ├── app.js              ← Core: routing, navigation, utils
│       └── modules/
│           ├── dashboard.js
│           ├── clipboard.js
│           ├── launcher.js
│           ├── tasks.js
│           ├── notes.js
│           ├── links.js
│           ├── bookmarks.js
│           └── calendar.js
├── assets/            ← Icons (add icon.png / icon.ico here)
└── package.json
```

## Adding an icon

Drop these files into `assets/`:
- `icon.png` (256×256 or 512×512, for Linux and general use)
- `icon.ico` (Windows)
- `icon.icns` (macOS)

## Auto-launch on startup

Startup is enabled by default via Electron's `setLoginItemSettings`. To disable it, remove or comment out those lines in `main/index.js`.
