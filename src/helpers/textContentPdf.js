import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { parseTextContent } from './parser.js';
import { fetchPesu, isPesuSessionExpiredError } from './pesuAPI.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const BODY_LINE_HEIGHT = 15.4;
const SCRIPT_SIZE = 7.5;
const SCRIPT_SHIFT = 3.5;
const PARAGRAPH_GAP = 8;
const SECTION_GAP = 10;
const INLINE_IMAGE_DROP = 3;
const TITLE_SIZE = 15;
const TITLE_LINE_HEIGHT = 21;
const FOOTER_Y = 30;

const GRAY = rgb(0.45, 0.45, 0.45);
const RULE_GRAY = rgb(0.7, 0.7, 0.7);

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const splitDataUri = (src) => {
  const match = /^data:image\/(png|jpe?g);base64,([\s\S]+)$/i.exec(src);
  if (!match) {
    return null;
  }

  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return {
      bytes,
      type: match[1].toLowerCase() === 'png' ? 'png' : 'jpg',
    };
  } catch {
    return null;
  }
};

const createCharacterSet = (font) => new Set(font.getCharacterSet());

const sanitizeText = (text, characterSet) => Array.from(String(text || ''))
  .map((char) => {
    if (char === '\n' || char === '\t') {
      return ' ';
    }
    if (char === ' ') {
      return ' ';
    }
    return characterSet.has(char.codePointAt(0)) ? char : '?';
  })
  .join('');

const tokenizeRuns = (runs) => {
  const tokens = [];

  for (const run of runs) {
    if (run.image) {
      tokens.push({ image: run.image, width: run.width, height: run.height });
      continue;
    }
    if (!run.text) {
      continue;
    }

    const style = {
      bold: Boolean(run.bold),
      sup: Boolean(run.sup),
      sub: Boolean(run.sub),
    };

    const parts = String(run.text).split(/(\n)/);
    for (const part of parts) {
      if (part === '\n') {
        tokens.push({ newline: true, ...style });
        continue;
      }

      const pieces = part.split(/(\s+)/).filter(Boolean);
      for (const piece of pieces) {
        if (/^\s+$/.test(piece)) {
          tokens.push({ space: true, ...style });
        } else {
          tokens.push({ text: piece, ...style });
        }
      }
    }
  }

  return tokens;
};

const wrapPlainText = (text, font, size, maxWidth) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      line = nextLine;
      continue;
    }

    if (line) {
      lines.push(line);
      line = '';
    }

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
      continue;
    }

    let chunk = '';
    for (const char of word) {
      const nextChunk = chunk + char;
      if (font.widthOfTextAtSize(nextChunk, size) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = nextChunk;
      }
    }
    line = chunk;
  }

  if (line) {
    lines.push(line);
  }

  return lines;
};

const drawFooter = (pages, regularFont) => {
  pages.forEach((page, index) => {
    const text = `Page ${index + 1} of ${pages.length}`;
    const width = regularFont.widthOfTextAtSize(text, 8);
    page.drawText(text, {
      x: (PAGE_WIDTH - width) / 2,
      y: FOOTER_Y,
      size: 8,
      font: regularFont,
      color: GRAY,
    });
  });
};

