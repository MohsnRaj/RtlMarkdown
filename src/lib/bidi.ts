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
 * Detects the overall predominant direction of the text.
 *
 * Persian/Arabic scripts carry decisive structural weight because Perso-Arabic orthography
 * omits short vowels (making Persian words concise), whereas English technical terms and loanwords
 * are often long (e.g. 'feature', 'Transformer', 'Overfitting', 'Convolutional Neural Network').
 *
 * Sentences or headings that contain core Persian words (outside secondary parenthetical notes)
 * are intrinsically RTL. An English sentence with a secondary parenthetical Persian gloss
 * (e.g. 'React is a library (توسعه وب)') remains LTR.
 */
export function detectDirection(text: string): Direction {
  const rtlMatches = text.match(RTL_REGEX_GLOBAL) || [];
  const latinMatches = text.match(LATIN_REGEX_GLOBAL) || [];

  if (rtlMatches.length === 0 && latinMatches.length === 0) {
    return 'neutral';
  }

  // Pure Latin / LTR
  if (rtlMatches.length === 0) {
    return 'ltr';
  }

  // Pure RTL
  if (latinMatches.length === 0) {
    return 'rtl';
  }

  // Check primary text excluding secondary parenthetical notes/glosses (e.g. '(توسعه وب)')
  const textWithoutParentheses = text.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();

  // If after stripping parenthetical notes there are no RTL characters left,
  // the core text is genuinely English/LTR
  if (!hasRtlCharacters(textWithoutParentheses) && hasLatinCharacters(textWithoutParentheses)) {
    return 'ltr';
  }

  // When primary text contains Persian words outside parentheses,
  // it is intrinsically RTL regardless of how many characters the English loanwords have.
  return 'rtl';
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
 * A line is considered an LTR sentence if it has Latin characters or numbers/symbols,
 * and zero RTL characters.
 */
export function isLtrLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !hasRtlCharacters(trimmed) && (hasLatinCharacters(trimmed) || /[0-9]/.test(trimmed));
}

/**
 * Determines whether a block element (paragraph, heading, list item, list container, etc.)
 * should be rendered with LTR layout (dir="ltr" and bidi-ltr-block).
 *
 * A block is LTR if:
 * 1. It contains no RTL characters and contains Latin characters or numbers/symbols.
 * 2. Or, in mixed content, its primary direction is LTR and its first strong directional
 *    character is Latin.
 */
