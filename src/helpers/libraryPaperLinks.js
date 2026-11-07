import { LIBRARY_COURSE_PREFIXES, LIBRARY_PAPER_OVERRIDES } from "./libraryMapping.js";

const PAPER_DIRECTORY = "digital/qp/";
const FILE_FORMS = ["DL", "dl", "D", "", "DLL", "DLdl"];
const SCHEME_PATTERN = /^[A-Z]{2}\d{2}(?=[A-Z])/;
const FORM_SUFFIX_PATTERN = /(DLdl|DLL|DL|dl|D)$/;
const COURSE_KEY_PATTERN = /^[A-Z]{2,4}\d{3}[A-Z0-9]{1,3}$/;

export function subjectKeyFromCourseCode(courseCode) {
  const code = String(courseCode || "").trim().toUpperCase();
  const subjectKey = code.replace(SCHEME_PATTERN, "");
  return subjectKey.length >= 4 ? subjectKey : code;
}

export function courseKeyFromQuery(query) {
  const cleaned = String(query || "").trim().toUpperCase().replace(/\)+$/, "");
  if (!cleaned) {
    return "";
  }

  const subjectKey = subjectKeyFromCourseCode(cleaned);
  return COURSE_KEY_PATTERN.test(subjectKey) ? subjectKey : "";
}

export function librarySearchTitle(query) {
  const courseKey = courseKeyFromQuery(query);
  return courseKey ? `${courseKey})` : String(query || "");
}

export function subjectNameForCourseQuery(query, course) {
  const queryKey = courseKeyFromQuery(query);
  const courseKey = courseKeyFromQuery(course?.searchCode);
  if (!queryKey || queryKey !== courseKey) {
    return "";
  }

  return String(course?.subjectName || "").trim();
}

export function recordNumberFromId(recordId) {
  return (String(recordId || "").match(/DL\s*(\d+)/i) || [])[1] || "";
}

export function prefixFromPaperPath(paperPath, recordNumber) {
  const path = String(paperPath || "");
  const fileName = path.split("/").pop().replace(/\.pdf$/i, "");
  if (!path.startsWith(PAPER_DIRECTORY) || !recordNumber || !fileName.endsWith(recordNumber)) {
    return "";
  }

  return fileName.slice(0, -recordNumber.length).replace(FORM_SUFFIX_PATTERN, "");
}

const tablePrefixesBySubject = Object.entries(LIBRARY_COURSE_PREFIXES).reduce(
  (bySubject, [courseCode, prefixes]) => {
    const subjectKey = subjectKeyFromCourseCode(courseCode);
    bySubject[subjectKey] = [...(bySubject[subjectKey] || []), ...prefixes];
    return bySubject;
  },
  {}
);

export function knownPrefixesForCourse(courseCode, learnedPrefixes = {}) {
  const subjectKey = subjectKeyFromCourseCode(courseCode);
  return [...new Set([
    ...(learnedPrefixes[subjectKey] || []),
    ...(LIBRARY_COURSE_PREFIXES[courseCode] || []),
    ...(tablePrefixesBySubject[subjectKey] || [])
  ])];
}

export function rankSearchPrefixes(papers, learnedPrefixes = {}) {
  const prefixCounts = {};
  for (const paper of papers) {
    for (const prefix of knownPrefixesForCourse(paper.courseCode, learnedPrefixes)) {
      prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
    }
  }

  return Object.keys(prefixCounts).sort((first, second) => prefixCounts[second] - prefixCounts[first]);
}

export function buildPaperPathCandidates(recordNumber, prefixes) {
  if (!recordNumber) {
    return [];
  }

  const override = LIBRARY_PAPER_OVERRIDES[recordNumber];
  const uniquePrefixes = [...new Set(prefixes)];
  const guessedPaths = FILE_FORMS.flatMap((form) => (
    uniquePrefixes.map((prefix) => `${PAPER_DIRECTORY}${prefix}${form}${recordNumber}.pdf`)
  ));

  return [...new Set([...(override ? [override] : []), ...guessedPaths])];
}
