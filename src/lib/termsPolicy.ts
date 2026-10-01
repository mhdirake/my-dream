export type TermsDocument = { id: number; content: string; published_at: string };
export type TermsStatus = { terms_accepted: boolean; current_version_id: number | null; accepted_version_id: number | null; accepted_at: string | null };
export function hasOfflineAcceptance(status: TermsStatus | null): boolean {
  return !!status?.terms_accepted && status.current_version_id !== null && status.current_version_id === status.accepted_version_id && !!status.accepted_at;
}
export function reachedTermsEnd(viewport: number, content: number, offset = 0): boolean {
  return viewport > 0 && content > 0 && viewport + Math.max(0, offset) >= content - 8;
}
export function isTermsError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'data' in error && (error.data as { code?: string } | undefined)?.code === 'TERMS_ACCEPTANCE_REQUIRED';
}
export type InlinePart = { text: string; bold?: boolean; italic?: boolean; href?: string };
export function inlineTerms(text: string): InlinePart[] {
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts: InlinePart[] = []; let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > start) parts.push({ text: text.slice(start, match.index) });
    parts.push(match[1] ? { text: match[1], bold: true } : match[2] ? { text: match[2], italic: true } : { text: match[3], href: match[4] });
    start = match.index! + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start) });
  return parts;
}
