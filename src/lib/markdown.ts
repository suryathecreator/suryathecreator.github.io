/** Minimal inline-markdown renderer: paragraphs, **bold**, *italic*, [links](url). */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isValidHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|\/[^/])/.test(href.trim());
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
      isValidHref(href) ? `<a href="${href}">${label}</a>` : label)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, '$1<em>$2</em>');
}

/** One line of markdown, no wrapping paragraph. */
export function renderInline(md: string): string {
  return inline(md.trim());
}

/** Blank-line separated paragraphs. */
export function renderParagraphs(md: string, className = ''): string {
  const cls = className ? ` class="${className}"` : '';
  return md
    .trim()
    .split(/\n\s*\n/)
    .map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length && lines.every(l => /^[-*]\s+/.test(l))) {
        const items = lines.map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('');
        return `<ul${cls}>${items}</ul>`;
      }
      return `<p${cls}>${inline(block.replace(/\s*\n\s*/g, ' '))}</p>`;
    })
    .join('');
}
