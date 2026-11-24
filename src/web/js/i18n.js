// Languages of the panels. The source strings are Brazilian Portuguese; every other
// language is a dictionary keyed by the Portuguese text (js/i18n/*.js). Text is translated
// as it reaches the page, so the code that builds the panels stays readable. Whatever the
// person typed (names, messages) sits under [data-raw] and is never touched.
import ptPT from './i18n/pt-PT.js';
import es from './i18n/es.js';
import en from './i18n/en.js';
import it from './i18n/it.js';
import de from './i18n/de.js';

export const LANGUAGES = [
  ['auto', 'Automático'],
  ['pt-BR', 'Português (Brasil)'],
  ['pt-PT', 'Português (Portugal)'],
  ['es', 'Español'],
  ['en', 'English'],
  ['it', 'Italiano'],
  ['de', 'Deutsch'],
];
const DICTS = { 'pt-PT': ptPT, es, en, it, de };

/** 'auto' follows the computer: Portuguese of Portugal or Brazil, or English as a fallback. */
function resolveLanguage(choice, browser = navigator.language || 'pt-BR') {
  if (choice && choice !== 'auto' && (choice === 'pt-BR' || DICTS[choice])) return choice;
  const b = browser.toLowerCase();
  if (b.startsWith('pt')) return b === 'pt-pt' ? 'pt-PT' : 'pt-BR';
  for (const l of ['es', 'en', 'it', 'de']) if (b.startsWith(l)) return l;
  return 'en';
}

export let lang = resolveLanguage(localStorage.cltLang);
document.documentElement.lang = lang;

/** t('Salvar'), t('Tema "{name}" aplicado', { name }) */
export function t(key, params) {
  let text = lang === 'pt-BR' ? key : (DICTS[lang]?.[key] ?? key);
  if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, v);
  return text;
}

/** The language saved in the program wins; a change reloads the panel once. */
export function useLanguage(choice) {
  if ((localStorage.cltLang || 'auto') === choice) return;
  localStorage.cltLang = choice;
  if (resolveLanguage(choice) !== lang) location.reload();
}

const ATTRS = ['title', 'placeholder', 'aria-label', 'label', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'CODE', 'TEXTAREA', 'INPUT', 'IFRAME']);
const find = (text) => DICTS[lang]?.[text.trim().replace(/\s+/g, ' ')];
function textNode(node) {
  const raw = node.nodeValue,
    out = find(raw);
  if (out !== undefined && out !== raw.trim())
    node.nodeValue = raw.match(/^\s*/)[0] + out + raw.match(/\s*$/)[0];
}
function element(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a),
      out = v && find(v);
    if (out !== undefined && out !== v) el.setAttribute(a, out);
  }
}
function walk(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!node.parentElement?.closest('[data-raw]') && !SKIP.has(node.parentElement?.tagName))
      textNode(node);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  element(node);
  if (
    node.matches('[data-raw]') ||
    (SKIP.has(node.tagName) && node.tagName !== 'INPUT' && node.tagName !== 'TEXTAREA')
  )
    return;
  for (const child of node.childNodes) walk(child);
}

/** Translates the page now and everything added or changed later. */
export function autoLocalize() {
  if (lang === 'pt-BR') return;
  walk(document.body);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') walk(r.target);
      else if (r.type === 'attributes') element(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}
