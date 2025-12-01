import * as cheerio from 'cheerio';
import { load } from 'cheerio';

export const parseSubjectsCode = (data) => {
  const $ = load(data);
  const subjects = [];
  $('option').each((index, element) => {
    const course_id = $(element).attr('value') || ''; 
    const course_name = $(element).text().trim();     
    subjects.push({
      id: course_id,
      subjectCode: course_name.split('-')[0]?.trim() || '',
      subjectName: course_name
    });
  });
  return subjects;
}