export function isLtrBlock(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Pure Latin / numeric / technical block with zero RTL characters
  if (!hasRtlCharacters(trimmed)) {
    return hasLatinCharacters(trimmed) || /[0-9]/.test(trimmed);
  }

  // Mixed block: must not start with RTL and must be predominantly LTR
  const firstStrong = getFirstStrongDirection(trimmed);
  return firstStrong === 'ltr' && isPredominantlyLtr(trimmed);
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
 * Normalizes LaTeX math delimiters across a markdown document so that standard
 * LaTeX syntax (`\[ ... \]` for display math and `\( ... \)` for inline math)
 * is seamlessly converted into standard Markdown math syntax (`$$ ... $$` and `$ ... $`)
 * recognized by remark-math and KaTeX, while strictly preserving code blocks,
 * inline code, and existing math delimiters.
 */
export function normalizeMathDelimiters(content: string): string {
  if (!content) return '';

  let result = '';
  let i = 0;
  const len = content.length;

  while (i < len) {
    // 1. Check for fenced code block at line start (or start of document)
    const isLineStart = i === 0 || content[i - 1] === '\n';
    if (isLineStart) {
      let indent = 0;
      while (indent < 3 && content[i + indent] === ' ') {
        indent++;
      }
      const fenceChar = content[i + indent];
      if (fenceChar === '`' || fenceChar === '~') {
        let fenceLen = 0;
        while (content[i + indent + fenceLen] === fenceChar) {
          fenceLen++;
        }
        if (fenceLen >= 3) {
          const fenceStr = fenceChar.repeat(fenceLen);
          let endOfBlock = len;
          let searchPos = i + indent + fenceLen;

          while (searchPos < len) {
            const nextNl = content.indexOf('\n', searchPos);
            const lineEnd = nextNl === -1 ? len : nextNl;
            const line = content.slice(searchPos, lineEnd);
            const trimmedLine = line.trimStart();
            const spaces = line.length - trimmedLine.length;

            if (spaces <= 3 && trimmedLine.startsWith(fenceStr)) {
              endOfBlock = nextNl === -1 ? len : nextNl + 1;
              break;
            }
            if (nextNl === -1) {
              endOfBlock = len;
              break;
            }
            searchPos = nextNl + 1;
          }

          result += content.slice(i, endOfBlock);
          i = endOfBlock;
          continue;
        }
      }
    }

    // 2. Check for inline code span: `+
    if (content[i] === '`') {
      let tickCount = 0;
      while (content[i + tickCount] === '`') {
        tickCount++;
      }
      const tickStr = '`'.repeat(tickCount);
      const closeIdx = content.indexOf(tickStr, i + tickCount);
      if (closeIdx !== -1) {
        const endOfSpan = closeIdx + tickCount;
        result += content.slice(i, endOfSpan);
        i = endOfSpan;
        continue;
      }
    }

    // 3. Check for existing display math: $$
    if (content[i] === '$' && content[i + 1] === '$') {
      const closeIdx = content.indexOf('$$', i + 2);
      if (closeIdx !== -1) {
        const endOfMath = closeIdx + 2;
        result += content.slice(i, endOfMath);
        i = endOfMath;
        continue;
      }
    }

    // 4. Check for display math: \[ ... \]
    if (content[i] === '\\' && content[i + 1] === '[') {
      let bsCount = 0;
      let b = i - 1;
      while (b >= 0 && content[b] === '\\') {
        bsCount++;
        b--;
      }
      if (bsCount % 2 === 0) {
        let searchPos = i + 2;
        let foundClose = -1;
        while (searchPos < len) {
          const idx = content.indexOf('\\]', searchPos);
          if (idx === -1) break;
          let closeBsCount = 0;
          let cb = idx - 1;
          while (cb >= searchPos && content[cb] === '\\') {
            closeBsCount++;
            cb--;
          }
          if (closeBsCount % 2 === 0) {
            foundClose = idx;
            break;
          }
          searchPos = idx + 2;
        }

        if (foundClose !== -1) {
          const mathContent = content.slice(i + 2, foundClose).trim();
          if (mathContent) {
            const prefix = result.endsWith('\n\n')
              ? ''
              : result.endsWith('\n')
                ? '\n'
                : '\n\n';
            result += `${prefix}$$\n${mathContent}\n$$\n\n`;
          }
          i = foundClose + 2;
          if (content[i] === '\r') i++;
          if (content[i] === '\n') i++;
          continue;
        }
      }
    }

    // 5. Check for inline math: \( ... \)
    if (content[i] === '\\' && content[i + 1] === '(') {
      let bsCount = 0;
      let b = i - 1;
      while (b >= 0 && content[b] === '\\') {
        bsCount++;
        b--;
      }
      if (bsCount % 2 === 0) {
        let searchPos = i + 2;
        let foundClose = -1;
        while (searchPos < len) {
          const idx = content.indexOf('\\)', searchPos);
          if (idx === -1) break;
          let closeBsCount = 0;
          let cb = idx - 1;
          while (cb >= searchPos && content[cb] === '\\') {
            closeBsCount++;
            cb--;
          }
          if (closeBsCount % 2 === 0) {
            foundClose = idx;
            break;
          }
          searchPos = idx + 2;
        }

        if (foundClose !== -1) {
          const mathContent = content.slice(i + 2, foundClose).trim();
          if (mathContent) {
            result += `$${mathContent}$`;
          }
          i = foundClose + 2;
          continue;
        }
      }
    }

    result += content[i];
    i++;
  }

  return result;
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
      const isListContainer = tag === 'ul' || tag === 'ol';
      const isLeafBlock = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tag);

      if (isListContainer) {
        const fullText = getNodeText(node);
        node.properties = node.properties || {};

        if (isLtrBlock(fullText)) {
          node.properties.dir = 'ltr';
          const existing = node.properties.className || [];
          const classes = Array.isArray(existing) ? existing : [existing];
          node.properties.className = [...classes, 'bidi-ltr-block'];
        } else if (baseDirection === 'rtl') {
          node.properties.dir = 'rtl';
          const existing = node.properties.className || [];
          const classes = Array.isArray(existing) ? existing : [existing];
          node.properties.className = [...classes, 'bidi-rtl-block'];
        }
      } else if (isLeafBlock) {
        const fullText = getNodeText(node);
        node.properties = node.properties || {};

        if (isLtrBlock(fullText)) {
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
