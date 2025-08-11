export function chunkText(text: string, target = 900): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buf: string[] = [];
  for (const s of sentences) {
    const tentative = [...buf, s].join(' ');
    if (tentative.length > target && buf.length) {
      chunks.push(buf.join(' '));
      buf = [s];
    } else {
      buf.push(s);
    }
  }
  if (buf.length) chunks.push(buf.join(' '));
  return chunks.filter(c => c.trim().length > 0);
}
