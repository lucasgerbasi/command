# ⌘ Command



### ⌘ Command: Personal Desktop Command Center



Command is a keyboard-first, all-in-one desktop dashboard designed to bridge the gap between your thoughts and your operating system. Built with Electron, it serves as a "digital cockpit" that consolidates your tasks, notes, files, and system vitals into a single, high-performance interface.



### Philosophy: Made for Me, Built for You



Command was born out of a personal need to reduce the "mental tax" of switching between dozens of apps just to check a calendar, start a timer, or find a snippet of code. This project was crafted with love to solve my own forgetfulness and workflow friction.



Because it is a personal tool, some defaults are opinionated, for example, the "Daily Reset" occurs at 8:00 AM because that’s when my day actually starts, not at midnight. However, the entire system is designed to be a canvas. Whether it's the dark-gold aesthetic or the core logic, Command is meant to be hacked, tweaked, and customized to fit your specific life.



---



## Features



### Modules



| Module | Description |

|--------|-------------|

| **Dashboard** | Live overview with interactive panels. Complete tasks, toggle habits, copy clips, roll dice, run the pomodoro timer, and more without leaving the dashboard. Fully customisable: add/remove any module, resize panels (1×1 up to 4×2), drag to reorder, save named templates (Work, Morning, Focus, etc.) |

| **Clipboard History** | Auto-captures every copied text. Search, pin favourites, click to re-copy. Capped at 50 items |

| **Quick Launcher** | Type an alias (`gh`, `mail`) and press Enter to open in browser. Also a full command palette, see *Launcher commands* below |

| **Tasks** | Todo list with priority levels (🔴 High / 🟡 Medium / 🔵 Low), drag-to-reorder, sort by priority or alphabetically, separate active/done sections |

| **Notes** | Two-pane editor with auto-save. Drag notes to reorder |

| **Bookmarks** | Launch apps or open websites, organised by category. Drag cards to reorder |

| **Calendar** | Lightweight monthly planner with a day sidebar for adding and viewing events |

| **Weather** | 7-day forecast via Open-Meteo (free, no API key). Configure your city once |

| **Reminders** | Set reminders by fixed time, recurring schedule (daily / weekdays / weekly / monthly), deadline warning (fires N minutes before a due time), or inactivity (fires when you open the app after being away). Drag to reorder |

| **Habits** | Daily habit tracker with priority levels, drag-to-reorder, progress bar. Resets automatically each day |

| **World Clocks** | Add any timezone by IANA name or abbreviation (EST, PST…). First clock is always local |

| **Pomodoro** | Focus timer with configurable work/break durations. Persists across navigation |

| **Timers** | Stopwatch and countdown timer. Both persist and tick while you navigate other modules |

| **Unit Converter** | Length, weight, temperature, and live currency (ECB rates via frankfurter.app) |

| **Calculator** | Type any expression and press Enter. Result is copied to clipboard. Live preview as you type. Supports `+`, `-`, `*`, `/`, `%`, `^` |

| **Mood Tracker** | Log daily mood (1–5) with an optional note. Before-8am entries count as yesterday. Click any past day to edit. 7-day average in stats |

| **Randomizer** | Dice roller (d4–d20), coin flip, number range, pick from list |

| **System Monitor** | Live CPU %, RAM usage, uptime, hostname, architecture |

| **Folders** | Recent folders pulled from OS-level activity (Windows: shell shortcuts) |

| **Text Templates** | Save reusable text snippets with tags. Click to copy |

| **Sync** | Export all your data to a single JSON file. Import (merge or overwrite) on another machine. No server, no account |



---



### Launcher commands



Open the command palette with `Ctrl+Space`. Commands are guided step-by-step, type the command name, press Enter, then fill in each prompt:



| Command | What it does |

|---------|-------------|

| `task` | Add a task directly to your task list |

| `note` | Create a new note |

| `remind` | Set a reminder, prompted for time (`in 15m`, `at 3pm`, `tomorrow`) then content |

| `calc` | Evaluate a math expression, copies result to clipboard |

| `timer` | Start a countdown (`10m`, `1h30m`, `45s`), fires a notification when done |

| `find` | Full-text search across tasks, notes, bookmarks, clipboard, templates, shows highlighted match snippets and exact location in notes |

| `open` | Launch a bookmark by name (fuzzy match) |

| `focus` | Start a pomodoro session, optionally with a custom duration |

| `copy` | Copy any text to clipboard instantly |

| `mood` | Log today's mood score (1–5) with optional note |

| `habit` | Log a habit as done today by name (fuzzy match) |

| `clear` | Bulk delete: `tasks`, `done`, or `clipboard` |

| `go` | Navigate to any module by name |



Type any alias you've configured to open it directly, without pressing Enter.



---



