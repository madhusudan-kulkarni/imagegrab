import { settings, ScrapedImage, BatchDownloadMode, HoverKeyModifier } from '~/utils/storage';
import { getFileExtension, getOriginalName } from '~/utils/filename';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let hoverOverlayEnabled = await settings.hoverOverlayEnabled.getValue();
    let minHoverSize = await settings.minHoverSize.getValue();
    let batchDownloadMode = await settings.batchDownloadMode.getValue();
    let hoverKeyModifier = await settings.hoverKeyModifier.getValue();

    // Watch for reactive settings updates
    settings.hoverOverlayEnabled.watch((val) => {
      hoverOverlayEnabled = Boolean(val);
      if (!hoverOverlayEnabled) {
        hoverController.hide();
      }
    });

    settings.minHoverSize.watch((val) => {
      minHoverSize = Number(val) || 150;
    });

    settings.batchDownloadMode.watch((val) => {
      batchDownloadMode = val as BatchDownloadMode;
    });

    settings.hoverKeyModifier.watch((val) => {
      hoverKeyModifier = val as HoverKeyModifier;
    });

    const ui = await createShadowRootUi(ctx, {
      name: 'imagegrab-ui-root',
      position: 'inline',
      anchor: 'html',
      onMount: (container) => {
        // Inject styles directly into shadow root
        const style = document.createElement('style');
        style.textContent = getShadowStyles();
        container.appendChild(style);

        const modal = createBatchModal(
          container,
          () => batchDownloadMode,
          async (selected, mode, onProgress) => {
            onProgress(1, selected.length, 'Preparing images...');
            const msgType = mode === 'zip' ? 'download-batch-zip' : 'download-batch';
            const res = await browser.runtime.sendMessage({
              type: msgType,
              images: selected,
              pageTitle: document.title || '',
            });
            if (res && res.ok === false) {
              throw new Error(res.error || 'Failed to download images.');
            }
          },
          async (onProgress) => {
            return await performDeepScan(onProgress);
          }
        );

        const hoverBtn = createFloatingHoverButton(container, async (src, width, height) => {
          await browser.runtime.sendMessage({
            type: 'download-image',
            src,
            pageTitle: document.title || '',
            width,
            height,
          });
        });

        const onMessage = (message: { type?: string }) => {
          if (message.type === 'open-batch-modal') {
            const images = scrapeImages();
            modal.open(images);
          }
        };

        browser.runtime.onMessage.addListener(onMessage);

        return { modal, hoverBtn, onMessage };
      },
      onRemove: (mounted) => {
        if (!mounted) return;
        browser.runtime.onMessage.removeListener(mounted.onMessage);
        mounted.modal.destroy();
        mounted.hoverBtn.destroy();
      },
    });

    ui.mount();

    // Floating hover controller attached safely without DOM mutation
    const hoverController = setupHoverTracker(
      () => hoverOverlayEnabled,
      () => minHoverSize,
      () => hoverKeyModifier,
      (imgInfo, rect) => {
        if (ui.mounted) {
          ui.mounted.hoverBtn.show(imgInfo, rect);
        }
      },
      () => {
        if (ui.mounted) {
          ui.mounted.hoverBtn.hide();
        }
      }
    );
  },
});

/* ==========================================================================
   IMAGE SCRAPING ENGINE
   ========================================================================== */

function calculateOrientation(width: number, height: number): 'landscape' | 'portrait' | 'square' {
  if (!width || !height) return 'square';
  const ratio = width / height;
  if (ratio > 1.2) return 'landscape';
  if (ratio < 0.83) return 'portrait';
  return 'square';
}

