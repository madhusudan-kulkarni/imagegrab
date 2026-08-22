# ImageGrab

<p align="center">
  <img src="public/icon.svg" width="96" height="96" alt="ImageGrab Logo" />
</p>

<p align="center">
  <strong>Fast, smart, and privacy-first browser extension to capture, inspect, and batch download images from any webpage.</strong>
</p>

<p align="center">
  <a href="https://addons.mozilla.org/en-US/firefox/addon/image-grab/"><img src="https://img.shields.io/badge/Firefox_Add--on-Get_ImageGrab-FF7139?style=flat&logo=firefoxbrowser&logoColor=white" alt="Firefox Add-on"></a>
  <a href="https://github.com/madhusudan-kulkarni/image-grab/releases/latest"><img src="https://img.shields.io/github/v/release/madhusudan-kulkarni/image-grab?display_name=release&logo=github" alt="Release"></a>
  <a href="https://github.com/madhusudan-kulkarni/image-grab/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/madhusudan-kulkarni/image-grab/ci.yml?branch=main&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License"></a>
</p>

---

## 📖 About ImageGrab

**ImageGrab** is a modern, lightweight, and privacy-first browser extension designed to eliminate the frustration of saving images on the web. 

Traditional browser saving is painful: you have to right-click individual images one by one, manually rename them, struggle with lazy-loaded image galleries (like Pinterest, Unsplash, or Instagram), and suffer through dozens of intrusive browser download popups when trying to save multiple files.

**ImageGrab solves all of this:**
* 🎯 **Zero-Friction Single Capture**: Hover over any image to save it instantly with a discreet floating button.
* 📦 **One-Click ZIP Packaging**: Batch download hundreds of images bundled into a single organized `.zip` file—triggering just **one single download prompt**.
* 🔄 **Smart Deep Scan**: Auto-scrolls dynamic, infinite-scrolling pages to wake up lazy-loaded images that standard scrapers miss.
* 🔒 **100% Private & Local**: Zero tracking, zero telemetry, zero analytics, and zero external servers. All DOM parsing, image fetching, and ZIP compression happen strictly inside your browser.

---

## ⚡ Installation

### 🦊 Firefox
Install directly from the official Mozilla Add-ons store:
👉 **[Get ImageGrab on Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/image-grab/)**

### 🌐 Google Chrome & Chromium (Edge, Brave, Opera)
1. Download `imagegrab-chrome.zip` from the latest **[GitHub Release](https://github.com/madhusudan-kulkarni/image-grab/releases/latest)**.
2. Unzip the downloaded file to a folder.
3. Open `chrome://extensions/` (or `edge://extensions/`) and toggle **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.

---

## ✨ Features

- ⚡ **Instant Hover Capture**: A subtle, non-destructive hover button rendered in isolated Shadow DOM—zero layout shifts or host page DOM pollution. Customize trigger keys (Direct hover, Hold <kbd>Alt</kbd>, or Hold <kbd>Ctrl</kbd>).
- 📦 **ZIP Batch Downloader**: Select all or specific images and package them into a structured `.zip` archive without browser prompt cascades.
- 🔄 **Deep Page Scanner**: Automated deep-scrolling engine captures lazy-loaded photos on Pinterest, Unsplash, Reddit, Twitter/X, and Instagram.
- 🎯 **Multi-Format & Resolution Filters**: Instantly filter by format (`JPG`, `PNG`, `WEBP`, `SVG`, `GIF`, `AVIF`), orientation (`Landscape`, `Portrait`, `Square`), or minimum resolution dimensions.
- 🔍 **Full-Resolution Lightbox**: Click any image in the batch viewer to inspect full dimensions, file sizes, and high-res previews before saving.
- 📋 **Card Quick Actions**: Direct 1-click buttons to copy direct image URLs to your clipboard or open full-size images in new tabs.
- 🏷️ **Dynamic Filename Templating**: Customize your download naming convention with real-time live preview.
- 📁 **Organized Directory Structure**: Automatically structures downloads into clean, organized subfolders: `ImageGrab/<domain>/<page_title>_<date>/`.

---

## 🏷️ Filename Template Tokens

Customize your download naming format in the popup settings:

| Token | Description | Example Output |
|---|---|---|
| `${domain}` | Current website domain | `unsplash.com` |
| `${page_title}` | Sanitized title of the webpage | `nature-wallpapers` |
| `${original_name}` | Original filename extracted from URL | `photo-sunset` |
| `${ext}` | Clean file extension | `jpg` / `png` / `webp` |
| `${timestamp}` | ISO-friendly date & time stamp | `2026-08-22_215811` |
| `${date}` | Current date formatted as YYYY-MM-DD | `2026-08-22` |
| `${time}` | Current time formatted as HHMMSS | `215811` |
| `${index}` | Sequential item index | `1`, `2`, `3` |
| `${index_00}` | Zero-padded 3-digit sequence index | `001`, `002`, `003` |

*Default Template*: `${domain}_${timestamp}_${index}.${ext}`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> | Open Batch Downloader modal | Any active webpage |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> / <kbd>Cmd</kbd> + <kbd>A</kbd> | Toggle Select All / Deselect All | Inside Batch Modal |
| <kbd>Enter</kbd> | Start ZIP batch download | Inside Batch Modal |
| <kbd>Esc</kbd> | Close preview lightbox or dismiss modal | Inside Batch Modal |

---

## 🛠️ Development & Build

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)

### Setup
```bash
# Clone the repository
git clone https://github.com/madhusudan-kulkarni/image-grab.git
cd image-grab

# Install dependencies
pnpm install
```

### Development Server
```bash
# Run Chrome extension with hot reload
pnpm dev

# Run Firefox extension with hot reload
pnpm dev:firefox
```

### Production Build & Packaging
```bash
# Build production bundles
pnpm build
pnpm build:firefox

# Create distributable release ZIPs
pnpm zip
pnpm zip:firefox

# Submit directly to Mozilla Add-ons (requires API keys)
FIREFOX_JWT_ISSUER="user:..." FIREFOX_JWT_SECRET="..." pnpm submit:firefox
```

Release ZIP artifacts are generated under `.output/`:
- `.output/imagegrab-chrome.zip` (Chrome Web Store / Chromium)
- `.output/imagegrab-firefox.zip` (Mozilla Add-ons)
- `.output/imagegrab-1.1.0-sources.zip` (AMO compliance source archive)

---

## 🔗 Links & Resources

- 🦊 **Firefox Add-on Store**: [addons.mozilla.org/en-US/firefox/addon/image-grab](https://addons.mozilla.org/en-US/firefox/addon/image-grab/)
- 💻 **GitHub Repository**: [github.com/madhusudan-kulkarni/image-grab](https://github.com/madhusudan-kulkarni/image-grab)
- 🐛 **Issue Tracker**: [github.com/madhusudan-kulkarni/image-grab/issues](https://github.com/madhusudan-kulkarni/image-grab/issues)
- 📦 **Releases**: [github.com/madhusudan-kulkarni/image-grab/releases](https://github.com/madhusudan-kulkarni/image-grab/releases)

---

## 📄 License
This project is open-source software licensed under the [ISC License](LICENSE).