## Keyboard shortcuts



| Shortcut | Action |

|----------|--------|

| `Ctrl+Shift+Space` | Show / hide the Command window from anywhere |

| `Ctrl+Space` | Open the launcher command palette |

| `Esc` | Close launcher / step back in a multi-step command |

| `↑ ↓` | Navigate launcher results |

| `↵` | Run command / open selected result |



---



## 🛠 Architecture & Stack



| Component | Technology | Description |

| --- | --- | --- |

| **Framework** | Electron | Cross-platform desktop environment. |

| **Frontend** | Vanilla JS / CSS | High-performance UI with custom Syne & JetBrains Mono typography. |

| **Hardware IPC** | Node.js `os` | Real-time system monitoring without the bloat. |

| **External APIs** | Open-Meteo | Free, keyless 7-day weather forecasting. |



---



## 📥 Setup & Build



### Prerequisites



* **Node.js** v18 or higher

* **npm** (bundled with Node)



### 1. Install & Run



```bash

git clone https://github.com/lucasgerbasi/command.git

cd command

npm install

npm start



```



### 2. Package for Desktop



To create a permanent installer (e.g., a standalone `.exe` or `.dmg`):



```bash

npm run build



```



Packaged installers will appear in the `dist/` folder.



---



## Data storage



Everything is stored locally:



| Platform | Path |

|----------|------|

| Windows | `%APPDATA%\command\data\` |

| macOS | `~/Library/Application Support/command/data/` |

| Linux | `~/.config/command/data/` |



Plain JSON files. Easy to back up manually, or use the built-in Sync module to export/import a full bundle.



**Data files:**



```

clipboard.json          tasks.json              notes.json

bookmarks.json          calendar.json           launcher.json

templates.json          reminders.json          habits.json

moods.json              weather-config.json     clocks-config.json

pomo-config.json        dashboard-config.json   dashboard-templates.json

sidebar-order.json      recent-folders.json

```



---



## Project structure



```

command/

├── main/

│   ├── index.js          ← Electron main process, IPC handlers, clipboard watcher,

│   │                       safe math evaluator, sync export/import, OS folder tracking

│   └── preload.js        ← Secure contextBridge API exposed to renderer

├── renderer/

│   ├── index.html        ← App shell, sidebar nav, launcher overlay, modal

│   ├── css/main.css      ← Dark gold theme, animations, drag states

│   └── js/

│       ├── app.js        ← Core: routing, launcher command palette, reminder checker,

│       │                   sidebar drag-reorder, shared Utils (makeDraggableList, etc.)

│       └── modules/

│           ├── dashboard.js     ← Interactive panels, templates, live timer tick

│           ├── tasks.js         ← Priority levels, drag reorder, sort modes

│           ├── habits.js        ← Daily tracker, priority, progress bar

│           ├── notes.js         ← Two-pane editor, drag reorder

│           ├── bookmarks.js     ← App/web launcher, categories, drag reorder

│           ├── reminders.js     ← Fixed, recurring, deadline, inactivity types

│           ├── calendar.js      ← Monthly grid + day planner

│           ├── clipboard.js     ← History, search, pin

│           ├── launcher.js      ← Alias manager

│           ├── templates.js     ← Text snippet library

│           ├── moods.js         ← Daily mood log, history, edit past entries

│           ├── pomodoro.js      ← Focus timer, persists across navigation

│           ├── timers.js        ← Stopwatch + countdown, persists across navigation

│           ├── converter.js     ← Length, weight, temperature, live currency

│           ├── calculator.js    ← Expression evaluator (sandboxed via IPC)

│           ├── weather.js       ← 7-day forecast, Open-Meteo API

│           ├── clocks.js        ← World clocks, timezone support

│           ├── sysmon.js        ← CPU, RAM, uptime

│           ├── files.js         ← Recent OS folders

│           ├── random.js        ← Dice, coin, number, list picker

│           └── sync.js          ← Export / import data bundle

├── assets/               ← Drop icon files here

└── package.json

```



---



## Auto-launch on startup



Enabled by default via Electron's `setLoginItemSettings`. To disable, find and remove or comment out those lines in `main/index.js`.



---



## Security



- Renderer runs in a sandboxed process (`sandbox: true`), no Node.js access

- `contextIsolation: true`, `nodeIntegration: false`

- Content Security Policy restricts scripts to `'self'` only and network requests to the two weather/currency APIs

- All IPC data keys are whitelisted, arbitrary file reads/writes via IPC are blocked

- Math evaluation runs in the main process (not `eval` in renderer) with an expression whitelist

- `open-url` IPC validates protocol (http/https only, no `javascript:`, no `file://`)

- Path traversal guard on `open-path`



---



*Built with Electron · Open-Meteo · frankfurter.app*