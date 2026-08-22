import { settings, BatchDownloadMode, HoverKeyModifier } from '~/utils/storage';
import { formatFilename, getTimestamp } from '~/utils/filename';

const root = document.getElementById('root');

if (root) {
  mountPopup(root);
}

async function mountPopup(container: HTMLElement) {
  const state = {
    filenameTemplate: await settings.filenameTemplate.getValue(),
    hoverOverlayEnabled: await settings.hoverOverlayEnabled.getValue(),
    batchSubfolder: await settings.batchSubfolder.getValue(),
    minHoverSize: await settings.minHoverSize.getValue(),
    batchDownloadMode: await settings.batchDownloadMode.getValue(),
    hoverKeyModifier: await settings.hoverKeyModifier.getValue(),
    saved: false,
  };

  container.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      width: 360px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    .popup-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 12px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background: #eff6ff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .version-pill {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 12px;
    }
    .shortcut-tip {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11.5px;
      color: #1e40af;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .shortcut-kbd {
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 1px 5px;
      font-family: monospace;
      font-size: 11px;
      font-weight: 600;
      color: #1d4ed8;
    }
    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 4px;
      display: block;
    }
    .input-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .text-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      color: #0f172a;
      outline: none;
      background: #ffffff;
      font-family: monospace;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .text-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .tokens-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .token-chip {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 3px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
      color: #2563eb;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .token-chip:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    .preview-box {
      background: #0f172a;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .preview-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      color: #94a3b8;
    }
    .preview-value {
      font-size: 11px;
      font-family: monospace;
      color: #38bdf8;
      word-break: break-all;
    }
    .toggles-wrap {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #ffffff;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .toggle-label {
      font-size: 12.5px;
      font-weight: 500;
      color: #334155;
    }
    .toggle-switch {
      position: relative;
      width: 40px;
      height: 22px;
      background: #cbd5e1;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: background-color 0.15s ease;
    }
    .toggle-switch.active {
      background: #2563eb;
    }
    .toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #ffffff;
      border-radius: 999px;
      transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .toggle-switch.active .toggle-knob {
      transform: translateX(18px);
    }
    .select-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 4px;
      border-top: 1px solid #f1f5f9;
    }
    .select-input {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      color: #334155;
      outline: none;
    }
    .actions-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 9px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      outline: none;
    }
    .btn-primary {
      background: #0f172a;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1e293b;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
    }
    .btn-secondary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-secondary:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .btn-success {
      background: #10b981 !important;
      color: #ffffff !important;
    }
    .status-msg {
      font-size: 12px;
      color: #dc2626;
      text-align: center;
      margin: 0;
      min-height: 16px;
    }
  `;
  container.appendChild(style);

  const app = document.createElement('div');
  app.className = 'popup-card';

  // Header
  const header = document.createElement('div');
  header.className = 'header';
  header.innerHTML = `
    <div class="logo-wrap">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="#2563eb">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
      <h1 class="title">ImageGrab</h1>
    </div>
    <span class="version-pill">v1.1.0</span>
  `;

  // Shortcut Tip
  const shortcutTip = document.createElement('div');
  shortcutTip.className = 'shortcut-tip';
  shortcutTip.innerHTML = `
    <span>Shortcut: Press</span>
    <span class="shortcut-kbd">Alt + Shift + I</span>
    <span>to open batch grabber.</span>
  `;

  // Template section
  const templateSection = document.createElement('div');
  templateSection.className = 'input-wrap';

  const templateLabel = document.createElement('label');
  templateLabel.className = 'section-label';
  templateLabel.textContent = 'Filename Template';

  const templateInput = document.createElement('input');
  templateInput.type = 'text';
  templateInput.className = 'text-input';
  templateInput.value = state.filenameTemplate;

  const tokensBar = document.createElement('div');
  tokensBar.className = 'tokens-bar';

  const availableTokens = [
    '${domain}',
    '${timestamp}',
    '${original_name}',
    '${index}',
    '${index_00}',
    '${ext}',
    '${page_title}',
  ];

  availableTokens.forEach((token) => {
    const chip = document.createElement('span');
    chip.className = 'token-chip';
    chip.textContent = token;
    chip.title = `Insert ${token}`;
    chip.addEventListener('click', () => {
      const start = templateInput.selectionStart || templateInput.value.length;
      const end = templateInput.selectionEnd || templateInput.value.length;
      const current = templateInput.value;
      templateInput.value = current.slice(0, start) + token + current.slice(end);
      templateInput.focus();
      templateInput.setSelectionRange(start + token.length, start + token.length);
      state.filenameTemplate = templateInput.value;
      updatePreview();
    });
    tokensBar.appendChild(chip);
  });

  // Preview Box
  const previewBox = document.createElement('div');
  previewBox.className = 'preview-box';
  previewBox.innerHTML = `
    <span class="preview-label">Live Preview</span>
    <span class="preview-value" id="ig-preview-text"></span>
  `;
  const previewText = previewBox.querySelector('#ig-preview-text') as HTMLElement;

  const updatePreview = () => {
    const sampleOptions = {
      originalName: 'photo-sunset',
      ext: 'jpg',
      domain: 'unsplash.com',
      timestamp: getTimestamp(),
      index: 1,
      pageTitle: 'Nature Wallpapers',
      width: 1920,
      height: 1080,
    };
    try {
      previewText.textContent = formatFilename(state.filenameTemplate || '${domain}_${timestamp}_${index}.${ext}', sampleOptions);
    } catch {
      previewText.textContent = 'Invalid template';
    }
  };

  templateInput.addEventListener('input', () => {
    state.filenameTemplate = templateInput.value;
    updatePreview();
  });

  updatePreview();

  templateSection.append(templateLabel, templateInput, tokensBar, previewBox);

  // Toggles section
  const togglesWrap = document.createElement('div');
  togglesWrap.className = 'toggles-wrap';

  // Toggle 1: Hover overlay
  const hoverRow = document.createElement('div');
  hoverRow.className = 'toggle-row';
  hoverRow.innerHTML = `<span class="toggle-label">Show hover save button on images</span>`;
  const hoverSwitch = createSwitch(state.hoverOverlayEnabled, (val) => {
    state.hoverOverlayEnabled = val;
  });
  hoverRow.appendChild(hoverSwitch);

  // Trigger Modifier Key select row
  const modifierRow = document.createElement('div');
  modifierRow.className = 'select-row';
  modifierRow.innerHTML = `<span class="toggle-label" style="font-size: 12px; color: #64748b;">Hover button trigger</span>`;
  const modifierSelect = document.createElement('select');
  modifierSelect.className = 'select-input';
  [
    { label: 'Always on hover', val: 'none' },
    { label: 'Hold Alt / Option key', val: 'alt' },
    { label: 'Hold Ctrl key', val: 'ctrl' },
  ].forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt.val;
    el.textContent = opt.label;
    if (opt.val === state.hoverKeyModifier) el.selected = true;
    modifierSelect.appendChild(el);
  });
  modifierSelect.addEventListener('change', () => {
    state.hoverKeyModifier = modifierSelect.value as HoverKeyModifier;
  });
  modifierRow.appendChild(modifierSelect);

  // Min size select row
  const minSizeRow = document.createElement('div');
  minSizeRow.className = 'select-row';
  minSizeRow.innerHTML = `<span class="toggle-label" style="font-size: 12px; color: #64748b;">Min hover image size</span>`;
  const minSizeSelect = document.createElement('select');
  minSizeSelect.className = 'select-input';
  [
    { label: '100 × 100 px', val: 100 },
    { label: '150 × 150 px', val: 150 },
    { label: '200 × 200 px', val: 200 },
    { label: '300 × 300 px', val: 300 },
  ].forEach((opt) => {
    const el = document.createElement('option');
    el.value = String(opt.val);
    el.textContent = opt.label;
    if (opt.val === state.minHoverSize) el.selected = true;
    minSizeSelect.appendChild(el);
  });
  minSizeSelect.addEventListener('change', () => {
    state.minHoverSize = Number(minSizeSelect.value) || 150;
  });
  minSizeRow.appendChild(minSizeSelect);

  // Toggle 2: Batch subfolder
  const subfolderRow = document.createElement('div');
  subfolderRow.className = 'toggle-row';
  subfolderRow.innerHTML = `<span class="toggle-label">Save batch images into subfolder</span>`;
  const subfolderSwitch = createSwitch(state.batchSubfolder, (val) => {
    state.batchSubfolder = val;
  });
  subfolderRow.appendChild(subfolderSwitch);

  togglesWrap.append(hoverRow, modifierRow, minSizeRow, subfolderRow);

  // Actions Wrap
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'actions-wrap';

  const batchBtn = document.createElement('button');
  batchBtn.className = 'btn btn-primary';
  batchBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
    </svg>
    <span>Open Batch Downloader</span>
  `;

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-secondary';
  saveBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
    </svg>
    <span>Save Settings</span>
  `;

  const statusMsg = document.createElement('p');
  statusMsg.className = 'status-msg';

  batchBtn.addEventListener('click', async () => {
    statusMsg.textContent = '';
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      statusMsg.textContent = 'No active webpage tab found.';
      return;
    }
    try {
      const res = await browser.runtime.sendMessage({ type: 'open-batch-modal', tabId: tab.id });
      if (res?.ok === false) {
        statusMsg.textContent = 'Batch downloader is unavailable on this page.';
        return;
      }
      window.close();
    } catch {
      statusMsg.textContent = 'Cannot inject into this page (e.g. system or store page).';
    }
  });

  saveBtn.addEventListener('click', async () => {
    await settings.filenameTemplate.setValue(state.filenameTemplate);
    await settings.hoverOverlayEnabled.setValue(state.hoverOverlayEnabled);
    await settings.batchSubfolder.setValue(state.batchSubfolder);
    await settings.minHoverSize.setValue(state.minHoverSize);
    await settings.batchDownloadMode.setValue(state.batchDownloadMode);
    await settings.hoverKeyModifier.setValue(state.hoverKeyModifier);

    saveBtn.classList.add('btn-success');
    saveBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <span>Settings Saved!</span>
    `;

    setTimeout(() => {
      saveBtn.classList.remove('btn-success');
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
        </svg>
        <span>Save Settings</span>
      `;
    }, 1800);
  });

  actionsWrap.append(batchBtn, saveBtn, statusMsg);

  app.append(header, shortcutTip, templateSection, togglesWrap, actionsWrap);
  container.appendChild(app);
}

function createSwitch(initial: boolean, onChange: (value: boolean) => void): HTMLElement {
  let active = initial;
  const btn = document.createElement('button');
  btn.className = `toggle-switch ${active ? 'active' : ''}`;
  btn.type = 'button';

  const knob = document.createElement('span');
  knob.className = 'toggle-knob';

  btn.appendChild(knob);

  btn.addEventListener('click', () => {
    active = !active;
    if (active) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    onChange(active);
  });

  return btn;
}
