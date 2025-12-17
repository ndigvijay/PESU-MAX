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


export const parseCourseUnits = (data) => {
  if (!data || (typeof data === 'string' && !data.trim())) {
    return [];
  }
  
  const $ = load(data);
  const units = [];
  
  $('option').each((index, element) => {
    const unit_id = $(element).attr('value') || '';
    const unit_name = $(element).text().trim();
    
    if (unit_id && unit_name) {
      const unitNumber = unit_name.includes(':') 
        ? unit_name.split(':')[0].trim() 
        : unit_name;
      
      units.push({
        id: cleanId(unit_id),
        unit: unit_name,
        unitNumber: unitNumber
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
  
  $('option').each((index, element) => {
    const class_id = $(element).attr('value') || '';
    const class_name = $(element).text().trim();
    
    if (class_id && class_name) {
      classes.push({
        id: cleanId(class_id),
        className: class_name,
        classType: 'Lecture' 
      });
    }
  });
  
  return classes;
};

export const parseDownloadLinks = (htmlData) => {
  const $ = load(htmlData);
  const downloadLinks = [];

  $('[onclick*="downloadcoursedoc"]').each((index, element) => {
    const onclick = $(element).attr('onclick') || '';
    const match = onclick.match(/downloadcoursedoc\('([^']+)'/);
    if (match) {
      downloadLinks.push({
        url: `/Academy/s/referenceMeterials/downloadcoursedoc/${match[1]}`,
        type: 'coursedoc',
        docId: match[1]
      });
    }
  });

  $('[onclick*="loadIframe"]').each((index, element) => {
    const onclick = $(element).attr('onclick') || '';
    if (onclick.includes('downloadslidecoursedoc')) {
      const match = onclick.match(/loadIframe\('([^']+)'/);
      if (match) {
        const url = match[1].split('#')[0]; 
        downloadLinks.push({
          url: url,
          type: 'slidecoursedoc'
        });
      }
    }
  });

  $('a[href*="referenceMeterials"], a[href*="download"]').each((index, element) => {
    const href = $(element).attr('href') || '';
    if (href.includes('downloadslidecoursedoc') || href.includes('downloadcoursedoc')) {
      downloadLinks.push({
        url: href.split('#')[0], 
        type: 'direct'
      });
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
    console.log("[PARSE-GPA] ========================================");
    return { earnedCredits: 0, totalCredits: 0, sgpa: 0, cgpa: 0 };
  }

  const $ = load(htmlData);
  
  let earnedCredits = 0;
  let totalCredits = 0;
  let sgpa = 0;
  let cgpa = 0;

  
  const infoBar = $('.info-contents .dashboard-info-bar').first();
  
  if (infoBar.length === 0) {
    console.log("Trying alternative selectors...");
    console.log("'.dashboard-info-bar' direct:", $('.dashboard-info-bar').length, "found");
    
    const allH6 = $('h6');
    console.log("All h6 elements found:", allH6.length);
    allH6.each((i, el) => {
      console.log(`h6[${i}]:`, $(el).text().trim());
    });
    
    const infoDivs = $('[class*="info"]');
    console.log("Divs with 'info' in class:", infoDivs.length);
    infoDivs.each((i, el) => {
      if (i < 10) {
        console.log(`info div[${i}] class:`, $(el).attr('class'));
      }
    });
  }

  const childDivs = infoBar.find('> div');
  console.log("Child divs in infoBar:", childDivs.length);
  
  childDivs.each((i, div) => {
    const h6Text = $(div).find('h6').text().trim();
    const value = $(div).clone().children().remove().end().text().trim();
    
    console.log(`Div ${i}: h6="${h6Text}", value="${value}"`);
    
    if (h6Text === 'Earned Credits') {
      const match = value.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      if (match) {
        earnedCredits = parseFloat(match[1]) || 0;
        totalCredits = parseFloat(match[2]) || 0;
        console.log(`Parsed credits: ${earnedCredits}/${totalCredits}`);
      }
    } else if (h6Text === 'SGPA') {
      sgpa = parseFloat(value) || 0;
      console.log(`Parsed SGPA: ${sgpa}`);
    } else if (h6Text === 'CGPA') {
      cgpa = parseFloat(value) || 0;
      console.log(`Parsed CGPA: ${cgpa}`);
    }
  });

  const result = { earnedCredits, totalCredits, sgpa, cgpa };
  console.log("Final result:", JSON.stringify(result));
  
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
