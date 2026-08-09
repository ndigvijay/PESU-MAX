import * as cheerio from 'cheerio';
import { load } from 'cheerio';

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
    $(row).find('[onclick*="handleclasscoursecontentunit"]').each((linkIndex, link) => {
      const onclick = $(link).attr('onclick') || '';
      const match = onclick.match(/handleclasscoursecontentunit\s*\([^,]+,[^,]+,[^,]+,[^,]+,\s*(\d+)/i);
      const type = Number(match?.[1]);
      if (Number.isInteger(type) && !contentTypes.includes(type)) {
        contentTypes.push(type);
      }
    });

    classes.push({
      id: cleanId(rowMatch[1]),
      courseId: cleanId(rowMatch[2]),
      unitId: cleanId(rowMatch[3]),
      classNo: cleanId(rowMatch[4]),
      className,
      classType: 'Lecture',
      contentTypes
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
