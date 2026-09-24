/**
 * BiDi (Bidirectional) Layout & Typography Engine
 *
 * Implements strict bidirectional isolation, automatic script detection,
 * and Left-to-Right (LTR) alignment for English sentences embedded in RTL text.
 */

export type Direction = 'rtl' | 'ltr' | 'neutral';

export interface BiDiToken {
  type: 'rtl' | 'ltr';
  text: string;
}

export interface RehypeBidiOptions {
  baseDirection?: 'rtl' | 'ltr';
}

/**
 * Regex matching Right-to-Left (RTL) scripts including Arabic, Persian,
 * Urdu, Kurdish, Pashto, and Hebrew.
 */
export const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const RTL_REGEX_GLOBAL = new RegExp(RTL_REGEX.source, 'g');

/**
 * Regex matching Latin / LTR alphabetical characters.
 */
export const LATIN_REGEX = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
export const LATIN_REGEX_GLOBAL = new RegExp(LATIN_REGEX.source, 'g');

/**
 * Characters that are not RTL (i.e. Latin, digits, spaces, standard symbols).
 */
const NON_RTL_REGEX_GLOBAL = /[^\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

/**
 * HTML tags that must never have their internal text direction altered.
 */
export const EXCLUDED_TAGS = new Set([
  'code',
  'pre',
  'svg',
  'math',
  'annotation',
  'semantics',
  'script',
  'style',
]);

/**
 * Determines whether a given string has any RTL characters.
 */
export function hasRtlCharacters(text: string): boolean {
  return RTL_REGEX.test(text);
}

/**
 * Determines whether a given string has any Latin / LTR characters.
 */
export function hasLatinCharacters(text: string): boolean {
  return LATIN_REGEX.test(text);
}

/**
 * Detects the overall predominant direction of the text based on character counts.
 */
export function detectDirection(text: string): Direction {
  const rtlMatches = text.match(RTL_REGEX_GLOBAL) || [];
  const latinMatches = text.match(LATIN_REGEX_GLOBAL) || [];

  if (rtlMatches.length === 0 && latinMatches.length === 0) {
    return 'neutral';
  }

  return latinMatches.length > rtlMatches.length ? 'ltr' : 'rtl';
}

/**
 * Finds the direction of the first strongly directional character in text.
 * Ignores leading whitespace, digits, emojis, and neutral punctuation.
 */
export function getFirstStrongDirection(text: string): 'rtl' | 'ltr' | null {
  for (const char of text) {
    if (RTL_REGEX.test(char)) return 'rtl';
    if (LATIN_REGEX.test(char)) return 'ltr';
  }
  return null;
}

/**
 * Checks whether text is predominantly LTR (Latin characters strictly outnumber RTL characters).
 */
export function isPredominantlyLtr(text: string): boolean {
  return detectDirection(text) === 'ltr';
}

/**
 * Checks whether text is predominantly RTL.
 */
export function isPredominantlyRtl(text: string): boolean {
  return detectDirection(text) === 'rtl';
}

/**
 * Checks whether a single line of text represents a standalone LTR sentence or block.
 * A line is considered an LTR sentence if it has Latin characters and zero RTL characters.
 */
export function isLtrLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return hasLatinCharacters(trimmed) && !hasRtlCharacters(trimmed);
}

/**
 * Tokenizes a string of mixed RTL and LTR text into discrete directional segments.
 *
 * English phrases/sentences (including trailing sentence punctuation like periods,
 * question marks, exclamation marks, or closing parentheses) are captured as single
 * LTR tokens to prevent the Unicode Bidirectional Algorithm (UBA) from scrambling
 * punctuation when placed next to RTL characters.
 */
export function tokenizeBiDiText(text: string): BiDiToken[] {
  if (!text) return [];

  // Fast path: if text contains only RTL or only LTR, return immediately
  const containsRtl = hasRtlCharacters(text);
  const containsLatin = hasLatinCharacters(text);

  if (!containsRtl && containsLatin) {
    return [{ type: 'ltr', text }];
  }
  if (!containsLatin) {
    return [{ type: 'rtl', text }];
  }

  const segments: BiDiToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  NON_RTL_REGEX_GLOBAL.lastIndex = 0;

  while ((match = NON_RTL_REGEX_GLOBAL.exec(text)) !== null) {
    const rawChunk = match[0];
    const matchStart = match.index;

    if (hasLatinCharacters(rawChunk)) {
      // Keep internal spaces and punctuation, but isolate boundary whitespace
      const leadingSpaceMatch = rawChunk.match(/^\s*/);
      const trailingSpaceMatch = rawChunk.match(/\s*$/);

      const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
      const trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : '';

      const trimmedContent = rawChunk.slice(
        leadingSpace.length,
        rawChunk.length - trailingSpace.length
      );

      let ltrStart = matchStart + leadingSpace.length;
      let content = trimmedContent;

      // If the matched chunk begins with punctuation directly following Persian text
      // (e.g., Persian period or colon preceding English), leave that punctuation in the RTL run.
      const leadingPunctMatch = content.match(/^([.,:;!?]+)\s+/);
      if (leadingPunctMatch) {
        content = content.slice(leadingPunctMatch[0].length);
        ltrStart += leadingPunctMatch[0].length;
      }

      if (hasLatinCharacters(content)) {
        if (ltrStart > lastIndex) {
          segments.push({ type: 'rtl', text: text.slice(lastIndex, ltrStart) });
        }
        segments.push({ type: 'ltr', text: content });
        lastIndex = ltrStart + content.length;
      }
    }
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'rtl', text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'rtl', text }];
}

