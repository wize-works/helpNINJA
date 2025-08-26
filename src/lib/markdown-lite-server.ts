// Minimal dependency-free markdown subset renderer for server-side formatting.
// Supports: headings (#, ##, ###), bold **text**, inline code `code`, links [text](url), unordered/ordered lists, paragraphs.
// Security: escapes HTML first, only allows the injected structural tags.
export function renderMarkdownLiteToHtml(src: string | null | undefined): string {
    try {
        if (!src) return '';
        let text = String(src);
        // Normalize newlines
        text = text.replace(/\r\n/g, '\n');
        // Escape HTML
        text = text.replace(/[&<>]/g, c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;');
        // Headings (order longest first)
        text = text.replace(/^### (.+)$/gm, '<h3 class="hn-md-h3">$1</h3>');
        text = text.replace(/^## (.+)$/gm, '<h2 class="hn-md-h2">$1</h2>');
        text = text.replace(/^# (.+)$/gm, '<h1 class="hn-md-h1">$1</h1>');
        // Bold **text** (avoid greediness across newlines)
        text = text.replace(/\*\*([^\n*][^*]*?)\*\*/g, '<strong>$1</strong>');
        // Inline code (backticks) – use capturing group that disallows backtick inside
        text = text.replace(/`([^`\n]+)`/g, '<code class="hn-md-code-inline">$1</code>');
        // Links
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="hn-md-link">$1</a>');
        // Unordered lists (group consecutive -/* lines)
        text = text.replace(/^(?:\s*[-*] .+(?:\n|$))+?/gm, block => {
            const items = block.trim().split(/\n/).map(l => '<li>' + l.replace(/^\s*[-*]\s+/, '') + '</li>').join('');
            return '<ul class="hn-md-ul">' + items + '</ul>';
        });
        // Ordered lists (numeric) – preserve custom start if first number != 1
        text = text.replace(/^(?:\s*\d+\. .+(?:\n|$))+?/gm, block => {
            const lines = block.trim().split(/\n/);
            const firstNumMatch = lines[0].match(/^(\s*)(\d+)\./);
            const start = firstNumMatch ? parseInt(firstNumMatch[2], 10) : 1;
            const items = lines.map(l => '<li>' + l.replace(/^\s*\d+\.\s+/, '') + '</li>').join('');
            return `<ol class="hn-md-ol"${start !== 1 ? ` start="${start}"` : ''}>${items}</ol>`;
        });
        // Alphabetic ordered lists (a., b., c.)
        text = text.replace(/^(?:\s*[a-zA-Z]\. .+(?:\n|$))+?/gm, block => {
            const lines = block.trim().split(/\n/);
            const firstMatch = lines[0].match(/^(\s*)([a-zA-Z])\./);
            const firstChar = firstMatch ? firstMatch[2].toLowerCase() : 'a';
            const start = firstChar.charCodeAt(0) - 96; // a=1
            const items = lines.map(l => '<li>' + l.replace(/^\s*[a-zA-Z]\.\s+/, '') + '</li>').join('');
            // Use data-list-style to allow client CSS to switch to lower-alpha if desired
            return `<ol class="hn-md-ol" data-alpha="true" style="list-style:lower-alpha;"${start !== 1 ? ` start="${start}"` : ''}>${items}</ol>`;
        });
        // Split remaining into paragraphs
        const parts = text.split(/\n{2,}/).map(p => {
            if (/^\s*$/.test(p)) return '';
            if (/^(<h[1-3]|<ul|<ol|<p|<pre|<blockquote)/.test(p.trim())) return p;
            return '<p class="hn-md-p">' + p.replace(/\n+/g, '<br/>') + '</p>';
        });
        return parts.join('\n');
    } catch { return src || ''; }
}
