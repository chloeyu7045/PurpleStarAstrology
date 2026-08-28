/** 極簡 Markdown 轉 HTML。只支援解讀報告會用到的語法，並先跳脫防 XSS。 */
export function renderMarkdown(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const out = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const line of src.split('\n')) {
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      closeList();
      out.push(`<h${Math.min(h[1].length + 1, 6)}>${inline(h[2])}</h${Math.min(h[1].length + 1, 6)}>`);
      continue;
    }
    const li = /^[-*]\s+(.*)$/.exec(t) || /^\d+\.\s+(.*)$/.exec(t);
    if (li) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(t)}</p>`);
  }
  closeList();
  return out.join('\n');
}