function scrapeImages(): ScrapedImage[] {
  const results: ScrapedImage[] = [];
  const seen = new Set<string>();

  const addImage = (
    src: string | null | undefined,
    width: number,
    height: number,
    alt: string = ''
  ) => {
    if (!src || typeof src !== 'string') return;
    const trimmed = src.trim();
    if (!trimmed || trimmed.startsWith('javascript:')) return;

    let href = trimmed;
    if (!trimmed.startsWith('data:') && !trimmed.startsWith('blob:')) {
      try {
        href = new URL(trimmed, window.location.href).href;
      } catch {
        return;
      }
    }

    if (seen.has(href)) return;
    seen.add(href);

    const ext = getFileExtension(href);
    const originalName = getOriginalName(href);
    const format = ext.toUpperCase();
    const cleanW = Math.max(width, 0);
    const cleanH = Math.max(height, 0);
    const orientation = calculateOrientation(cleanW, cleanH);

    results.push({
      src: href,
      originalName,
      ext,
      width: cleanW,
      height: cleanH,
      format,
      alt: alt.trim(),
      orientation,
    });
  };

  const parseSrcset = (value: string) => {
    return value
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
  };

  // 1. Scan <img> elements
  document.querySelectorAll('img').forEach((img) => {
    const width = img.naturalWidth || img.width || Math.round(img.getBoundingClientRect().width);
    const height = img.naturalHeight || img.height || Math.round(img.getBoundingClientRect().height);
    const alt = img.alt || '';

    const srcCandidates = [
      img.currentSrc,
      img.src,
      img.getAttribute('src'),
      img.dataset.src,
      img.dataset.lazySrc,
      img.dataset.originalSrc,
      img.dataset.highres,
      img.dataset.full,
      img.dataset.zoomSrc,
    ].filter(Boolean) as string[];

    srcCandidates.forEach((src) => addImage(src, width, height, alt));

    const srcset = img.getAttribute('srcset') || img.dataset.srcset || '';
    if (srcset) {
      parseSrcset(srcset).forEach((src) => addImage(src, width, height, alt));
    }
  });

  // 2. Scan <picture> and <source> elements
  document.querySelectorAll('picture source').forEach((source) => {
    const srcset = source.getAttribute('srcset') || source.getAttribute('data-srcset') || '';
    if (srcset) {
      parseSrcset(srcset).forEach((src) => addImage(src, 999, 999));
    }
  });

  // 3. Scan <video poster="...">
  document.querySelectorAll('video[poster]').forEach((video) => {
    const poster = video.getAttribute('poster');
    const rect = video.getBoundingClientRect();
    if (poster) {
      addImage(poster, Math.round(rect.width), Math.round(rect.height));
    }
  });

  // 4. Scan CSS background-image on elements
  document.querySelectorAll('*').forEach((el) => {
    if (el instanceof HTMLImageElement || el instanceof HTMLSourceElement) return;
    const style = window.getComputedStyle(el);
    const bg = style.backgroundImage;
    if (bg && bg !== 'none') {
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (match?.[1]) {
        const rect = el.getBoundingClientRect();
        if (rect.width >= 30 && rect.height >= 30) {
          addImage(match[1], Math.round(rect.width), Math.round(rect.height));
        }
      }
    }
  });

  // 5. Scan <canvas> elements
  document.querySelectorAll('canvas').forEach((canvas) => {
    if (canvas.width >= 50 && canvas.height >= 50) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        addImage(dataUrl, canvas.width, canvas.height, 'Canvas Render');
      } catch {
        // Tainted canvas
      }
    }
  });

  // Sort by resolution (largest first)
  return results.sort((a, b) => (b.width * b.height) - (a.width * a.height));
}

/* ==========================================================================
   DEEP SCAN (Auto-Scroll to trigger lazy loading)
   ========================================================================== */

