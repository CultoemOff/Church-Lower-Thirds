// Lists the pages share: the order of service, names read from a pasted list or a file,
// and the search. Nothing here touches the page, so the tests can run it as it is.
// `t` is the translator of the page (the tests do without one).

// ---- Order of service ----
export const STEP_KINDS = ['lower', 'card', 'comment', 'social', 'agenda', 'countdown', 'hide'];
export const STEP_NAMES = {
  lower: 'Nome',
  card: 'Oferta',
  comment: 'Comentário',
  social: 'Rede social',
  agenda: 'Agenda',
  countdown: 'Contagem regressiva',
  hide: 'Tirar tudo do ar',
};
/** What each kind of step can show: [id, text] of every saved thing of that kind. */
export function stepChoices(config, kind, t = (v) => v) {
  if (kind === 'lower')
    return config.lower.items.map((i) => [i.id, [i.line1, i.line2].filter(Boolean).join(' · ')]);
  if (kind === 'card') return config.card.saved.map((i) => [i.id, i.title || i.qrText]);
  if (kind === 'comment')
    return config.comment.saved.map((i) => [i.id, [i.user, i.text].filter(Boolean).join(': ')]);
  if (kind === 'social')
    return [
      ['all', t('Todas as redes')],
      ...config.social.items.map((i) => [i.id, i.handle || i.label || i.network]),
    ];
  return [];
}
/** The line of a step in the lists: what it shows, or that the thing was deleted. */
export function stepText(config, step, t = (v) => v) {
  if (step.kind === 'hide') return t(STEP_NAMES.hide);
  if (step.kind === 'agenda') return t(config.agenda.title || STEP_NAMES.agenda);
  if (step.kind === 'countdown') return config.countdown.title || t(STEP_NAMES.countdown);
  return stepChoices(config, step.kind, t).find(([id]) => id === step.ref)?.[1] ?? null;
}

// ---- A list of names typed or pasted ----
/**
 * Reads a list of names, one per line, with the role after a separator: a tab, a
 * semicolon, " - ", or a comma. A spreadsheet saved as CSV works, and so does a list
 * pasted from a document. A first line that is a header ("Nome;Cargo") is left out.
 */
export function parseNames(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const cells = (line) => {
    // A CSV line with quotes: "Silva, João","Pastor".
    if (line.includes('"')) {
      const out = [];
      let cur = '',
        quoted = false;
      const sep =
        line.includes(';') && !line.includes(',') ? ';' : line.includes('\t') ? '\t' : ',';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
          if (ch === '"' && line[i + 1] === '"') cur += line[++i];
          else if (ch === '"') quoted = false;
          else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === sep || (sep === ',' && ch === ';')) {
          out.push(cur);
          cur = '';
        } else cur += ch;
      }
      return [...out, cur];
    }
    for (const sep of ['\t', ';', ' - ', ' – ', ' — ', '|', ',']) {
      const at = line.indexOf(sep);
      if (at >= 0) return [line.slice(0, at), line.slice(at + sep.length)];
    }
    return [line];
  };
  const rows = lines
    .map((l) => cells(l).map((c) => c.trim()))
    .map(([line1 = '', line2 = '']) => ({ line1: line1.slice(0, 120), line2: line2.slice(0, 160) }))
    .filter((r) => r.line1);
  const header = /^(nome|name|nombre|nomi?)$/i;
  return rows.length && header.test(rows[0].line1) ? rows.slice(1) : rows;
}
/** The same list as a CSV file a spreadsheet opens: name;role, one per line. */
export function namesCsv(items) {
  const q = (v) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return (
    '\uFEFF' + ['Nome;Cargo', ...items.map((i) => `${q(i.line1)};${q(i.line2 || '')}`)].join('\r\n')
  );
}
/** Small words and accents do not get in the way of a search. */
export const plain = (v) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