export async function buildTextContentPdf(content, { regularFontBytes, boldFontBytes, loadImage }) {
  let pdfDocument = await PDFDocument.create();
  pdfDocument.registerFontkit(fontkit);

  let regularFont;
  let boldFont;

  try {
    regularFont = await pdfDocument.embedFont(regularFontBytes, { subset: true });
    boldFont = await pdfDocument.embedFont(boldFontBytes, { subset: true });
  } catch {
    pdfDocument = await PDFDocument.create();
    pdfDocument.registerFontkit(fontkit);
    regularFont = await pdfDocument.embedFont(regularFontBytes);
    boldFont = await pdfDocument.embedFont(boldFontBytes);
  }

  const placeholderFont = await pdfDocument.embedFont(StandardFonts.HelveticaOblique);
  const regularCharacters = createCharacterSet(regularFont);
  const boldCharacters = createCharacterSet(boldFont);

  const pages = [];
  let page;
  let cursorY = PAGE_HEIGHT - MARGIN;

  const addPage = () => {
    page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    cursorY = PAGE_HEIGHT - MARGIN;
  };

  const ensureSpace = (height) => {
    if (!page || cursorY - height < MARGIN) {
      addPage();
    }
  };

  const embedImage = async (src) => {
    let imageData = splitDataUri(src);

    if (!imageData && loadImage) {
      try {
        imageData = await loadImage(src);
      } catch (error) {
        if (error?.isSessionExpired) {
          throw error;
        }
        imageData = null;
      }
    }

    if (!imageData?.bytes) {
      return null;
    }

    try {
      return imageData.type === 'png'
        ? await pdfDocument.embedPng(imageData.bytes)
        : await pdfDocument.embedJpg(imageData.bytes);
    } catch {
      return null;
    }
  };

  const layoutParagraph = async (tokens) => {
    const lines = [];
    let line;

    const startLine = () => {
      line = { items: [], width: 0, imageHeight: 0 };
      lines.push(line);
    };

    const addText = (text, { bold, sup, sub }, font = bold ? boldFont : regularFont, color = rgb(0, 0, 0)) => {
      const size = sup || sub ? SCRIPT_SIZE : BODY_SIZE;
      const width = font.widthOfTextAtSize(text, size);
      line.items.push({
        text,
        font,
        size,
        color,
        x: line.width,
        yOffset: sup ? SCRIPT_SHIFT : sub ? -SCRIPT_SHIFT : 0,
      });
      line.width += width;
    };

    startLine();

    for (const token of tokens) {
      if (token.newline) {
        startLine();
        continue;
      }

      if (token.image) {
        const embeddedImage = await embedImage(token.image);
        if (!embeddedImage) {
          const placeholder = '[image]';
          const placeholderWidth = placeholderFont.widthOfTextAtSize(placeholder, BODY_SIZE);
          if (line.width > 0 && line.width + placeholderWidth > CONTENT_WIDTH) {
            startLine();
          }
          addText(placeholder, {}, placeholderFont, GRAY);
          continue;
        }

        const fitScale = Math.min(1, CONTENT_WIDTH / token.width);
        const width = token.width * fitScale;
        const height = token.height * fitScale;
        if (line.width > 0 && line.width + width > CONTENT_WIDTH) {
          startLine();
        }
        line.items.push({ image: embeddedImage, x: line.width, width, height });
        line.width += width;
        line.imageHeight = Math.max(line.imageHeight, height);
        continue;
      }

      const font = token.bold ? boldFont : regularFont;
      const characters = token.bold ? boldCharacters : regularCharacters;
      const size = token.sup || token.sub ? SCRIPT_SIZE : BODY_SIZE;

      if (token.space) {
        if (line.width > 0 && line.width + font.widthOfTextAtSize(' ', size) <= CONTENT_WIDTH) {
          addText(' ', token);
        }
        continue;
      }

      const sanitizedWord = sanitizeText(token.text, characters);

      if (font.widthOfTextAtSize(sanitizedWord, size) > CONTENT_WIDTH) {
        if (line.width > 0) {
          startLine();
        }

        let chunk = '';
        for (const char of sanitizedWord) {
          const nextChunk = chunk + char;
          if (font.widthOfTextAtSize(nextChunk, size) > CONTENT_WIDTH && chunk) {
            addText(chunk, token);
            startLine();
            chunk = char;
          } else {
            chunk = nextChunk;
          }
        }

        if (chunk) {
          addText(chunk, token);
        }
        continue;
      }

      if (line.width > 0 && line.width + font.widthOfTextAtSize(sanitizedWord, size) > CONTENT_WIDTH) {
        startLine();
      }

      addText(sanitizedWord, token);
    }

    return lines;
  };

  const drawLine = (line) => {
    const ascent = Math.max(BODY_SIZE, line.imageHeight - INLINE_IMAGE_DROP);
    const lineHeight = ascent + BODY_LINE_HEIGHT - BODY_SIZE;

    if (!page || cursorY - lineHeight < MARGIN) {
      addPage();
    }

    const baselineY = cursorY - ascent;
    for (const item of line.items) {
      if (item.image) {
        page.drawImage(item.image, {
          x: MARGIN + item.x,
          y: baselineY - INLINE_IMAGE_DROP,
          width: item.width,
          height: item.height,
        });
        continue;
      }

      page.drawText(item.text, {
        x: MARGIN + item.x,
        y: baselineY + item.yOffset,
        size: item.size,
        font: item.font,
        color: item.color,
      });
    }

    cursorY -= lineHeight;
  };

  addPage();

  if (content.title) {
    const titleLines = wrapPlainText(content.title, boldFont, TITLE_SIZE, CONTENT_WIDTH);

    for (const line of titleLines) {
      ensureSpace(TITLE_LINE_HEIGHT);
      const text = sanitizeText(line, boldCharacters);
      page.drawText(text, {
        x: MARGIN,
        y: cursorY - TITLE_SIZE,
        size: TITLE_SIZE,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      cursorY -= TITLE_LINE_HEIGHT;
    }

    ensureSpace(14);
    page.drawLine({
      start: { x: MARGIN, y: cursorY },
      end: { x: MARGIN + CONTENT_WIDTH, y: cursorY },
      thickness: 0.75,
      color: RULE_GRAY,
    });
    cursorY -= 14;
  }

  for (const block of content.blocks || []) {
    if (block.sectionBreak) {
      cursorY -= SECTION_GAP;
    }

    if (block.type === 'image') {
      const embeddedImage = await embedImage(block.src);

      if (!embeddedImage) {
        ensureSpace(14);
        const placeholder = '[Image could not be included]';
        page.drawText(placeholder, {
          x: MARGIN,
          y: cursorY - 10,
          size: 10,
          font: placeholderFont,
          color: GRAY,
        });
        cursorY -= 14;
        continue;
      }

      const natural = embeddedImage.scale(0.75);
      const maxHeight = PAGE_HEIGHT * 0.6;
      const shrinkScale = Math.min(1, CONTENT_WIDTH / natural.width, maxHeight / natural.height);
      const imageWidth = natural.width * shrinkScale;
      const imageHeight = natural.height * shrinkScale;

      ensureSpace(imageHeight + 8);
      page.drawImage(embeddedImage, {
        x: MARGIN,
        y: cursorY - imageHeight,
        width: imageWidth,
        height: imageHeight,
      });
      cursorY -= imageHeight + 8;
      continue;
    }

    const lines = await layoutParagraph(tokenizeRuns(block.runs || []));
    lines.forEach(drawLine);
    cursorY -= PARAGRAPH_GAP;
  }

  drawFooter(pages, regularFont);

  if (content.title) {
    pdfDocument.setTitle(content.title);
  }
  pdfDocument.setProducer('PESU-MAX');

  return pdfDocument.save();
}

const runsToHtml = (runs) => (runs || []).map((run) => {
  if (run.image) {
    const size = run.width && run.height
      ? ` style="width:${run.width}pt; height:${run.height}pt; vertical-align:-${INLINE_IMAGE_DROP}pt"`
      : '';
    return `<img src="${escapeHtml(run.image)}" alt=""${size} />`;
  }

  let text = escapeHtml(run.text).replace(/\n/g, '<br />');
  if (run.bold) {
    text = `<strong>${text}</strong>`;
  }
  if (run.sup) {
    text = `<sup>${text}</sup>`;
  }
  if (run.sub) {
    text = `<sub>${text}</sub>`;
  }
  return text;
}).join('');

export function buildTextContentHtml(content) {
  const body = (content.blocks || []).map((block) => {
    if (block.type === 'image') {
      return `<p class="image"><img src="${escapeHtml(block.src)}" alt="" /></p>`;
    }
    const sectionStyle = block.sectionBreak ? ' class="section"' : '';
    return `<p${sectionStyle}>${runsToHtml(block.runs)}</p>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(content.title || 'PESU Material')}</title>
<style>
body { font-family: Georgia, "Times New Roman", serif; margin: 40px auto; max-width: 760px; padding: 0 20px; color: #111; line-height: 1.6; }
h1 { font-size: 22px; margin-bottom: 10px; }
p { margin: 0 0 12px; }
p.section { margin-top: 28px; }
img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${content.title ? `<h1>${escapeHtml(content.title)}</h1>` : ''}
${body}
</body>
</html>
`;
}

let textPdfFontsPromise = null;

export function loadTextPdfFonts() {
  if (!textPdfFontsPromise) {
    textPdfFontsPromise = (async () => {
      const [regularResponse, boldResponse] = await Promise.all([
        fetch(chrome.runtime.getURL('fonts/DejaVuSans.ttf')),
        fetch(chrome.runtime.getURL('fonts/DejaVuSans-Bold.ttf')),
      ]);

      if (!regularResponse.ok || !boldResponse.ok) {
        throw new Error('Could not load text PDF fonts.');
      }

      const [regularBuffer, boldBuffer] = await Promise.all([
        regularResponse.arrayBuffer(),
        boldResponse.arrayBuffer(),
      ]);

      return {
        regularFontBytes: new Uint8Array(regularBuffer),
        boldFontBytes: new Uint8Array(boldBuffer),
      };
    })();

    textPdfFontsPromise = textPdfFontsPromise.catch((error) => {
      textPdfFontsPromise = null;
      throw error;
    });
  }

  return textPdfFontsPromise;
}

const loadRemoteImage = async (src) => {
  try {
    const response = await fetchPesu(src, {
      method: 'GET',
      credentials: 'include',
      treat500AsSessionExpired: false
    });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const type = contentType.includes('png') ? 'png' : (contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : null);
    if (!type) {
      return null;
    }

    return { bytes: new Uint8Array(await response.arrayBuffer()), type };
  } catch (error) {
    if (isPesuSessionExpiredError(error)) {
      error.isSessionExpired = true;
      throw error;
    }
    return null;
  }
};

export async function createTextContentFile(html, { name } = {}) {
  const content = parseTextContent(html);
  if (!content) {
    return null;
  }

  try {
    const { regularFontBytes, boldFontBytes } = await loadTextPdfFonts();
    const bytes = await buildTextContentPdf(content, {
      regularFontBytes,
      boldFontBytes,
      loadImage: loadRemoteImage,
    });

    return {
      success: true,
      blob: new Blob([bytes], { type: 'application/pdf' }),
      extension: '.pdf',
      name: content.title || name,
      fromText: true,
    };
  } catch (error) {
    if (isPesuSessionExpiredError(error)) {
      throw error;
    }

    return {
      success: true,
      blob: new Blob([buildTextContentHtml(content)], { type: 'text/html' }),
      extension: '.html',
      name: content.title || name,
      fromText: true,
      textFallback: true,
    };
  }
}
