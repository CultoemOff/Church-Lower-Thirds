// Custom models: looks the church makes itself, usually by pasting what an AI wrote.
//
// A custom model is a name and a piece of CSS. An element drawn by it has the template
// "custom": the program still lays the element out, fills in the texts, places it, brings
// it in and takes it out; the CSS only says what it looks like. The CSS is never used as
// pasted: scopeCss() reads it rule by rule, keeps what stays inside the elements and
// throws away the rest (other parts of the page, addresses on the internet).

export const CUSTOM = 'custom';
export const CUSTOM_ELEMENTS = [
  'lower',
  'top',
  'ticker',
  'card',
  'agenda',
  'social',
  'comment',
  'countdown',
];

/** The elements a custom CSS draws: the ones some selector of it starts with. */
export function customCovers(css) {
  const plain = String(css || '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  return CUSTOM_ELEMENTS.filter((el) =>
    new RegExp(`(^|[,{}])\\s*\\.(?:el\\.)?${el}(?![\\w-])`).test(plain),
  );
}

/**
 * Puts a custom model on: the elements it draws go to "custom"; the others stay on the
 * model they had (one left on "custom" by an earlier model goes back to `fallback`, the
 * template it has in the ready-made model given). Colors, fonts and places do not change.
 */
export function applyCustom(config, model, fallback = {}) {
  const covered = customCovers(model.css);
  config.theme.custom = model.id;
  for (const el of CUSTOM_ELEMENTS)
    if (covered.includes(el)) config[el].template = CUSTOM;
    else if (config[el].template === CUSTOM && fallback[el]) config[el].template = fallback[el];
  return covered;
}

/** Splits "a, b:is(c, d)" at the commas that separate selectors. */
export function selectors(text) {
  const out = [];
  let depth = 0,
    quote = '',
    from = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && !depth) {
      out.push(text.slice(from, i));
      from = i + 1;
    }
  }
  out.push(text.slice(from));
  return out.map((s) => s.trim()).filter(Boolean);
}

const STARTS = new RegExp(`^\\.(?:el\\.)?(${CUSTOM_ELEMENTS.join('|')})(?![\\w-])`);
/** An image written inside the CSS itself is fine; anything fetched from elsewhere is not. */
const outside = (value) =>
  [...String(value).matchAll(/url\(\s*(['"]?)([^)]*?)\1\s*\)/gi)].some(
    (m) => !/^data:image\/(png|jpeg|gif|webp|svg\+xml)[;,]/i.test(m[2].trim()),
  ) || /image-set\(|@import|expression\(/i.test(value);

/**
 * Reads a pasted CSS with the browser's own parser and writes it again, safe to use:
 * - only rules whose selectors start with an element (.lower, .top…), and they only reach
 *   that element while it is on the template "custom";
 * - @media and @supports are kept, @keyframes too (renamed, so they cannot replace the
 *   program's own animations); @import, @font-face and the rest are left out;
 * - nothing is fetched from an address: only images written in the CSS itself (data:).
 *
 * Returns the CSS to use, how many rules stayed, the elements drawn and what was left out
 * (`dropped`: [reason, text]).
 */
export function scopeCss(css, root = '#stage') {
  const dropped = [],
    covered = new Set();
  let kept = 0;
  const sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(String(css || ''));
  } catch {
    return { css: '', rules: 0, covered: [], dropped: [['unreadable', '']] };
  }
  const names = new Set();
  const collect = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSKeyframesRule) names.add(r.name);
      else if (r.cssRules && !(r instanceof CSSStyleRule)) collect(r.cssRules);
    }
  };
  collect(sheet.cssRules);
  const rename = (value) => value.replace(/[\w-]+/g, (w) => (names.has(w) ? `custom-${w}` : w));

  /** The declarations of a rule, without what points outside. */
  const body = (style, where) => {
    for (const prop of [...style]) {
      const value = style.getPropertyValue(prop);
      if (outside(value)) {
        dropped.push(['address', `${where} { ${prop} }`]);
        style.removeProperty(prop);
      } else if (names.size && /^animation(-name)?$/.test(prop))
        style.setProperty(prop, rename(value), style.getPropertyPriority(prop));
    }
    return style.cssText;
  };
  const walk = (rules) => {
    let out = '';
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        const mine = [];
        for (const s of selectors(r.selectorText)) {
          const m = s.match(STARTS);
          if (!m) {
            dropped.push(['selector', s]);
            continue;
          }
          covered.add(m[1]);
          mine.push(`${root} .${m[1]}[data-template="${CUSTOM}"]${s.slice(m[0].length)}`);
        }
        if (r.cssRules?.length) dropped.push(['nested', r.selectorText]);
        if (!mine.length) continue;
        const text = body(r.style, r.selectorText);
        if (!text) continue;
        kept++;
        out += `${mine.join(',')}{${text}}\n`;
      } else if (r instanceof CSSKeyframesRule) {
        const frames = [...r.cssRules]
          .map((k) => `${k.keyText}{${body(k.style, `@keyframes ${r.name}`)}}`)
          .join('');
        out += `@keyframes custom-${r.name}{${frames}}\n`;
      } else if (r instanceof CSSMediaRule || r instanceof CSSSupportsRule) {
        const inner = walk(r.cssRules);
        const at = r instanceof CSSMediaRule ? '@media' : '@supports';
        if (inner) out += `${at} ${r.conditionText}{\n${inner}}\n`;
      } else dropped.push(['rule', r.cssText.split('{')[0].trim().slice(0, 60)]);
    }
    return out;
  };
  const text = walk(sheet.cssRules);
  return {
    css: text,
    rules: kept,
    covered: CUSTOM_ELEMENTS.filter((el) => covered.has(el)),
    dropped,
  };
}

