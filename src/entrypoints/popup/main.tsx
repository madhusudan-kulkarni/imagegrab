import { settings, HoverKeyModifier } from '~/utils/storage';
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
    hoverKeyModifier: await settings.hoverKeyModifier.getValue(),
  };

  container.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .popup-card {
      padding: 14px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 2px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-icon {
      width: 28px;
      height: 28px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .save-indicator {
      font-size: 11px;
      font-weight: 600;
      color: #10b981;
      opacity: 0;
      transform: translateY(-2px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .save-indicator.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .version-pill {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* Primary Action Card */
    .hero-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #1e293b;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
      transition: all 0.15s ease;
      outline: none;
    }
    .hero-btn:hover {
      background: #1e293b;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
      transform: translateY(-1px);
    }
    .hero-btn:active {
      transform: translateY(0);
    }
    .hero-btn-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kbd-shortcut {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 2px 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      font-weight: 500;
    }

    /* Section Card */
    .section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }

    /* Toggle Rows */
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
      width: 38px;
      height: 22px;
      background: #cbd5e1;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
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
      transform: translateX(16px);
    }

    /* Conditional Nested Options */
    .nested-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-left: 10px;
      border-left: 2px solid #e2e8f0;
      margin-left: 2px;
      transition: all 0.2s ease;
    }
    .nested-options.hidden {
      display: none;
    }
    .select-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .select-label {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 500;
    }
    .select-input {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11.5px;
      color: #334155;
      outline: none;
      cursor: pointer;
    }
    .select-input:focus {
      border-color: #2563eb;
    }

    /* Filename Template */
    .template-input-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .text-input {
      width: 100%;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font-size: 11.5px;
      color: #0f172a;
      outline: none;
      background: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      transition: all 0.15s ease;
    }
    .text-input:focus {
      background: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }
    .tokens-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .token-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #2563eb;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .token-chip:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    .preview-line {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      overflow: hidden;
    }
    .preview-tag {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #475569;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .preview-val {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0284c7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-error {
      font-size: 11.5px;
      color: #dc2626;
      text-align: center;
      margin: 0;
      min-height: 0;
    }
    .popup-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding-top: 4px;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer-link {
      color: #64748b;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s ease;
    }
    .footer-link:hover {
      color: #2563eb;
    }
    .footer-dot {
      color: #cbd5e1;
      font-size: 8px;
    }
  `;
  container.appendChild(style);

  const app = document.createElement('div');
  app.className = 'popup-card';

  // Save Indicator Helper
  let saveTimer: any = null;
  const triggerSavedFeedback = () => {
    saveIndicator.classList.add('visible');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveIndicator.classList.remove('visible');
    }, 1200);
  };

  // Header
  const header = document.createElement('div');
  header.className = 'header';

  const logoWrap = document.createElement('div');
  logoWrap.className = 'logo-wrap';
  logoWrap.innerHTML = `
    <div class="logo-icon">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#2563eb">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    </div>
    <h1 class="title">ImageGrab</h1>
  `;

  const headerRight = document.createElement('div');
  headerRight.className = 'header-right';

  const saveIndicator = document.createElement('span');
  saveIndicator.className = 'save-indicator';
  saveIndicator.innerHTML = `
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
    <span>Saved</span>
  `;

  const versionPill = document.createElement('span');
  versionPill.className = 'version-pill';
  versionPill.textContent = 'v1.1.0';

  headerRight.append(saveIndicator, versionPill);
  header.append(logoWrap, headerRight);

  // Hero Action Button
  const heroBtn = document.createElement('button');
  heroBtn.className = 'hero-btn';
  heroBtn.innerHTML = `
    <div class="hero-btn-left">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
      <span>Open Batch Downloader</span>
    </div>
    <span class="kbd-shortcut">Alt+Shift+I</span>
  `;

  const statusError = document.createElement('p');
  statusError.className = 'status-error';

  heroBtn.addEventListener('click', async () => {
    statusError.textContent = '';
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      statusError.textContent = 'No active webpage tab found.';
      return;
    }
    try {
      const res = await browser.runtime.sendMessage({ type: 'open-batch-modal', tabId: tab.id });
      if (res?.ok === false) {
        statusError.textContent = 'Batch grabber is unavailable on this page.';
        return;
      }
      window.close();
    } catch {
      statusError.textContent = 'Cannot inject into this page (e.g. browser system page).';
    }
  });

  // Settings Card
  const settingsCard = document.createElement('div');
  settingsCard.className = 'section-card';

  // Toggle 1: Hover overlay
  const hoverRow = document.createElement('div');
  hoverRow.className = 'toggle-row';
  hoverRow.innerHTML = `<span class="toggle-label">Quick hover button on images</span>`;

  const nestedOptions = document.createElement('div');
  nestedOptions.className = `nested-options ${state.hoverOverlayEnabled ? '' : 'hidden'}`;

  const hoverSwitch = createSwitch(state.hoverOverlayEnabled, async (val) => {
    state.hoverOverlayEnabled = val;
    await settings.hoverOverlayEnabled.setValue(val);
    if (val) {
      nestedOptions.classList.remove('hidden');
    } else {
      nestedOptions.classList.add('hidden');
    }
    triggerSavedFeedback();
  });
  hoverRow.appendChild(hoverSwitch);

  // Trigger Modifier Key select row
  const modifierRow = document.createElement('div');
  modifierRow.className = 'select-row';
  modifierRow.innerHTML = `<span class="select-label">Trigger with</span>`;
  const modifierSelect = document.createElement('select');
  modifierSelect.className = 'select-input';
  [
    { label: 'Direct hover', val: 'none' },
    { label: 'Hold Alt / Option', val: 'alt' },
    { label: 'Hold Ctrl', val: 'ctrl' },
  ].forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt.val;
    el.textContent = opt.label;
    if (opt.val === state.hoverKeyModifier) el.selected = true;
    modifierSelect.appendChild(el);
  });
  modifierSelect.addEventListener('change', async () => {
    state.hoverKeyModifier = modifierSelect.value as HoverKeyModifier;
    await settings.hoverKeyModifier.setValue(state.hoverKeyModifier);
    triggerSavedFeedback();
  });
  modifierRow.appendChild(modifierSelect);

  // Min size select row
  const minSizeRow = document.createElement('div');
  minSizeRow.className = 'select-row';
  minSizeRow.innerHTML = `<span class="select-label">Min image size</span>`;
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
  minSizeSelect.addEventListener('change', async () => {
    state.minHoverSize = Number(minSizeSelect.value) || 150;
    await settings.minHoverSize.setValue(state.minHoverSize);
    triggerSavedFeedback();
  });
  minSizeRow.appendChild(minSizeSelect);

  nestedOptions.append(modifierRow, minSizeRow);

  // Toggle 2: Batch subfolder
  const subfolderRow = document.createElement('div');
  subfolderRow.className = 'toggle-row';
  subfolderRow.innerHTML = `<span class="toggle-label">Save downloads into subfolder</span>`;
  const subfolderSwitch = createSwitch(state.batchSubfolder, async (val) => {
    state.batchSubfolder = val;
    await settings.batchSubfolder.setValue(val);
    triggerSavedFeedback();
  });
  subfolderRow.appendChild(subfolderSwitch);

  settingsCard.append(hoverRow, nestedOptions, subfolderRow);

  // Filename Template Section Card
  const templateCard = document.createElement('div');
  templateCard.className = 'section-card';

  const templateLabel = document.createElement('div');
  templateLabel.className = 'card-title';
  templateLabel.textContent = 'Filename Template';

  const templateInputWrap = document.createElement('div');
  templateInputWrap.className = 'template-input-wrap';

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
    '${ext}',
    '${page_title}',
  ];

  availableTokens.forEach((token) => {
    const chip = document.createElement('span');
    chip.className = 'token-chip';
    chip.textContent = token;
    chip.title = `Insert ${token}`;
    chip.addEventListener('click', async () => {
      const start = templateInput.selectionStart || templateInput.value.length;
      const end = templateInput.selectionEnd || templateInput.value.length;
      const current = templateInput.value;
      templateInput.value = current.slice(0, start) + token + current.slice(end);
      templateInput.focus();
      templateInput.setSelectionRange(start + token.length, start + token.length);
      state.filenameTemplate = templateInput.value;
      updatePreview();
      await settings.filenameTemplate.setValue(state.filenameTemplate);
      triggerSavedFeedback();
    });
    tokensBar.appendChild(chip);
  });

  const previewLine = document.createElement('div');
  previewLine.className = 'preview-line';
  previewLine.innerHTML = `
    <span class="preview-tag">Preview</span>
    <span class="preview-val" id="ig-preview-val"></span>
  `;
  const previewVal = previewLine.querySelector('#ig-preview-val') as HTMLElement;

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
      previewVal.textContent = formatFilename(state.filenameTemplate || '${domain}_${timestamp}_${index}.${ext}', sampleOptions);
    } catch {
      previewVal.textContent = 'Invalid template format';
    }
  };

  let debounceTimer: any = null;
  templateInput.addEventListener('input', () => {
    state.filenameTemplate = templateInput.value;
    updatePreview();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      await settings.filenameTemplate.setValue(state.filenameTemplate);
      triggerSavedFeedback();
    }, 400);
  });

  updatePreview();

  templateInputWrap.append(templateInput, tokensBar, previewLine);
  templateCard.append(templateLabel, templateInputWrap);

  // Footer with Store & Repo links
  const footer = document.createElement('div');
  footer.className = 'popup-footer';
  footer.innerHTML = `
    <a href="https://addons.mozilla.org/en-US/firefox/addon/image-grab/" target="_blank" rel="noopener noreferrer" class="footer-link" title="Rate & Review on Firefox Add-ons">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
      <span>Firefox Add-on</span>
    </a>
    <span class="footer-dot">•</span>
    <a href="https://github.com/madhusudan-kulkarni/image-grab" target="_blank" rel="noopener noreferrer" class="footer-link" title="View Source on GitHub">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      <span>GitHub</span>
    </a>
  `;

  app.append(header, heroBtn, statusError, settingsCard, templateCard, footer);
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

