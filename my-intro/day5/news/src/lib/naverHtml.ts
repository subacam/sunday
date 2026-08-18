export interface HighlightSegment {
  text: string;
  bold: boolean;
}

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
};

function decodeEntities(str: string): string {
  return str.replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, ent: string) => ENTITY_MAP[ent]);
}

/** Naver's title/description embed literal <b> highlight tags. Strip anything else
 * before it ever reaches React children, so no tag but a bare <b>/</b> survives. */
function stripDisallowedTags(str: string): string {
  return str.replace(/<(?!\/?b>)[^>]*>/gi, '');
}

export function parseNaverHighlights(raw: string): HighlightSegment[] {
  const cleaned = stripDisallowedTags(raw);
  const parts = cleaned.split(/(<b>|<\/b>)/i);

  const segments: HighlightSegment[] = [];
  let bold = false;

  for (const part of parts) {
    if (/^<b>$/i.test(part)) {
      bold = true;
      continue;
    }
    if (/^<\/b>$/i.test(part)) {
      bold = false;
      continue;
    }
    if (part === '') continue;
    segments.push({ text: decodeEntities(part), bold });
  }

  return segments;
}
