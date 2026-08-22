import JSZip from 'jszip';
import { settings, ScrapedImage, BatchDownloadMode, HoverKeyModifier } from '~/utils/storage';
import {
  formatFilename,
  getTimestamp,
  extractDomain,
  getFileExtension,
  getOriginalName,
  sanitizePathSegment,
  getBatchFolderName,
} from '~/utils/filename';

export default defineBackground(() => {
  // Register context menus on install / update to prevent duplicate ID errors
  browser.runtime.onInstalled.addListener(() => {
    setupContextMenus();
  });

  // Re-verify context menus on service worker startup safely
  setupContextMenus();

  // Keyboard shortcut listener
  browser.commands?.onCommand?.addListener(async (command) => {
    if (command === 'open-batch-modal') {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await openBatchModalOnTab(tab.id);
      }
    }
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'fast-save-image' && info.srcUrl) {
      await downloadImage(info.srcUrl, tab?.title);
      return;
    }

    if (info.menuItemId === 'fast-save-image-batch' && tab?.id) {
      await openBatchModalOnTab(tab.id);
    }
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'download-image') {
      downloadImage(message.src, message.pageTitle, message.width, message.height).then(() => {
        sendResponse({ ok: true });
      });
      return true;
    }

    if (message.type === 'download-batch-zip') {
      downloadBatchZip(message.images, message.pageTitle).then((res) => {
        sendResponse(res);
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'download-batch') {
      downloadBatchIndividual(message.images, message.pageTitle).then((res) => {
        sendResponse(res);
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'open-batch-modal' && typeof message.tabId === 'number') {
      openBatchModalOnTab(message.tabId).then(() => {
        sendResponse({ ok: true });
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'get-settings') {
      Promise.all([
        settings.filenameTemplate.getValue(),
        settings.hoverOverlayEnabled.getValue(),
        settings.batchSubfolder.getValue(),
        settings.minHoverSize.getValue(),
        settings.batchDownloadMode.getValue(),
        settings.hoverKeyModifier.getValue(),
      ]).then(([filenameTemplate, hoverOverlayEnabled, batchSubfolder, minHoverSize, batchDownloadMode, hoverKeyModifier]) => {
        sendResponse({
          filenameTemplate,
          hoverOverlayEnabled,
          batchSubfolder,
          minHoverSize,
          batchDownloadMode,
          hoverKeyModifier,
        });
      });
      return true;
    }
  });
});

function setupContextMenus() {
  browser.contextMenus.removeAll(() => {
    if (browser.runtime.lastError) {
      // Silently ignore
    }

    browser.contextMenus.create(
      {
        id: 'fast-save-image',
        title: 'ImageGrab: Save Image',
        contexts: ['image'],
      },
      () => {
        if (browser.runtime.lastError) {
          // Silently ignore
        }
      }
    );

    browser.contextMenus.create(
      {
        id: 'fast-save-image-batch',
        title: 'ImageGrab: Save Page Images',
        contexts: ['page', 'image'],
      },
      () => {
        if (browser.runtime.lastError) {
          // Silently ignore
        }
      }
    );
  });
}

async function downloadImage(
  src: string,
  pageTitle?: string,
  width?: number,
  height?: number
): Promise<void> {
  const template = await settings.filenameTemplate.getValue();
  const domain = extractDomain(src);
  const timestamp = getTimestamp();
  const ext = getFileExtension(src);
  const originalName = getOriginalName(src);

  const filename = formatFilename(template, {
    originalName,
    ext,
    domain,
    timestamp,
    index: 1,
    pageTitle,
    width,
    height,
  });

  await browser.downloads.download({
    url: src,
    filename,
    saveAs: false,
  });
}

async function fetchImageBuffer(src: string): Promise<{ data: ArrayBuffer | string; isBase64: boolean } | null> {
  if (src.startsWith('data:')) {
    const match = src.match(/^data:[^;]+;base64,(.+)$/);
    if (match?.[1]) {
      return { data: match[1], isBase64: true };
    }
    return null;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return { data: arrayBuffer, isBase64: false };
  } catch {
    return null;
  }
}

async function downloadBatchZip(
  images: ScrapedImage[],
  pageTitle?: string
): Promise<{ ok: boolean; count: number }> {
  if (!images || !images.length) {
    return { ok: true, count: 0 };
  }

  const zip = new JSZip();
  const template = await settings.filenameTemplate.getValue();
  const domain = extractDomain(images[0]?.src || '');
  const timestamp = getTimestamp();

  const { zipFilename } = getBatchFolderName({
    domain,
    pageTitle,
    timestamp,
  });

  let addedCount = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const ext = img.ext || getFileExtension(img.src);
    const originalName = img.originalName || getOriginalName(img.src);

    const filename = formatFilename(template, {
      originalName,
      ext,
      domain,
      timestamp,
      index: i + 1,
      pageTitle,
      width: img.width,
      height: img.height,
    });

    const bufferObj = await fetchImageBuffer(img.src);
    if (bufferObj) {
      if (bufferObj.isBase64) {
        zip.file(filename, bufferObj.data as string, { base64: true });
      } else {
        zip.file(filename, bufferObj.data as ArrayBuffer);
      }
      addedCount++;
    }
  }

  if (addedCount === 0) {
    throw new Error('Could not fetch any of the selected images for ZIP bundling.');
  }

  // Generate base64 data url for browser.downloads.download compatibility across MV3
  const zipBase64 = await zip.generateAsync({ type: 'base64' });
  const zipDataUrl = `data:application/zip;base64,${zipBase64}`;

  await browser.downloads.download({
    url: zipDataUrl,
    filename: zipFilename,
    saveAs: false,
  });

  return { ok: true, count: addedCount };
}

async function downloadBatchIndividual(
  images: ScrapedImage[],
  pageTitle?: string
): Promise<{ ok: boolean; count: number }> {
  if (!images || !images.length) {
    return { ok: true, count: 0 };
  }

  const template = await settings.filenameTemplate.getValue();
  const batchSubfolder = await settings.batchSubfolder.getValue();
  const domain = extractDomain(images[0]?.src || '');
  const timestamp = getTimestamp();

  const { folderPath } = getBatchFolderName({
    domain,
    pageTitle,
    timestamp,
  });

  const folderPrefix = batchSubfolder ? folderPath : '';

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const ext = img.ext || getFileExtension(img.src);
    const originalName = img.originalName || getOriginalName(img.src);

    const baseFormatted = formatFilename(template, {
      originalName,
      ext,
      domain,
      timestamp,
      index: i + 1,
      pageTitle,
      width: img.width,
      height: img.height,
    });

    const filename = `${folderPrefix}${baseFormatted}`;

    try {
      await browser.downloads.download({
        url: img.src,
        filename,
        saveAs: false,
      });
      // Small throttle delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (e) {
      console.warn('Failed to download image in batch:', img.src, e);
    }
  }

  return { ok: true, count: images.length };
}

async function openBatchModalOnTab(tabId: number): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'open-batch-modal' });
    return;
  } catch {
    // Content script may need dynamic injection for tabs loaded prior to extension install
  }

  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/image-scraper.js'],
    });

    await browser.tabs.sendMessage(tabId, { type: 'open-batch-modal' });
  } catch (err) {
    console.error('Could not inject or message content script:', err);
    throw err;
  }
}
