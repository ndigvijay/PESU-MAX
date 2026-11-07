import * as cheerio from 'cheerio';
import { load } from 'cheerio';
const TRACKED_RESOURCE_TYPES = [2, 3, 5, 6, 7];

const cleanId = (id) => {
  if (!id) return '';
  return id.trim()
    .replace(/\\/g, '')
    .replace(/^["']|["']$/g, '');
};

export const getYearofStudent = (SRN) => {
  if (!SRN || typeof SRN !== 'string') return null;
  
  // SRN format: PES[campus][UG|PG][YY][BRANCH][ROLL]
  const match = SRN.match(/^PES\d(?:UG|PG)(\d{2})[A-Z]+\d+$/i);
  
  if (match) {
    const yearSuffix = parseInt(match[1], 10);
    return 2000 + yearSuffix;
  }
  
  return null;
};

export const parseSubjectsCode = (data) => {
  const $ = load(data);
  const subjects = [];
  $('option').each((index, element) => {
    const course_id = $(element).attr('value') || ''; 
    const course_name = $(element).text().trim();     
    subjects.push({
      id: cleanId(course_id),
      subjectCode: course_name.split('-')[0]?.trim() || '',
      subjectName: course_name
    });
  });
  return subjects;
};

export const parseSemesters = (optionsString) => {
  const optionRegex = /<option value="(\d+)">(Sem-\d+)<\/option>/g;
  const results = [];

  let match;
  while ((match = optionRegex.exec(optionsString)) !== null) {
    const value = match[1];       
    const semester = match[2];   

    const number = Number(semester.split("-")[1]);  

    results.push({ value, semester, number });
  }

  return results;
};

export const parseSemesterDetails = (htmlData) => {
  if (!htmlData || (typeof htmlData === 'string' && !htmlData.trim())) {
    return [];
  }

  const $ = load(htmlData);
  const subjects = [];

  $('tr[id^="rowWiseCourseContent_"]').each((index, row) => {
    const rowId = $(row).attr('id') || '';
    const subjectId = cleanId(rowId.replace('rowWiseCourseContent_', ''));
    const cells = $(row).find('td');

    if (!subjectId || cells.length < 2) {
      return;
    }

    const codeCell = $(cells[0]).clone();
    codeCell.find('div').remove();

    const subjectCode = codeCell.text().replace(/\s+/g, ' ').trim();
    const subjectName = $(cells[1]).text().replace(/\s+/g, ' ').trim();
    const courseType = $(cells[2]).text().replace(/\s+/g, ' ').trim();
    const status = $(cells[3]).text().replace(/\s+/g, ' ').trim();

    if (!subjectCode || !subjectName) {
      return;
    }

    if (status && status.toLowerCase() !== 'enrolled') {
      return;
    }

    subjects.push({
      id: subjectId,
      subjectCode,
      subjectName,
      courseType,
      status
    });
  });

  return subjects;
};


export const parseCourseUnits = (data) => {
  if (!data || (typeof data === 'string' && !data.trim())) {
    return [];
  }
  
  const $ = load(data);
  const units = [];
  
  $('a[onclick*="handleclassUnit"]').each((index, element) => {
    const onclick = $(element).attr('onclick') || '';
    const match = onclick.match(/handleclassUnit\s*\(\s*['"]([^'"]+)['"]/i);
    const unitId = cleanId(match?.[1]);
    const unitName = $(element).text().replace(/\s+/g, ' ').trim()
      || $(element).attr('title')?.replace(/\s+/g, ' ').trim()
      || '';

    if (unitId && unitName) {
      const unitNumber = unitName.includes(':')
        ? unitName.split(':')[0].trim()
        : unitName;

      units.push({
        id: unitId,
        name: unitName,
        unit: unitName,
        unitNumber
      });
    }
  });
  
  return units;
};

export const parseUnitClasses = (data) => {
  if (!data || (typeof data === 'string' && !data.trim())) {
    return [];
  }
  
  const $ = load(data);
  const classes = [];
  
  $('tr[onclick*="handleclasscoursecontentunit"]').each((index, row) => {
    const rowOnclick = $(row).attr('onclick') || '';
    const rowMatch = rowOnclick.match(
      /handleclasscoursecontentunit\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]?([^,'")]+)['"]?\s*,/i
    );

    if (!rowMatch) {
      return;
    }

    const className = $(row).find('.short-title').first().text().replace(/\s+/g, ' ').trim()
      || $(row).find('td').first().text().replace(/\s+/g, ' ').trim();

    const contentTypes = [];
    const resourceCounts = {};
    $(row).find('[onclick*="handleclasscoursecontentunit"]').each((linkIndex, link) => {
      const onclick = $(link).attr('onclick') || '';
      const match = onclick.match(/handleclasscoursecontentunit\s*\([^,]+,[^,]+,[^,]+,[^,]+,\s*(\d+)/i);
      const type = Number(match?.[1]);
      if (Number.isInteger(type) && !contentTypes.includes(type)) {
        contentTypes.push(type);
      }
      if (TRACKED_RESOURCE_TYPES.includes(type) && $(link).is('td')) {
        const count = parseInt($(link).find('a').first().text().replace(/\D+/g, ' ').trim(), 10);
        resourceCounts[type] = Number.isInteger(count) ? count : 0;
      }
    });

    classes.push({
      id: cleanId(rowMatch[1]),
      courseId: cleanId(rowMatch[2]),
      unitId: cleanId(rowMatch[3]),
      classNo: cleanId(rowMatch[4]),
      className,
      classType: 'Lecture',
      contentTypes,
      resourceCounts
    });
  });
  
  return classes;
};

export const parseDownloadLinks = (htmlData) => {
  const $ = load(htmlData);
  const downloadLinks = [];

  const normalizeMaterialUrl = (url) => {
    const cleanUrl = url.split('#')[0];
    const match = cleanUrl.match(
      /(?:https?:\/\/[^/]+)?\/Academy\/[as]\/referenceMeterials\/(?:downloadslidecoursedoc|downloadcoursedoc)\/([^/?#]+)/i
    );

    if (match) {
      return `/Academy/s/referenceMeterials/downloadslidecoursedoc/${match[1]}`;
    }

    return cleanUrl;
  };

  const seenUrls = new Set();
  const addDownloadLink = (url, type, element, docId = null) => {
    const cleanUrl = normalizeMaterialUrl(url);
    if (!cleanUrl || seenUrls.has(cleanUrl)) {
      return;
    }

    seenUrls.add(cleanUrl);
    downloadLinks.push({
      url: cleanUrl,
      type,
      ...(docId ? { docId } : {}),
      name: $(element).text().replace(/\s+/g, ' ').trim() || null
    });
  };

  $('[onclick*="loadIframe"]').each((index, element) => {
    const onclick = $(element).attr('onclick') || '';
    const match = onclick.match(/loadIframe\s*\(\s*['"]([^'"]+)['"]/i);
    if (!match) {
      return;
    }

    const url = match[1];
    const type = url.includes('downloadslidecoursedoc')
      ? 'slidecoursedoc'
      : url.includes('downloadcoursedoc')
        ? 'coursedoc'
        : null;

    if (type) {
      const docMatch = url.match(/(?:downloadslidecoursedoc|downloadcoursedoc)\/([^#/?]+)/i);
      addDownloadLink(url, type, element, docMatch?.[1] || null);
    }
  });

  $('[onclick*="downloadslidecoursedoc"], [onclick*="downloadcoursedoc"]').each((index, element) => {
    const onclick = $(element).attr('onclick') || '';
    const match = onclick.match(/(downloadslidecoursedoc|downloadcoursedoc)\s*\(\s*['"]([^'"]+)['"]/i);
    if (!match) {
      return;
    }

    addDownloadLink(
      `/Academy/s/referenceMeterials/downloadslidecoursedoc/${match[2]}`,
      match[1] === 'downloadslidecoursedoc' ? 'slidecoursedoc' : 'coursedoc',
      element,
      match[2]
    );
  });

  $('a[href*="referenceMeterials"], a[href*="download"]').each((index, element) => {
    const href = $(element).attr('href') || '';
    if (href.includes('downloadslidecoursedoc') || href.includes('downloadcoursedoc')) {
      const linkText = $(element).text().trim();
      addDownloadLink(href, 'direct', element);
    }
  });

  return downloadLinks;
};

export const resolveDownloadUrl = (url) => {
  const BASE_URL = 'https://www.pesuacademy.com';
  
  if (url.startsWith('/Academy')) {
    return `${BASE_URL}${url}`;
  } else if (url.startsWith('http')) {
    return url;
  } else {
    return `${BASE_URL}/Academy/${url.replace(/^\//, '')}`;
  }
};

export const parseAttendance = (htmlData) => {
  if (!htmlData || typeof htmlData !== 'string') return [];
  
  const $ = load(htmlData);
  const attendance = [];
  
  $('tbody#subjetInfo tr').each((index, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;
    
    const courseCode = $(cells[0]).text().trim();
    const courseName = $(cells[1]).text().trim();
    const classesText = $(cells[2]).text().trim(); // "65/80" or "NA"
    const percentageText = $(cells[3]).text().trim();  // "81" or "NA"
    
    let attended = null, total = null;
    if (classesText !== 'NA' && classesText.includes('/')) {
      const [att, tot] = classesText.split('/');
      attended = parseInt(att, 10);
      total = parseInt(tot, 10);
    }
    
    attendance.push({
      courseCode,
      courseName,
      attended,
      total,
      percentage: percentageText === 'NA' ? null : parseInt(percentageText, 10),
      classesText
    });
  });
  
  return attendance;
};

export const parseGpaData = (htmlData) => {
   
   if (!htmlData || typeof htmlData !== 'string') {
     console.warn("[PARSE-GPA] Invalid input - returning zeros");
     return { earnedCredits: 0, totalCredits: 0, sgpa: 0, cgpa: 0 };
   }

   const $ = load(htmlData);
   
   let earnedCredits = 0;
   let totalCredits = 0;
   let sgpa = 0;
   let cgpa = 0;

   
   const infoBar = $('.info-contents .dashboard-info-bar').first();
   
   if (infoBar.length === 0) {
     const allH6 = $('h6');
     const infoDivs = $('[class*="info"]');
   }

   const childDivs = infoBar.find('> div');
   
   childDivs.each((i, div) => {
     const h6Text = $(div).find('h6').text().trim();
     const value = $(div).clone().children().remove().end().text().trim();
     
     if (h6Text === 'Earned Credits') {
       const match = value.match(/([\d.]+)\s*\/\s*([\d.]+)/);
       if (match) {
         earnedCredits = parseFloat(match[1]) || 0;
         totalCredits = parseFloat(match[2]) || 0;
       }
     } else if (h6Text === 'SGPA') {
       sgpa = parseFloat(value) || 0;
     } else if (h6Text === 'CGPA') {
       cgpa = parseFloat(value) || 0;
     }
   });

   const result = { earnedCredits, totalCredits, sgpa, cgpa };
   
   return result;
};

const PROFILE_HEADER_TO_KEY = {
  "Name": "name",
  "PRN": "prn",
  "SRN": "srn",
  "Program": "program",
  "Branch": "branch",
  "Semester": "semester",
  "Section": "section",
};

export const parseUserProfile = (htmlData) => {
  if (!htmlData || (typeof htmlData === 'string' && !htmlData.trim())) {
    return null;
  }

  const $ = load(htmlData);
  const profile = {};

  const detailsContainer = $('div.elem-info-wrapper');
  if (detailsContainer.length === 0) {
    console.warn("Profile container (div.elem-info-wrapper) not found");
    return null;
  }

  const formGroups = detailsContainer.find('div.form-group');
  if (formGroups.length < 7) {
    console.warn(`Expected at least 7 form groups, found ${formGroups.length}`);
  }

  formGroups.each((index, group) => {
    const keyLabel = $(group).find('label.lbl-title-light').first();
    const key = keyLabel.text().trim();
    
    const valueLabel = keyLabel.next('label');
    const value = valueLabel.text().trim();

    if (key && value) {
      const mappedKey = PROFILE_HEADER_TO_KEY[key];
      if (mappedKey) {
        profile[mappedKey] = value;
      }
    }
  });

  const emailInput = $('#updateMail');
  if (emailInput.length > 0) {
    const email = emailInput.attr('value') || emailInput.val();
    if (email && typeof email === 'string') {
      profile.email = email.trim();
    }
  }

  const phoneInput = $('#updateContact');
  if (phoneInput.length > 0) {
    const phone = phoneInput.attr('value') || phoneInput.val();
    if (phone && typeof phone === 'string') {
      profile.phone = phone.trim();
    }
  }

  if (profile.prn) {
    const campusMatch = profile.prn.match(/^PES(\d)/);
    if (campusMatch) {
      const campusCode = campusMatch[1];
      profile.campusCode = parseInt(campusCode, 10);
      if (campusCode === '1') {
        profile.campus = 'RR';
      } else if (campusCode === '2') {
        profile.campus = 'EC';
      }
    }
  }

  return Object.keys(profile).length > 0 ? profile : null;
};

const SUPERSCRIPT_CHARS = {
  '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074',
  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
  '+': '\u207a', '-': '\u207b', '=': '\u207c', '(': '\u207d', ')': '\u207e',
  'n': '\u207f', 'i': '\u2071',
};

const SUBSCRIPT_CHARS = {
  '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084',
  '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089',
  '+': '\u208a', '-': '\u208b', '=': '\u208c', '(': '\u208d', ')': '\u208e',
};

const MATH_ACCENTS = new Set(['\u00af', '^', '~', '\u2192', '\u02d9']);

const normalizeMathText = (value) => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const scriptText = (value, charMap, marker) => {
  const text = normalizeMathText(value);
  if (!text) {
    return '';
  }

  const chars = Array.from(text);
  if (chars.every((char) => charMap[char])) {
    return chars.map((char) => charMap[char]).join('');
  }

  return text.length === 1 ? `${marker}${text}` : `${marker}(${text})`;
};

const wrapMathOperand = (value) => (value.length > 1 ? `(${value})` : value);

const mathMlToText = ($, element) => {
  if (!element || element.type !== 'tag') {
    return '';
  }

  const tag = element.tagName.toLowerCase();
  const children = (element.children || []).filter((child) => child.type === 'tag');
  const childText = () => children.map((child) => mathMlToText($, child)).join('');

  switch (tag) {
    case 'mi':
    case 'mn':
    case 'mo':
    case 'mtext':
    case 'ms':
      return normalizeMathText($(element).text());
    case 'mspace':
      return ' ';
    case 'mphantom':
    case 'annotation':
    case 'annotation-xml':
      return '';
    case 'semantics': {
      const contentChild = children.find((child) => {
        const childTag = child.tagName.toLowerCase();
        return childTag !== 'annotation' && childTag !== 'annotation-xml';
      });
      return contentChild ? mathMlToText($, contentChild) : '';
    }
    case 'msup': {
      const base = children[0] ? mathMlToText($, children[0]) : '';
      const sup = children[1] ? mathMlToText($, children[1]) : '';
      return `${base}${scriptText(sup, SUPERSCRIPT_CHARS, '^')}`;
    }
    case 'msub': {
      const base = children[0] ? mathMlToText($, children[0]) : '';
      const sub = children[1] ? mathMlToText($, children[1]) : '';
      return `${base}${scriptText(sub, SUBSCRIPT_CHARS, '_')}`;
    }
    case 'msubsup': {
      const base = children[0] ? mathMlToText($, children[0]) : '';
      const sub = children[1] ? mathMlToText($, children[1]) : '';
      const sup = children[2] ? mathMlToText($, children[2]) : '';
      return `${base}${scriptText(sub, SUBSCRIPT_CHARS, '_')}${scriptText(sup, SUPERSCRIPT_CHARS, '^')}`;
    }
    case 'mfrac': {
      const numerator = children[0] ? mathMlToText($, children[0]) : '';
      const denominator = children[1] ? mathMlToText($, children[1]) : '';
      return `${wrapMathOperand(numerator)}/${wrapMathOperand(denominator)}`;
    }
    case 'msqrt': {
      const body = childText();
      return body.length === 1 ? `\u221a${body}` : `\u221a(${body})`;
    }
    case 'mroot': {
      const body = children[0] ? mathMlToText($, children[0]) : '';
      const index = children[1] ? mathMlToText($, children[1]) : '';
      const rootIndex = scriptText(index, SUPERSCRIPT_CHARS, '^');
      return `${rootIndex}\u221a${body.length === 1 ? body : `(${body})`}`;
    }
    case 'munder':
    case 'mover':
    case 'munderover': {
      const base = children[0] ? mathMlToText($, children[0]) : '';
      const scripts = children.slice(1)
        .map((child) => normalizeMathText(mathMlToText($, child)))
        .filter(Boolean)
        .map((script) => (MATH_ACCENTS.has(script) ? script : `(${script})`))
        .join('');
      return `${base}${scripts}`;
    }
    case 'mtable': {
      const rows = children.filter((child) => child.tagName.toLowerCase() === 'mtr');
      if (rows.length === 0) {
        return children.map((child) => mathMlToText($, child)).join('; ');
      }
      return rows.map((row) => {
        const cells = (row.children || [])
          .filter((child) => child.type === 'tag' && child.tagName.toLowerCase() === 'mtd');
        return cells.map((cell) => mathMlToText($, cell)).join(', ');
      }).join('; ');
    }
    case 'mfenced': {
      const open = $(element).attr('open');
      const close = $(element).attr('close');
      const separators = $(element).attr('separators');
      const separator = separators == null || separators === '' ? ',' : separators[0];
      return `${open == null ? '(' : open}${children.map((child) => mathMlToText($, child)).join(separator)}${close == null ? ')' : close}`;
    }
    default:
      return childText();
  }
};

const isTextContentImageSrc = (src) => {
  if (!src) {
    return false;
  }

  return /^data:image\/(png|jpe?g)[;,]/i.test(src)
    || /^https?:\/\//i.test(src)
    || src.startsWith('/Academy/');
};

const resolveTextContentImageSrc = (src) => {
  if (!isTextContentImageSrc(src)) {
    return null;
  }

  return src.startsWith('/Academy/') ? resolveDownloadUrl(src) : src;
};

const INLINE_IMAGE_MAX_HEIGHT_PT = 36;
const PX_TO_PT = 0.75;

const parseCssLengthInPoints = (value) => {
  const match = /^\s*([\d.]+)\s*(pt|px)?\s*$/i.exec(String(value || ''));
  if (!match) {
    return null;
  }

  const amount = parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return (match[2] || 'px').toLowerCase() === 'pt' ? amount : amount * PX_TO_PT;
};

const readStyleLength = (style, property) => {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i').exec(style || '');
  return match ? parseCssLengthInPoints(match[1]) : null;
};

const readPngDataUriSize = (src) => {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]{32,})/i.exec(src || '');
  if (!match) {
    return null;
  }

  try {
    const header = atob(match[1].slice(0, 32));
    if (header.slice(12, 16) !== 'IHDR') {
      return null;
    }
    const readUint32 = (offset) => ((header.charCodeAt(offset) << 24) >>> 0)
      + (header.charCodeAt(offset + 1) << 16)
      + (header.charCodeAt(offset + 2) << 8)
      + header.charCodeAt(offset + 3);
    const width = readUint32(16);
    const height = readUint32(20);
    return width > 0 && height > 0 ? { width: width * PX_TO_PT, height: height * PX_TO_PT } : null;
  } catch {
    return null;
  }
};

const getInlineImageSize = ($image, src) => {
  const style = $image.attr('style');
  const width = readStyleLength(style, 'width') ?? parseCssLengthInPoints($image.attr('width'));
  const height = readStyleLength(style, 'height') ?? parseCssLengthInPoints($image.attr('height'));
  const size = width && height ? { width, height } : readPngDataUriSize(src);

  return size && size.height <= INLINE_IMAGE_MAX_HEIGHT_PT ? size : null;
};

const normalizeInlineText = (value) => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t\r\n]+/g, ' ');

const mergeRun = (runs, run) => {
  const previous = runs[runs.length - 1];
  if (previous && previous.text && run.text && !previous.sup && !previous.sub
    && !run.sup && !run.sub && Boolean(previous.bold) === Boolean(run.bold)) {
    previous.text += run.text;
    return;
  }
  runs.push(run);
};

const trimParagraphRuns = (runs) => {
  const trimmed = runs.map((run) => ({ ...run }));

  while (trimmed.length > 0 && trimmed[0].text && !trimmed[0].text.trim()) {
    trimmed.shift();
  }
  if (trimmed.length > 0 && trimmed[0].text) {
    trimmed[0].text = trimmed[0].text.replace(/^[ \t\r\n]+/, '');
  }

  while (trimmed.length > 0 && trimmed[trimmed.length - 1].text && !trimmed[trimmed.length - 1].text.trim()) {
    trimmed.pop();
  }
  if (trimmed.length > 0 && trimmed[trimmed.length - 1].text) {
    trimmed[trimmed.length - 1].text = trimmed[trimmed.length - 1].text.replace(/[ \t\r\n]+$/, '');
  }

  return trimmed.filter((run) => run.image || (run.text && run.text.length > 0));
};

const tightenPunctuationAfterImages = (runs) => runs.map((run, index) => {
  if (!run.text || !runs[index - 1]?.image) {
    return run;
  }
  return { ...run, text: run.text.replace(/^[ \t]+(?=[,.;:?!)])/, '') };
});

export const parseTextContent = (htmlData) => {
  if (!htmlData || typeof htmlData !== 'string' || !htmlData.trim()) {
    return null;
  }

  const $ = load(htmlData);

  $('script, style, iframe, .link-preview, [onclick*="loadIframe"]').remove();
  $('.form-horizontal, .gutter-v').remove();
  $('small').each((index, element) => {
    if ($(element).text().trim().startsWith('Uploaded By')) {
      $(element).remove();
    }
  });
  $('*').contents().each((index, node) => {
    if (node.type === 'comment') {
      $(node).remove();
    }
  });
  $('p').each((index, element) => {
    if (!$(element).text().trim() && $(element).find('img, math').length === 0) {
      $(element).remove();
    }
  });

  const areas = $('.content-type-area')
    .filter((index, element) => $(element).parents('.content-type-area').length === 0)
    .toArray();
  if (areas.length === 0) {
    return null;
  }

  const root = $(areas[0]);
  const titleElement = root.find('h4').first();
  const title = titleElement.length > 0 ? normalizeMathText(titleElement.text()) : '';
  if (titleElement.length > 0) {
    titleElement.remove();
  }

  const blocks = [];
  let runs = [];

  const pushParagraph = (paragraphRuns) => {
    const finalRuns = tightenPunctuationAfterImages(trimParagraphRuns(paragraphRuns));
    if (finalRuns.some((run) => run.image || (run.text && run.text.trim()))) {
      blocks.push({ type: 'paragraph', runs: finalRuns });
    }
  };

  const flush = () => {
    if (runs.length === 0) {
      return;
    }

    const hasText = runs.some((run) => run.text && run.text.trim());
    let paragraphRuns = [];
    for (const run of runs) {
      if (run.image && hasText && run.inlineSize) {
        paragraphRuns.push({ image: run.image, width: run.inlineSize.width, height: run.inlineSize.height });
        continue;
      }
      if (run.image) {
        pushParagraph(paragraphRuns);
        paragraphRuns = [];
        blocks.push({ type: 'image', src: run.image });
        continue;
      }
      paragraphRuns.push(run);
    }
    pushParagraph(paragraphRuns);
    runs = [];
  };

  const addRun = (run) => {
    if (run.image || (run.text && run.text.length > 0)) {
      mergeRun(runs, run);
    }
  };

  const addText = (value, style = {}) => {
    const text = normalizeInlineText(value);
    if (text) {
      addRun({ text, ...style });
    }
  };

  const collectInline = (element, style = {}) => {
    for (const child of element.children || []) {
      if (child.type === 'text') {
        addText(child.data, style);
        continue;
      }
      if (child.type !== 'tag') {
        continue;
      }

      const childTag = child.tagName.toLowerCase();
      if (childTag === 'script' || childTag === 'style') {
        continue;
      }
      if (childTag === 'small' && $(child).text().trim().startsWith('Uploaded By')) {
        continue;
      }
      if (childTag === 'br') {
        addRun({ text: '\n' });
        continue;
      }
      if (childTag === 'img') {
        const src = resolveTextContentImageSrc($(child).attr('src'));
        if (src) {
          addRun({ image: src, inlineSize: getInlineImageSize($(child), src) });
        }
        continue;
      }
      if (childTag === 'math') {
        const mathText = mathMlToText($, child);
        if (mathText) {
          addRun({ text: mathText, ...style });
        }
        continue;
      }

      const nextStyle = { ...style };
      if (childTag === 'strong' || childTag === 'b') {
        nextStyle.bold = true;
      }
      if (childTag === 'sup') {
        nextStyle.sup = true;
      }
      if (childTag === 'sub') {
        nextStyle.sub = true;
      }
      collectInline(child, nextStyle);
    }
  };

  const blockTags = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'ul', 'ol', 'blockquote', 'section', 'article', 'pre']);

  const walk = (element) => {
    for (const child of element.children || []) {
      if (child.type === 'text') {
        addText(child.data);
        continue;
      }
      if (child.type !== 'tag') {
        continue;
      }

      const childTag = child.tagName.toLowerCase();
      if (childTag === 'script' || childTag === 'style' || childTag === 'iframe') {
        continue;
      }
      if ($(child).is('.content-type-area')) {
        flush();
        walk(child);
        continue;
      }
      if (childTag === 'img') {
        flush();
        const src = resolveTextContentImageSrc($(child).attr('src'));
        if (src) {
          blocks.push({ type: 'image', src });
        }
        continue;
      }
      if (childTag === 'br') {
        addRun({ text: '\n' });
        continue;
      }
      if (childTag === 'math') {
        const mathText = mathMlToText($, child);
        if (mathText) {
          addRun({ text: mathText });
        }
        continue;
      }
      if (blockTags.has(childTag)) {
        const hasNestedBlock = Array.from(child.children || []).some((grandChild) => (
          grandChild.type === 'tag'
          && (blockTags.has(grandChild.tagName.toLowerCase()) || $(grandChild).is('.content-type-area'))
        ));

        if (hasNestedBlock) {
          flush();
          walk(child);
          continue;
        }

        flush();
        if (childTag === 'li') {
          addRun({ text: '\u2022 ' });
        }
        const style = /^h[1-6]$/.test(childTag) ? { bold: true } : {};
        collectInline(child, style);
        flush();
        continue;
      }

      collectInline(child);
    }
  };

  areas.forEach((area, index) => {
    const firstBlockIndex = blocks.length;
    walk(area);
    flush();
    if (index > 0 && blocks[firstBlockIndex]) {
      blocks[firstBlockIndex].sectionBreak = true;
    }
  });

  const hasMeaningfulContent = blocks.some((block) => block.type === 'image'
    || (block.runs || []).some((run) => run.text && run.text.trim()));

  if (!hasMeaningfulContent) {
    return null;
  }

  return { title: title || null, blocks };
};
