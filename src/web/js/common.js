// Shared by the dock and the settings page.
import { t } from './i18n.js';
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
    return { error: 'O programa não está respondendo. Abra o Church Lower Thirds de novo.' };
  }
}

let toastTimer = 0;
export function toast(text) {
  let box = $('.toast');
  if (!box) document.body.append((box = h('div', { class: 'toast', role: 'status' })));
  box.textContent = t(text);
  box.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add('hidden'), 3200);
}

// Messages the server sends in English, shown in Portuguese.
const ERRORS = [
  [/PIX key is empty/, 'Preencha a chave PIX nas configurações.'],
  [
    /Enter the number or code that receives/,
    'Escreva o telefone, o código ou o e-mail que recebe.',
  ],
  [/File too large/, 'Arquivo grande demais.'],
  [/Invalid data|Unknown address|Internal error/, 'Não foi possível concluir. Tente de novo.'],
  [/Forbidden/, 'Abra esta página pelo endereço do próprio programa (127.0.0.1).'],
  [/Enter the link for the QR code/, 'Escreva o link da contribuição nas configurações.'],
  [/Enter the account holder name/, 'Escreva o nome do titular da conta.'],
  [/Invalid IBAN/, 'IBAN inválido: confira as letras e os números.'],
  [/Invalid BIC/, 'BIC inválido: são 8 ou 11 caracteres, ou deixe vazio.'],
  [/Invalid amount/, 'Valor inválido: use um número como 25,00.'],
  [/Upload the QR code image/, 'Envie a imagem do QR Code.'],
  [/Enter the bank details/, 'Escreva os dados bancários que vão aparecer.'],
  [/PIX key is too long/, 'A chave PIX é longa demais.'],
  [/Invalid PIX amount/, 'Valor do PIX inválido.'],
  [
    /Invalid PIX code/,
    'Código PIX inválido: copie de novo o "PIX copia e cola" do aplicativo do banco.',
  ],
  [/Type a name or a title/, 'Digite um nome ou um texto.'],
  [/Name not found/, 'Esse nome não existe mais.'],
  [/Use a PNG, JPG/, 'Use uma imagem PNG, JPG, WebP, GIF ou SVG.'],
  [/Not a Church Lower Thirds backup/, 'Esse arquivo não é um backup do Church Lower Thirds.'],
  [/QR text is too long/, 'O texto do QR Code é longo demais.'],
  [/QR text is empty/, 'O QR Code está sem texto.'],
  [/Update check failed/, 'Não foi possível procurar atualizações agora.'],
  [/Update download|Update checksum/, 'Não foi possível baixar a atualização. Tente de novo.'],
  [/Already up to date/, 'O programa já está atualizado.'],
  [/category is disabled/, 'Esta categoria está desativada nas configurações.'],
  [/Agenda is empty/, 'A agenda está vazia: adicione um dia.'],
  [/Unknown setting/, 'Esta versão do painel não combina com o programa: recarregue o painel.'],
  [/HTTP 413|too large/i, 'Arquivo grande demais (máximo de 8 MB).'],
];
export const friendly = (msg) => (ERRORS.find(([re]) => re.test(msg)) || [, msg])[1];

export function theme() {
  const saved = ['dark', 'light'].includes(localStorage.cltTheme) ? localStorage.cltTheme : 'dark';
  document.documentElement.dataset.theme = saved;
  return saved;
}
export function toggleTheme() {
  localStorage.cltTheme = theme() === 'dark' ? 'light' : 'dark';
  return theme();
}

export function renderVersion(v) {
  const el = $('#appVersion');
  if (!el || !v) return;
  el.textContent = `v${v}`;
  if (v.includes('-')) el.append(' ', h('b', { class: 'betaTag' }, 'BETA'));
}

/** Live connection: calls onState({config, live, version, origin}) on every change. */
export function connect(onState, onStatus = () => {}) {
  let version = '';
  (function open() {
    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = () => onStatus(true);
    ws.onmessage = (m) => {
      const e = JSON.parse(m.data);
      // After an update the new server greets with another version: load the new UI.
      if (e.version && version && e.version !== version) location.reload();
      version = e.version || version;
      onState(e);
    };
    ws.onclose = () => {
      onStatus(false);
      setTimeout(open, 1500);
    };
    ws.onerror = () => ws.close();
  })();
}