// ---- The prompt for an AI ----
// Everything an assistant needs to write such a CSS: the stage, the markup of each element,
// the classes that say what is showing, the colors as variables, and the CSS each element
// starts with. The markup and the starting CSS are read from the overlay itself, so the
// prompt never describes a structure the program no longer has.

const ABOUT = {
  lower: [
    "Lower third: a person's name and role, at the bottom of the screen.",
    '.box.has-logo (church logo shown), .box.has-qr (QR code shown), .box.no-l1 / .box.no-l2 (a line is empty). Texts: .l1 span (name), .l2 span (role).',
    '--fill (plate), --fill2 (second plate color), --fill-soft, --fill2-soft, --accent, --accent-a, --on-accent, --accent-glow, --t1 (name), --t2 (role), --w1, --w2 (font weights), --case',
  ],
  top: [
    'Corner badge: small strip at a top corner with the church logo, name, a rotating message, a "LIVE" tag and the clock/date. Any combination of parts can be on.',
    'Each .part is display:none until its class is on .box: .has-logo, .has-name, .has-msg, .has-live, .has-clock, .has-date (date under the time), .no-time (date only). --h is the height of the strip (62px).',
    '--fill, --accent, --accent-a, --on-accent, --t1, --t2, --w1',
  ],
  ticker: [
    'Bottom bar: a full-width strip at the bottom with a label, scrolling notices (.track > .run, moved by the program: do not animate it) and a clock.',
    '.box.has-logo, .box.has-label, .box.has-clock. Notices are spans inside .run, separated by <i> bullets.',
    '--fill, --fill-soft, --accent, --accent-a, --on-accent, --t1, --w1',
  ],
  card: [
    'Giving card: a card with a title, a QR code (always on a white square: keep .qrw white so phones can read it), a subtitle and a key/number line.',
    '.box.has-logo, .has-title, .has-sub, .has-key, .has-qr; .key.multi when the key has several lines. .band is a decorative strip, .title2 repeats the title for layouts that want it beside the QR.',
    '--fill, --fill-solid, --accent, --accent-a, --on-accent, --t1, --t2, --w1',
  ],
  agenda: [
    'Schedule: a card with a header (.head: logo + title) and one day at a time (.dname, then one <div> per line inside .dlines); .dots has one <i> per day, the current one with class "on".',
    '.box.has-logo; .day.swap while the day is changing (fade it).',
    '--fill, --fill-soft, --accent, --accent-a, --on-accent, --t1, --t2, --w1',
  ],
  social: [
    'Social network: an icon (.icon holds an inline SVG using currentColor, or an <img>), a small line (.prefix) and the handle (.handle).',
    '.box.has-count (.count shows "01 / 03"), .box.has-progress (.progress i is a line the program fills), .box.swap while changing item.',
    '--fill, --fill-soft, --accent, --accent-a, --on-accent, --t1, --t2, --w1',
  ],
  comment: [
    'Viewer comment: who wrote (.user) and what they said (.said, may wrap to 2-3 lines), with a chat icon (.icon, inline SVG using currentColor).',
    '.box.has-user, .box.has-icon.',
    '--fill, --accent, --accent-a, --on-accent, --t1, --t2, --w1',
  ],
  countdown: [
    'Countdown: a short title (.title, "The service starts in") and the time left (.time, like "04:59" or "1:04:59", written by the program every second; use tabular numbers). At zero .time is replaced by .end (a short text).',
    '.box.has-title, .box.ended (zero reached: .time hidden, .end shown).',
    '--fill, --accent, --accent-a, --on-accent, --t1, --t2, --w1',
  ],
};

