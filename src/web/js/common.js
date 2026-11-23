// Shared by the dock and the settings page.
export const $ = (sel, root = document) => root.querySelector(sel);
export const clientId = Math.random().toString(36).slice(2);

/** h('div', { class: 'x', onclick }, child, 'text') */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

export async function api(path, { method = 'GET', body, raw, type } = {}) {
  try {
    const r = await fetch(path, {
      method,
      headers: { 'content-type': type || 'application/json', 'x-client': clientId },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const data = await r.json().catch(() => ({}));
    return r.ok ? data : { error: data.error || `HTTP ${r.status}` };
  } catch {
    return { error: 'O programa não está respondendo. Abra o Lower Third Web de novo.' };
  }
}

let toastTimer = 0;
export function toast(text) {
  let t = $('.toast');
  if (!t) document.body.append((t = h('div', { class: 'toast', role: 'status' })));
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

// Messages the server sends in English, shown in Portuguese.
const ERRORS = [
  [/PIX key is empty/, 'Preencha a chave PIX nas configurações.'],
  [/PIX key is too long/, 'A chave PIX é longa demais.'],
  [/Invalid PIX amount/, 'Valor do PIX inválido.'],
  [
    /Invalid PIX code/,
    'Código PIX inválido: copie de novo o "PIX copia e cola" do aplicativo do banco.',
  ],
  [/Type a name or a title/, 'Digite um nome ou um texto.'],
  [/Name not found/, 'Esse nome não existe mais.'],
  [/Use a PNG, JPG/, 'Use uma imagem PNG, JPG, WebP, GIF ou SVG.'],
  [/Not a Lower Third Web backup/, 'Esse arquivo não é um backup do Lower Third Web.'],
  [/QR text is too long/, 'O texto do QR Code é longo demais.'],
  [/QR text is empty/, 'O QR Code está sem texto.'],
  [/HTTP 413|too large/i, 'Arquivo grande demais (máximo de 8 MB).'],
];
export const friendly = (msg) => (ERRORS.find(([re]) => re.test(msg)) || [, msg])[1];

export function theme() {
  const saved = ['dark', 'light'].includes(localStorage.ltwTheme) ? localStorage.ltwTheme : 'dark';
  document.documentElement.dataset.theme = saved;
  return saved;
}
export function toggleTheme() {
  localStorage.ltwTheme = theme() === 'dark' ? 'light' : 'dark';
  return theme();
}

export function renderVersion(v) {
  const el = $('#appVersion');
  if (!el || !v) return;
  el.textContent = `v${v}`;
  if (v.includes('-')) el.append(' ', h('b', { class: 'betaTag' }, 'BETA'));
}

/** Live connection: calls onState({config, live, version, origin}) on every change. */
export function connect(onState) {
  let version = '';
  (function open() {
    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onmessage = (m) => {
      const e = JSON.parse(m.data);
      // After an update the new server greets with another version: load the new UI.
      if (e.version && version && e.version !== version) location.reload();
      version = e.version || version;
      onState(e);
    };
    ws.onclose = () => setTimeout(open, 1500);
    ws.onerror = () => ws.close();
  })();
}
