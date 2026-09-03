# PC Health Console

A real-time PC health, driver, performance, and cleanup console for Windows, built with Electron + React.

Everything shown is read live from the machine it runs on — real CPU/RAM/GPU/OS specs, real installed drivers (via WMI), real startup programs and services, real disk health, and real temp/cache file sizes. Nothing is invented or simulated.

- **Drivers** — enumerates installed hardware and flags outdated/missing/unsigned drivers with a link to the real vendor support page. No fake version numbers, no auto-install.
- **Performance** — boot uptime, startup programs (enable/disable), idle services, disk health.
- **Cleanup** — scans real temp/cache/log/update-leftover locations; deletions go to the Recycle Bin (reversible), except emptying the Recycle Bin itself, which is clearly labeled permanent.
- **Activity Log** — a real, persisted log of every change the app has made, with rollback where reversible.

Some checks (driver/service enumeration, disk health, changing a service's startup type) need administrator access — the app will prompt for it via a normal Windows UAC dialog.

## Prerequisites

- Windows 10 or 11
- [Node.js](https://nodejs.org/) 18 or later (includes npm)

## Install

```bash
git clone https://github.com/melojules/pc-health-console.git
cd pc-health-console
npm install
```

## Run in development

```bash
npm run dev
```

This starts the Vite dev server and opens the Electron window pointed at it, with hot reload for UI changes.

## Build a distributable

```bash
npm run build
```

Builds the React renderer and packages a Windows installer via `electron-builder` into `dist/`.

## Verify the data services headlessly

To sanity-check that every service is returning real, correct data for the current machine without launching the UI:

```bash
npm run verify:services
```
