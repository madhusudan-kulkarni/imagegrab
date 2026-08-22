# Changelog

All notable changes to the **ImageGrab** browser extension are documented in this file.

---

## [1.1.0] - 2026-08-22

### Added
- **ZIP Batch Packaging**: Download all selected images as a single `.zip` archive to prevent multiple browser save prompt dialogs.
- **Deep Scan (Auto-Scroll)**: Added "Scan More" action in batch modal to smoothly scroll dynamic feeds (Pinterest, Instagram, Reddit, Unsplash) and capture lazy-loaded images.
- **Orientation & Shape Filters**: Added one-click filter chips for `Landscape`, `Portrait`, and `Square` images in the batch modal.
- **Card Quick Actions**: Quick buttons on each card to copy high-res image URLs to clipboard or open images in a new browser tab.
- **Full-Resolution Lightbox**: Click preview on any image card to inspect full resolution and dimensions before downloading.
- **Global Keyboard Shortcut**: Added `Alt + Shift + I` (or `Option + Shift + I`) to immediately trigger the Batch Image Downloader on the active tab.
- **Modal Hotkeys**: `Ctrl + A` / `Cmd + A` to toggle select all, `Enter` to start ZIP download, and `Esc` to close lightbox/modal.
- **Interactive Filename Builder**: Clickable token chips (`${domain}`, `${timestamp}`, `${original_name}`, `${ext}`, `${index}`, `${index_00}`, `${page_title}`) and a real-time live preview box in the settings popup.
- **Smart Folder Organization**: Batch downloads are automatically grouped by domain and clean page title (`ImageGrab/<domain>/<page_title>_<date>/`).
- **Hover Button Modifier Key**: Option to require holding `Alt` or `Ctrl` key before showing the hover save button.

### Changed
- **Non-Destructive Hover Button**: Replaced host DOM wrapping with a floating overlay inside Shadow DOM, completely eliminating host page layout breakages.
- **Batch Download Logic**: Batch downloads now strictly follow the user's custom `filenameTemplate`.
- **Extension Extraction Engine**: Added support for CDN query parameters (`?format=webp`, `?fm=jpg`), data URIs, and `<picture>` source elements.
- **OS-Safe Sanitization**: Enhanced filename sanitization to strip illegal characters (`/ \ : * ? " < > |`) and prevent Windows 255-character path overflows.

### Fixed
- Fixed background service worker `Unchecked runtime.lastError: Cannot create item with duplicate id` console warnings on startup and reload.
- Fixed multiple save prompt dialog lockup when downloading batches in browsers with "Ask where to save each file" enabled.
- Fixed cross-origin image download blocks by adding `host_permissions: ['<all_urls>']` in Manifest V3.

---

## [1.0.2] - 2026-02-15

### Added
- Filename template customization via popup.
- Batch subfolder download option.

---

## [1.0.1] - 2026-02-10

### Added
- Context menu support for single image and page image downloads.
- Hover overlay button on large images.

---

## [1.0.0] - 2026-02-01

### Added
- Initial release of ImageGrab with basic single image and batch scraping capabilities.
