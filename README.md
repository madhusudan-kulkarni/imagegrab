# ImageGrab

<p align="center">
  <img src="src/public/icon.svg" width="96" height="96" alt="ImageGrab Logo" />
</p>

<p align="center">
  <strong>Quickly save images from any webpage — single click, floating hover, or organized ZIP batch.</strong>
</p>

<p align="center">
  <a href="https://github.com/madhusudan-kulkarni/imagegrab/releases/latest"><img src="https://img.shields.io/github/v/release/madhusudan-kulkarni/imagegrab?display_name=release&logo=github" alt="Release"></a>
  <a href="https://github.com/madhusudan-kulkarni/imagegrab/releases/latest/download/imagegrab-chrome.zip"><img src="https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white" alt="Chrome MV3"></a>
  <a href="https://github.com/madhusudan-kulkarni/imagegrab/releases/latest/download/imagegrab-firefox.zip"><img src="https://img.shields.io/badge/Firefox-MV3-FF7139?logo=firefoxbrowser&logoColor=white" alt="Firefox MV3"></a>
  <a href="https://github.com/madhusudan-kulkarni/imagegrab/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/madhusudan-kulkarni/imagegrab/ci.yml?branch=main&label=CI" alt="CI"></a>
</p>

---

## ✨ Features

- ⚡ **Instant Capture**: Save individual images with one click via the right-click context menu or the non-destructive floating hover button.
- 📦 **One-Prompt ZIP Batch Download**: Package all selected images into a single `.zip` archive to prevent annoying browser download prompt cascades.
- 🔄 **Deep Scan (Auto-Scroll)**: Automatically scroll down dynamic pages (Pinterest, Instagram, Unsplash, Reddit, Twitter/X) to trigger and capture lazy-loaded images.
- 🎯 **Advanced Filters & Search**: Filter images by format (`JPG`, `PNG`, `WEBP`, `SVG`, `GIF`, `AVIF`), orientation (`Landscape`, `Portrait`, `Square`), or minimum resolution.
- 🔍 **Full-Resolution Lightbox**: Inspect full dimensions, file sizes, and high-res previews before downloading.
- 📋 **Card Quick Actions**: Direct 1-click buttons to copy image URLs to your clipboard or open full-size images in new tabs.
- 🛡️ **Non-Destructive Hover Button**: Rendered safely inside Shadow DOM with absolute coordinates — zero layout thrashing or host page DOM tampering.
- 🏷️ **Smart Filename Templates**: Interactive template builder with live real-time preview supporting:
  - `${domain}`, `${page_title}`, `${original_name}`, `${ext}`, `${timestamp}`, `${date}`, `${time}`, `${index}`, `${index_00}`
- 📁 **Organized Directory Structure**: Batch downloads automatically organized by domain and clean page titles (`ImageGrab/<domain>/<page_title>_<date>/`).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> | Open Batch Downloader modal | Any active webpage |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> / <kbd>Cmd</kbd> + <kbd>A</kbd> | Toggle Select All / Deselect All | Inside Batch Modal |
| <kbd>Enter</kbd> | Start ZIP batch download | Inside Batch Modal |
| <kbd>Esc</kbd> | Close preview lightbox or dismiss modal | Inside Batch Modal |

---

## 🚀 Development & Build

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)

### Start Development Server
```bash
# Install dependencies
pnpm install

# Run in Chrome with hot-reload
pnpm dev

# Run in Firefox with hot-reload
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
```
Release zip artifacts will be generated in `.output/`:
- `.output/imagegrab-chrome.zip`
- `.output/imagegrab-firefox.zip`

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).