async function performDeepScan(onProgress: (msg: string) => void): Promise<ScrapedImage[]> {
  const originalScrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const totalHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const steps = Math.min(Math.ceil(totalHeight / (viewportHeight * 0.8)), 8);

  for (let i = 1; i <= steps; i++) {
    onProgress(`Scanning page for images (${i}/${steps})...`);
    window.scrollTo({
      top: (i / steps) * (totalHeight - viewportHeight),
      behavior: 'smooth',
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Restore scroll position
  window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
  await new Promise((resolve) => setTimeout(resolve, 200));

  return scrapeImages();
}

/* ==========================================================================
   FLOATING HOVER SAVE BUTTON (Zero host DOM mutation)
   ========================================================================== */

function createFloatingHoverButton(
  root: HTMLElement,
  onDownload: (src: string, width: number, height: number) => Promise<void>
) {
  const btn = document.createElement('button');
  btn.className = 'ig-floating-btn';
  btn.title = 'Save Image (ImageGrab)';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
    <span>Save</span>
  `;

  let currentTarget: { src: string; width: number; height: number } | null = null;
  let isHovered = false;

  btn.addEventListener('mouseenter', () => {
    isHovered = true;
  });

  btn.addEventListener('mouseleave', () => {
    isHovered = false;
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
  });

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentTarget) return;

    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" fill="#10b981">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <span>Saved!</span>
    `;

    try {
      await onDownload(currentTarget.src, currentTarget.width, currentTarget.height);
    } finally {
      setTimeout(() => {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          <span>Save</span>
        `;
      }, 1500);
    }
  });

  root.appendChild(btn);

  return {
    show(target: { src: string; width: number; height: number }, rect: DOMRect) {
      currentTarget = target;
      btn.style.top = `${Math.max(rect.top + 8, 8)}px`;
      btn.style.left = `${Math.min(rect.right - 80, window.innerWidth - 86)}px`;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    },
    hide() {
      if (!isHovered) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
      }
    },
    destroy() {
      btn.remove();
    },
  };
}

function setupHoverTracker(
  isEnabled: () => boolean,
  getMinSize: () => number,
  getModifier: () => HoverKeyModifier,
  onShow: (info: { src: string; width: number; height: number }, rect: DOMRect) => void,
  onHide: () => void
) {
  let activeElement: HTMLElement | null = null;
  let hideTimeout: number | undefined;

  const handlePointerOver = (e: MouseEvent) => {
    if (!isEnabled()) return;

    // Check modifier key
    const modifier = getModifier();
    if (modifier === 'alt' && !e.altKey) return;
    if (modifier === 'ctrl' && (!e.ctrlKey && !e.metaKey)) return;

    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    let imgElement: HTMLImageElement | null = null;
    let src = '';

    if (target instanceof HTMLImageElement) {
      imgElement = target;
      src = target.currentSrc || target.src || target.dataset.src || '';
    } else {
      const computed = window.getComputedStyle(target);
      const bg = computed.backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match?.[1]) {
          src = match[1];
        }
      }
    }

    if (!src || src.startsWith('data:image/svg')) return;

    const rect = target.getBoundingClientRect();
    const minSize = getMinSize();
    const width = imgElement ? (imgElement.naturalWidth || rect.width) : rect.width;
    const height = imgElement ? (imgElement.naturalHeight || rect.height) : rect.height;

    if (rect.width < minSize || rect.height < minSize || width < minSize || height < minSize) {
      return;
    }

    clearTimeout(hideTimeout);
    activeElement = target;
    onShow({ src, width: Math.round(width), height: Math.round(height) }, rect);
  };

  const handlePointerOut = (e: MouseEvent) => {
    if (e.target === activeElement) {
      hideTimeout = window.setTimeout(() => {
        onHide();
        activeElement = null;
      }, 250);
    }
  };

  const handleScrollOrResize = () => {
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onHide();
        activeElement = null;
      } else {
        const src = (activeElement as HTMLImageElement).currentSrc || (activeElement as HTMLImageElement).src || '';
        onShow({ src, width: Math.round(rect.width), height: Math.round(rect.height) }, rect);
      }
    }
  };

  document.addEventListener('mouseover', handlePointerOver, { passive: true });
  document.addEventListener('mouseout', handlePointerOut, { passive: true });
  window.addEventListener('scroll', handleScrollOrResize, { passive: true });
  window.addEventListener('resize', handleScrollOrResize, { passive: true });

  return {
    hide: onHide,
  };
}

/* ==========================================================================
   BATCH DOWNLOADER MODAL (Full Featured)
   ========================================================================== */

function createBatchModal(
  root: HTMLElement,
  getDefaultMode: () => BatchDownloadMode,
  onDownloadSelected: (
    images: ScrapedImage[],
    mode: BatchDownloadMode,
    onProgress: (current: number, total: number, msg?: string) => void
  ) => Promise<void>,
  onDeepScan: (onProgress: (msg: string) => void) => Promise<ScrapedImage[]>
) {
  const backdrop = document.createElement('div');
  backdrop.className = 'ig-modal-backdrop';

  const card = document.createElement('div');
  card.className = 'ig-modal-card';

  // Header
  const header = document.createElement('div');
  header.className = 'ig-modal-header';
  header.innerHTML = `
    <div class="ig-modal-title-wrap">
      <div class="ig-logo-badge">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#2563eb">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
      <div>
        <h2 class="ig-modal-title">Batch Image Downloader</h2>
        <span class="ig-modal-subtitle" id="ig-subtitle">0 images found</span>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="ig-action-btn" id="ig-deep-scan-btn" title="Scroll down page to find lazy-loaded images">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
        <span>Scan More</span>
      </button>
      <button class="ig-icon-btn" id="ig-close-btn" title="Close (Esc)">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `;

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'ig-modal-toolbar';
  toolbar.innerHTML = `
    <div class="ig-toolbar-left">
      <div class="ig-format-filters" id="ig-format-filters"></div>
      <div class="ig-orientation-filters" id="ig-orientation-filters">
        <button class="ig-chip ig-chip-active" data-orientation="all">All Shapes</button>
        <button class="ig-chip" data-orientation="landscape">Landscape</button>
        <button class="ig-chip" data-orientation="portrait">Portrait</button>
        <button class="ig-chip" data-orientation="square">Square</button>
      </div>
      <div class="ig-size-filter-wrap">
        <select id="ig-min-dimension-select" class="ig-select">
          <option value="0">All Sizes</option>
          <option value="100">Min 100px</option>
          <option value="300">Min 300px</option>
          <option value="600">Min 600px</option>
          <option value="1000">Min 1000px</option>
        </select>
      </div>
    </div>
    <div class="ig-toolbar-right">
      <input type="text" id="ig-search-input" class="ig-search-input" placeholder="Search images..." />
      <button class="ig-action-link-btn" id="ig-select-all-btn">Select All</button>
    </div>
  `;

  // Grid container
  const gridWrap = document.createElement('div');
  gridWrap.className = 'ig-grid-wrap';
  const grid = document.createElement('div');
  grid.className = 'ig-image-grid';
  gridWrap.appendChild(grid);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'ig-modal-footer';
  footer.innerHTML = `
    <div class="ig-footer-status">
      <span id="ig-selected-counter" class="ig-counter-badge">0 selected</span>
      <span id="ig-progress-label" class="ig-progress-label"></span>
    </div>
    <div class="ig-footer-actions">
      <button class="ig-btn ig-btn-secondary" id="ig-cancel-btn">Cancel</button>
      <button class="ig-btn ig-btn-outline" id="ig-download-individual-btn" title="Download each image as a separate file">
        <span>Save Separately</span>
      </button>
      <button class="ig-btn ig-btn-primary" id="ig-download-zip-btn" title="Download all selected images in 1 ZIP file (No spam dialogs)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span id="ig-download-zip-btn-text">Download as ZIP</span>
      </button>
    </div>
  `;

  // Toast notification
  const toast = document.createElement('div');
  toast.className = 'ig-toast';
  toast.id = 'ig-toast';

  // Lightbox overlay
  const lightbox = document.createElement('div');
  lightbox.className = 'ig-lightbox';
  lightbox.innerHTML = `
    <div class="ig-lightbox-content">
      <button class="ig-lightbox-close" id="ig-lightbox-close">&times;</button>
      <img id="ig-lightbox-img" src="" alt="Preview" />
      <div class="ig-lightbox-info" id="ig-lightbox-info"></div>
    </div>
  `;

  card.append(header, toolbar, gridWrap, footer);
  backdrop.append(card, toast, lightbox);
  root.appendChild(backdrop);

  // State
  let allImages: ScrapedImage[] = [];
  let selected = new Set<string>();
  let activeFormatFilter = 'ALL';
  let activeOrientationFilter = 'all';
  let activeMinDimension = 0;
  let searchQuery = '';
  let isDownloading = false;
  let isScanning = false;

  // Elements
  const subtitleEl = card.querySelector('#ig-subtitle') as HTMLElement;
  const formatFiltersEl = card.querySelector('#ig-format-filters') as HTMLElement;
  const orientationFiltersEl = card.querySelector('#ig-orientation-filters') as HTMLElement;
  const minDimSelect = card.querySelector('#ig-min-dimension-select') as HTMLSelectElement;
  const searchInput = card.querySelector('#ig-search-input') as HTMLInputElement;
  const selectAllBtn = card.querySelector('#ig-select-all-btn') as HTMLButtonElement;
  const deepScanBtn = card.querySelector('#ig-deep-scan-btn') as HTMLButtonElement;
  const counterBadge = card.querySelector('#ig-selected-counter') as HTMLElement;
  const progressLabel = card.querySelector('#ig-progress-label') as HTMLElement;
  const downloadZipBtn = card.querySelector('#ig-download-zip-btn') as HTMLButtonElement;
  const downloadZipBtnText = card.querySelector('#ig-download-zip-btn-text') as HTMLElement;
  const downloadIndividualBtn = card.querySelector('#ig-download-individual-btn') as HTMLButtonElement;
  const cancelBtn = card.querySelector('#ig-cancel-btn') as HTMLButtonElement;
  const closeBtn = card.querySelector('#ig-close-btn') as HTMLButtonElement;

  const lightboxImg = lightbox.querySelector('#ig-lightbox-img') as HTMLImageElement;
  const lightboxInfo = lightbox.querySelector('#ig-lightbox-info') as HTMLElement;
  const lightboxClose = lightbox.querySelector('#ig-lightbox-close') as HTMLButtonElement;

  const showToast = (text: string) => {
    toast.textContent = text;
    toast.classList.add('ig-toast-visible');
    setTimeout(() => {
      toast.classList.remove('ig-toast-visible');
    }, 2000);
  };

  const getFilteredImages = () => {
    return allImages.filter((img) => {
      // Format filter
      if (activeFormatFilter !== 'ALL') {
        const extMatch = img.ext.toUpperCase() === activeFormatFilter;
        if (!extMatch) return false;
      }
      // Orientation filter
      if (activeOrientationFilter !== 'all') {
        if (img.orientation !== activeOrientationFilter) return false;
      }
      // Min dimension filter
      if (activeMinDimension > 0) {
        if (img.width < activeMinDimension && img.height < activeMinDimension) {
          return false;
        }
      }
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = img.originalName.toLowerCase().includes(q);
        const matchesSrc = img.src.toLowerCase().includes(q);
        const matchesAlt = img.alt ? img.alt.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesSrc && !matchesAlt) return false;
      }
      return true;
    });
  };

  const updateHeaderAndCounter = () => {
    const filtered = getFilteredImages();
    subtitleEl.textContent = `${allImages.length} images found (${filtered.length} shown)`;

    const selectedFilteredCount = filtered.filter((img) => selected.has(img.src)).length;
    counterBadge.textContent = `${selectedFilteredCount} / ${filtered.length} selected`;

    const allFilteredSelected = filtered.length > 0 && selectedFilteredCount === filtered.length;
    selectAllBtn.textContent = allFilteredSelected ? 'Deselect All' : 'Select All';

    downloadZipBtn.disabled = selectedFilteredCount === 0 || isDownloading;
    downloadIndividualBtn.disabled = selectedFilteredCount === 0 || isDownloading;

    downloadZipBtnText.textContent = isDownloading
      ? 'Bundling ZIP...'
      : `Download ZIP (${selectedFilteredCount})`;
  };

  const renderFormatFilters = () => {
    formatFiltersEl.innerHTML = '';
    const formats = ['ALL', 'JPG', 'PNG', 'WEBP', 'SVG', 'GIF', 'AVIF'];
    
    const counts: Record<string, number> = { ALL: allImages.length };
    for (const img of allImages) {
      const f = img.ext.toUpperCase();
      counts[f] = (counts[f] || 0) + 1;
    }

    formats.forEach((fmt) => {
      const count = counts[fmt] || 0;
      if (fmt !== 'ALL' && count === 0) return;

      const chip = document.createElement('button');
      chip.className = `ig-chip ${activeFormatFilter === fmt ? 'ig-chip-active' : ''}`;
      chip.textContent = `${fmt} (${count})`;
      chip.addEventListener('click', () => {
        activeFormatFilter = fmt;
        renderFormatFilters();
        renderGrid();
      });
      formatFiltersEl.appendChild(chip);
    });
  };

  // Orientation Filter Click Handlers
  orientationFiltersEl.querySelectorAll('.ig-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      orientationFiltersEl.querySelectorAll('.ig-chip').forEach((c) => c.classList.remove('ig-chip-active'));
      chip.classList.add('ig-chip-active');
      activeOrientationFilter = chip.getAttribute('data-orientation') || 'all';
      renderGrid();
    });
  });

  const renderGrid = () => {
    grid.innerHTML = '';
    const filtered = getFilteredImages();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ig-empty-state';
      empty.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" fill="#9ca3af">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <p>No images match the current filter.</p>
      `;
      grid.appendChild(empty);
      updateHeaderAndCounter();
      return;
    }

    filtered.forEach((img) => {
      const isChecked = selected.has(img.src);
      const cardEl = document.createElement('div');
      cardEl.className = `ig-card ${isChecked ? 'ig-card-selected' : ''}`;

      const topBar = document.createElement('div');
      topBar.className = 'ig-card-topbar';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'ig-checkbox';
      checkbox.checked = isChecked;

      const actionsBar = document.createElement('div');
      actionsBar.className = 'ig-card-quick-actions';

      // Copy URL Button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'ig-quick-btn';
      copyBtn.title = 'Copy image URL';
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
      `;
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(img.src);
        showToast('Image URL copied to clipboard!');
      });

      // Open in New Tab Button
      const openTabBtn = document.createElement('button');
      openTabBtn.className = 'ig-quick-btn';
      openTabBtn.title = 'Open full image in new tab';
      openTabBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
      `;
      openTabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(img.src, '_blank');
      });

      // Lightbox Preview Button
      const previewBtn = document.createElement('button');
      previewBtn.className = 'ig-quick-btn';
      previewBtn.title = 'Preview full size';
      previewBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      `;
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(img);
      });

      actionsBar.append(copyBtn, openTabBtn, previewBtn);
      topBar.append(checkbox, actionsBar);

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'ig-thumb-wrap';

      const thumb = document.createElement('img');
      thumb.className = 'ig-thumb';
      thumb.src = img.src;
      thumb.alt = img.alt || img.originalName;
      thumb.loading = 'lazy';

      thumbWrap.appendChild(thumb);

      const meta = document.createElement('div');
      meta.className = 'ig-card-meta';

      const sizeBadge = document.createElement('span');
      sizeBadge.className = 'ig-badge ig-badge-size';
      sizeBadge.textContent = img.width && img.height ? `${img.width}×${img.height}` : 'Dynamic';

      const formatBadge = document.createElement('span');
      formatBadge.className = 'ig-badge ig-badge-format';
      formatBadge.textContent = img.ext.toUpperCase();

      meta.append(sizeBadge, formatBadge);

      cardEl.append(topBar, thumbWrap, meta);

      // Card click toggles selection
      cardEl.addEventListener('click', () => {
        if (selected.has(img.src)) {
          selected.delete(img.src);
          cardEl.classList.remove('ig-card-selected');
          checkbox.checked = false;
        } else {
          selected.add(img.src);
          cardEl.classList.add('ig-card-selected');
          checkbox.checked = true;
        }
        updateHeaderAndCounter();
      });

      grid.appendChild(cardEl);
    });

    updateHeaderAndCounter();
  };

  // Deep Scan Action
  deepScanBtn.addEventListener('click', async () => {
    if (isScanning) return;
    isScanning = true;
    deepScanBtn.classList.add('ig-action-btn-loading');
    deepScanBtn.querySelector('span')!.textContent = 'Scanning...';

    try {
      const prevCount = allImages.length;
      const nextImages = await onDeepScan((msg) => {
        progressLabel.textContent = msg;
      });

      allImages = nextImages;
      // Auto-select newly found images
      nextImages.forEach((img) => selected.add(img.src));
      const diff = nextImages.length - prevCount;

      renderFormatFilters();
      renderGrid();
      showToast(diff > 0 ? `+${diff} new images discovered!` : 'Scan complete. All visible images captured.');
      progressLabel.textContent = '';
    } catch {
      showToast('Scan interrupted.');
    } finally {
      isScanning = false;
      deepScanBtn.classList.remove('ig-action-btn-loading');
      deepScanBtn.querySelector('span')!.textContent = 'Scan More';
    }
  });

  const openLightbox = (img: ScrapedImage) => {
    lightboxImg.src = img.src;
    lightboxInfo.innerHTML = `
      <span><strong>${img.originalName}.${img.ext}</strong></span>
      <span>${img.width} × ${img.height} px (${img.orientation || 'shape'})</span>
    `;
    lightbox.style.display = 'flex';
  };

  const closeLightbox = () => {
    lightbox.style.display = 'none';
    lightboxImg.src = '';
  };

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Select all / Deselect all
  selectAllBtn.addEventListener('click', () => {
    const filtered = getFilteredImages();
    const allSelected = filtered.every((img) => selected.has(img.src));

    if (allSelected) {
      filtered.forEach((img) => selected.delete(img.src));
    } else {
      filtered.forEach((img) => selected.add(img.src));
    }
    renderGrid();
  });

  // Search input
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderGrid();
  });

  // Min dimension filter
  minDimSelect.addEventListener('change', () => {
    activeMinDimension = Number(minDimSelect.value) || 0;
    renderGrid();
  });

  const runDownload = async (mode: BatchDownloadMode) => {
    if (isDownloading) return;
    const selectedImages = allImages.filter((img) => selected.has(img.src));
    if (selectedImages.length === 0) return;

    if (mode === 'individual' && selectedImages.length > 5) {
      const confirmIndividual = window.confirm(
        `Saving ${selectedImages.length} separate files.\n\nNOTE: If your browser setting "Ask where to save each file before downloading" is turned ON, your browser will prompt for every single image.\n\nTip: Use "Download as ZIP" to download everything in 1 file prompt.\n\nDo you want to continue saving separately?`
      );
      if (!confirmIndividual) return;
    }

    isDownloading = true;
    updateHeaderAndCounter();
    progressLabel.textContent = mode === 'zip'
      ? `Fetching & packaging ${selectedImages.length} images into ZIP...`
      : `Starting individual download of ${selectedImages.length} images...`;

    try {
      await onDownloadSelected(selectedImages, mode, (current, total, msg) => {
        progressLabel.textContent = msg || `Processing ${current} of ${total}...`;
      });
      progressLabel.textContent = mode === 'zip'
        ? `ZIP archive downloaded successfully!`
        : `Saved ${selectedImages.length} images!`;
      setTimeout(() => {
        close();
      }, 1400);
    } catch (err) {
      progressLabel.textContent = 'Download failed. Please check browser permissions.';
    } finally {
      isDownloading = false;
      updateHeaderAndCounter();
    }
  };

  // ZIP Download action
  downloadZipBtn.addEventListener('click', () => runDownload('zip'));

  // Individual Download action
  downloadIndividualBtn.addEventListener('click', () => runDownload('individual'));

  const close = () => {
    backdrop.style.display = 'none';
    closeLightbox();
  };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  // Hotkey listener inside modal
  document.addEventListener('keydown', (e) => {
    if (backdrop.style.display !== 'flex') return;

    // Esc key
    if (e.key === 'Escape') {
      if (lightbox.style.display === 'flex') {
        closeLightbox();
      } else {
        close();
      }
      return;
    }

    // Ctrl+A / Cmd+A to toggle select all inside modal
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && document.activeElement !== searchInput) {
      e.preventDefault();
      selectAllBtn.click();
      return;
    }

    // Enter to trigger ZIP download
    if (e.key === 'Enter' && !isDownloading && !isScanning && lightbox.style.display !== 'flex' && document.activeElement !== searchInput) {
      e.preventDefault();
      downloadZipBtn.click();
    }
  });

  return {
    open(images: ScrapedImage[]) {
      allImages = images;
      selected = new Set(images.map((img) => img.src));
      activeFormatFilter = 'ALL';
      activeOrientationFilter = 'all';
      activeMinDimension = 0;
      searchQuery = '';
      minDimSelect.value = '0';
      searchInput.value = '';
      progressLabel.textContent = '';
      isDownloading = false;
      isScanning = false;

      orientationFiltersEl.querySelectorAll('.ig-chip').forEach((c, idx) => {
        if (idx === 0) c.classList.add('ig-chip-active');
        else c.classList.remove('ig-chip-active');
      });

      renderFormatFilters();
      renderGrid();
      backdrop.style.display = 'flex';
    },
    close,
    destroy() {
      backdrop.remove();
    },
  };
}

/* ==========================================================================
   SHADOW DOM CSS STYLES
   ========================================================================== */

function getShadowStyles(): string {
  return `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Floating Save Button */
    .ig-floating-btn {
      position: fixed;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      z-index: 2147483646;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.15s ease, background 0.15s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }
    .ig-floating-btn:hover {
      background: #2563eb;
      transform: scale(1.04);
    }
    .ig-floating-btn svg {
      flex-shrink: 0;
    }

    /* Modal Backdrop */
    .ig-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      padding: 20px;
      box-sizing: border-box;
    }

    /* Modal Card */
    .ig-modal-card {
      width: 100%;
      max-width: 980px;
      height: 88vh;
      max-height: 860px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      animation: ig-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes ig-scale-in {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Modal Header */
    .ig-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }
    .ig-modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ig-modal-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    .ig-modal-subtitle {
      font-size: 12px;
      color: #64748b;
    }
    .ig-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ig-action-btn:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .ig-action-btn-loading {
      opacity: 0.7;
      cursor: wait;
    }
    .ig-icon-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ig-icon-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Toolbar */
    .ig-modal-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ig-toolbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ig-toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-format-filters, .ig-orientation-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .ig-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ig-chip:hover {
      border-color: #94a3b8;
      background: #f1f5f9;
    }
    .ig-chip-active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .ig-chip-active:hover {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }
    .ig-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      color: #334155;
      cursor: pointer;
      outline: none;
    }
    .ig-search-input {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 12px;
      color: #1e293b;
      outline: none;
      width: 150px;
      transition: width 0.2s ease, border-color 0.2s ease;
    }
    .ig-search-input:focus {
      border-color: #2563eb;
      width: 180px;
    }
    .ig-action-link-btn {
      background: transparent;
      border: none;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
    }
    .ig-action-link-btn:hover {
      text-decoration: underline;
    }

    /* Grid Wrap */
    .ig-grid-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      background: #f8fafc;
    }
    .ig-image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 16px;
    }

    /* Empty State */
    .ig-empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #64748b;
      font-size: 14px;
    }

    /* Card */
    .ig-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      user-select: none;
    }
    .ig-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }
    .ig-card-selected {
      border-color: #2563eb;
      background: #eff6ff;
    }
    .ig-card-selected:hover {
      border-color: #2563eb;
    }

    /* Card Topbar */
    .ig-card-topbar {
      position: absolute;
      top: 6px;
      left: 6px;
      right: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }
    .ig-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      cursor: pointer;
      accent-color: #2563eb;
    }
    .ig-card-quick-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .ig-card:hover .ig-card-quick-actions {
      opacity: 1;
    }
    .ig-quick-btn {
      width: 24px;
      height: 24px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      border: none;
      border-radius: 6px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ig-quick-btn:hover {
      background: #2563eb;
    }

    /* Thumbnail */
    .ig-thumb-wrap {
      width: 100%;
      height: 130px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .ig-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s ease;
    }
    .ig-card:hover .ig-thumb {
      transform: scale(1.03);
    }

    /* Card Meta */
    .ig-card-meta {
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
    }
    .ig-badge {
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      padding: 2px 5px;
    }
    .ig-badge-size {
      color: #64748b;
      background: #f1f5f9;
    }
    .ig-badge-format {
      color: #2563eb;
      background: #eff6ff;
    }

    /* Modal Footer */
    .ig-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      gap: 16px;
    }
    .ig-footer-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-counter-badge {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    .ig-progress-label {
      font-size: 12px;
      color: #2563eb;
      font-weight: 500;
    }
    .ig-footer-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .ig-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      outline: none;
    }
    .ig-btn-secondary {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #475569;
    }
    .ig-btn-secondary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .ig-btn-outline {
      background: #ffffff;
      border-color: #94a3b8;
      color: #334155;
    }
    .ig-btn-outline:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #64748b;
    }
    .ig-btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .ig-btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
    .ig-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Toast Notification */
    .ig-toast {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(15, 23, 42, 0.9);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
      z-index: 20;
    }
    .ig-toast-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Lightbox Preview */
    .ig-lightbox {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 30;
      padding: 40px;
      box-sizing: border-box;
    }
    .ig-lightbox-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .ig-lightbox-close {
      position: absolute;
      top: -36px;
      right: 0;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 28px;
      cursor: pointer;
      line-height: 1;
    }
    .ig-lightbox-img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .ig-lightbox-info {
      color: #f1f5f9;
      font-size: 13px;
      display: flex;
      gap: 16px;
      background: rgba(0, 0, 0, 0.4);
      padding: 6px 14px;
      border-radius: 20px;
    }
  `;
}