let parts = null;
/** The markup and the starting CSS of each element, read from the overlay (once). */
async function overlayParts() {
  if (parts) return parts;
  const [html, css] = await Promise.all(
    ['/overlay', '/overlay.css'].map((u) => fetch(u).then((r) => r.text())),
  );
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const out = {};
  for (const el of CUSTOM_ELEMENTS) {
    const box = doc.querySelector(`.el.${el} .box`);
    const start = new RegExp(`^\\.${el}(?![\\w-])`);
    const rules = [...sheet.cssRules].filter(
      (r) =>
        r instanceof CSSStyleRule &&
        selectors(r.selectorText).every(
          (s) =>
            start.test(s) &&
            // Only what every model shares, plus the plain start of the custom ones.
            (!s.includes('data-template') || s.includes(`'${CUSTOM}'`)) &&
            !/data-(decor|glass|free|anim)|\.fixed|\.dragging/.test(s),
        ),
    );
    out[el] = {
      html: `<div class="el ${el}" data-template="custom"><div class="scaler">${box.outerHTML.replace(/\n\s*/g, '')}</div></div>`,
      css: rules.map((r) => r.cssText).join('\n'),
    };
  }
  return (parts = out);
}

/**
 * The text to paste into any AI assistant. `wish` is what the person wants, in their own
 * words; `elements` the ones to draw; `language` the one the assistant should answer in.
 */
export async function buildPrompt({ wish = '', elements = CUSTOM_ELEMENTS, language = 'English' }) {
  const all = await overlayParts();
  const list = CUSTOM_ELEMENTS.filter((el) => elements.includes(el));
  const blocks = list
    .map(
      (el) => `### .${el}
${ABOUT[el][0]}
States: ${ABOUT[el][1]}
Variables set on .${el}: ${ABOUT[el][2]}
Markup (fixed, you cannot change it):
${all[el].html}
CSS it starts with (already applied; override what you need):
${all[el].css}`,
    )
    .join('\n\n');
  return `You are designing a custom look ("model") for Church Lower Thirds, a program that shows broadcast graphics over a church's live stream in OBS. You will write ONE block of plain CSS. The program already builds the HTML, fills in the texts, positions each element, scales it and animates it in and out. Your CSS only decides what the elements look like: shapes, borders, transparency, plates, spacing, typography details.

## What I want
${wish.trim() || '[DESCRIBE HERE THE STYLE YOU WANT: shapes, borders, transparency, mood, references]'}

## Rules (the program discards whatever breaks them)
1. Plain CSS only: no HTML, no JavaScript, no @import, no @font-face, no CSS nesting, no preprocessor syntax.
2. Every selector must START with the class of an element: ${list.map((e) => '.' + e).join(', ')}. Example: ".lower .box", ".top .part.live", ".card .qrw::before". Never style html, body, .stage, .el, .scaler or anything outside these elements.
3. Nothing may be loaded from the internet: no url(http…). Small inline images as url("data:image/svg+xml,…") are allowed. Gradients, borders, shadows, clip-path, mask with gradients and pseudo-elements (::before / ::after) are all fine.
4. Do NOT position the elements on the screen and do NOT animate their entrance or exit: the program does both by animating ".box" (transform, opacity, clip-path). So never set animation, transition, transform, opacity or clip-path on ".box" or ".scaler" themselves; put shapes and effects on the children or on ".box::before" / ".box::after". You may add subtle looping animations to inner parts with your own @keyframes.
5. Colors, font and corner radius come from the church's theme as CSS variables. Use them instead of fixed colors, so the look follows the church's palette: var(--fill) is the main plate color (already with the chosen opacity; it can be a gradient, so use it in "background", not "background-color"), var(--accent) the highlight (may be a gradient too), var(--accent-a) the highlight as a single flat color (for borders, text, shadows), var(--on-accent) a text color readable over the accent, var(--t1) the main text color, var(--t2) the secondary text color, var(--radius) the corner radius, var(--fill-glass) the plate color at 30% (for glass effects with backdrop-filter), var(--font) the font family (already applied). Fixed whites/blacks with alpha for highlights and shadows are fine.
6. Keep every text readable on video: enough contrast, no text smaller than the starting sizes, and never hide a text or the QR code. The QR code must stay on a plain white background.
7. Parts are shown and hidden by the program through the state classes listed for each element (for example ".box.has-logo"). Respect them: do not force "display" on a part that the starting CSS hides, except through those same state classes.
8. The stage is 1920 × 1080 px and all sizes are in px for that stage (the program scales the whole stage to the video size). Elements have ${'`box-sizing: border-box`'}.

## The elements to design
${blocks}

## Your answer
Reply in ${language}. Give ONE code block with the complete CSS for ${list.map((e) => '.' + e).join(', ')}, organized by element with a short comment before each, and nothing that breaks the rules above. After the code block, one or two sentences describing the look. Do not explain how to install it: I will paste the CSS into the program.`;
}