/**
 * Extracts raw textual content recursively from a HAST node.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNodeText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(getNodeText).join('');
  }
  return '';
}

/**
 * Checks if a HAST element should be excluded from BiDi transformations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isExcludedNode(node: any): boolean {
  if (!node || node.type !== 'element') return false;
  if (EXCLUDED_TAGS.has(node.tagName)) return true;

  const className = node.properties?.className;
  if (typeof className === 'string') {
    if (className.includes('katex') || className.includes('mermaid')) return true;
  } else if (Array.isArray(className)) {
    if (className.some((c: string) => c.includes('katex') || c.includes('mermaid'))) return true;
  }

  return false;
}

/**
 * Rehype plugin for Bidirectional Isolation and English Sentence Left-Alignment.
 *
 * Rules:
 * 1. Block elements (`p`, `h1`-`h6`, `li`, `blockquote`):
 *    - Predominantly LTR blocks receive `dir="ltr"` and `bidi-ltr-block` (enforcing left-alignment).
 *    - Predominantly RTL blocks receive `dir="rtl"` and `bidi-rtl-block`.
 * 2. Multi-line paragraphs:
 *    - Lines consisting of English sentences receive a block wrapper `<span dir="ltr" class="bidi-ltr-line">`
 *      ensuring they render left-aligned without breaking adjacent Persian lines.
 * 3. Mixed inline sentences and phrases:
 *    - Wrapped in `<bdi dir="ltr" class="bidi-ltr-isolate">` to isolate Latin text and trailing punctuation,
 *      eliminating the BiDi punctuation flip and layout scrambling.
 */
export function rehypeBidi(options: RehypeBidiOptions = {}) {
  const { baseDirection = 'rtl' } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function transform(node: any) {
      if (!node || !node.children || !Array.isArray(node.children)) return;
      if (isExcludedNode(node)) return;

      const tag = node.tagName;
      const isBlock = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tag);

      if (isBlock) {
        const fullText = getNodeText(node);
        node.properties = node.properties || {};

        const firstStrong = getFirstStrongDirection(fullText);
        const isLtrBlock = firstStrong === 'ltr' && isPredominantlyLtr(fullText);

        if (isLtrBlock) {
          node.properties.dir = 'ltr';
          const existing = node.properties.className || [];
          const classes = Array.isArray(existing) ? existing : [existing];
          node.properties.className = [...classes, 'bidi-ltr-block'];
          // Whole block is already LTR; no need to isolate inner text runs
          return;
        } else if (baseDirection === 'rtl') {
          node.properties.dir = 'rtl';
          const existing = node.properties.className || [];
          const classes = Array.isArray(existing) ? existing : [existing];
          node.properties.className = [...classes, 'bidi-rtl-block'];
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newChildren: any[] = [];

      for (const child of node.children) {
        if (child.type === 'text') {
          const val = child.value || '';

          if (val.includes('\n')) {
            const lines = val.split('\n');
            lines.forEach((line: string, idx: number) => {
              if (idx > 0) {
                newChildren.push({ type: 'text', value: '\n' });
              }

              if (isLtrLine(line)) {
                newChildren.push({
                  type: 'element',
                  tagName: 'span',
                  properties: { dir: 'ltr', className: ['bidi-ltr-line'] },
                  children: [{ type: 'text', value: line }],
                });
              } else {
                const tokens = tokenizeBiDiText(line);
                if (tokens.length > 1 || (tokens.length === 1 && tokens[0].type === 'ltr')) {
                  for (const tok of tokens) {
                    if (tok.type === 'ltr') {
                      newChildren.push({
                        type: 'element',
                        tagName: 'bdi',
                        properties: { dir: 'ltr', className: ['bidi-ltr-isolate'] },
                        children: [{ type: 'text', value: tok.text }],
                      });
                    } else {
                      newChildren.push({ type: 'text', value: tok.text });
                    }
                  }
                } else {
                  newChildren.push({ type: 'text', value: line });
                }
              }
            });
          } else {
            const tokens = tokenizeBiDiText(val);
            if (tokens.length > 1 || (tokens.length === 1 && tokens[0].type === 'ltr')) {
              for (const tok of tokens) {
                if (tok.type === 'ltr') {
                  newChildren.push({
                    type: 'element',
                    tagName: 'bdi',
                    properties: { dir: 'ltr', className: ['bidi-ltr-isolate'] },
                    children: [{ type: 'text', value: tok.text }],
                  });
                } else {
                  newChildren.push({ type: 'text', value: tok.text });
                }
              }
            } else {
              newChildren.push(child);
            }
          }
        } else {
          transform(child);
          newChildren.push(child);
        }
      }

      node.children = newChildren;
    }

    transform(tree);
  };
}

export default rehypeBidi;
