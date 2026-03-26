import * as cheerio from "cheerio";
import { load, save } from "../utils/storage.js";

const LIBRARY_BASE_URL = "http://library.pes.edu";
const LOGIN_URL = `${LIBRARY_BASE_URL}/MyPage.aspx`;
const SEARCH_URL = `${LIBRARY_BASE_URL}/Search.aspx`;

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  if (!value) {
    return "";
  }

  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function decodeBase64(value) {
  if (!value) {
    return "";
  }

  try {
    return atob(value).trim();
  } catch (error) {
    throw new Error("Invalid base64 credential format");
  }
}

function sanitizeFilename(name) {
  return normalizeText(name)
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

function toAbsoluteLibraryUrl(pathOrUrl) {
  if (!pathOrUrl) {
    return "";
  }

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return `${LIBRARY_BASE_URL}/${pathOrUrl.replace(/^\/+/, "")}`;
}

function extractHiddenField(html, fieldName) {
  if (!html) {
    return "";
  }

  const patterns = [
    new RegExp(`name=["']${fieldName}["'][^>]*value=["']([^"']*)["']`, "i"),
    new RegExp(`id=["']${fieldName}["'][^>]*value=["']([^"']*)["']`, "i"),
    new RegExp(`value=["']([^"']*)["'][^>]*name=["']${fieldName}["']`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return "";
}

function extractDeltaHiddenField(payload, fieldName) {
  if (!payload) {
    return "";
  }

  const pattern = new RegExp(`\\|hiddenField\\|${fieldName}\\|([^|]*)\\|`, "i");
  const match = payload.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : "";
}

function extractAspNetFields(html) {
  return {
    viewState: extractHiddenField(html, "__VIEWSTATE"),
    eventValidation: extractHiddenField(html, "__EVENTVALIDATION"),
    viewStateGenerator: extractHiddenField(html, "__VIEWSTATEGENERATOR")
  };
}

function extractAspNetFieldsFromDelta(payload) {
  return {
    viewState: extractDeltaHiddenField(payload, "__VIEWSTATE"),
    eventValidation: extractDeltaHiddenField(payload, "__EVENTVALIDATION"),
    viewStateGenerator: extractDeltaHiddenField(payload, "__VIEWSTATEGENERATOR")
  };
}

function isAuthenticatedPage(html) {
  const normalizedHtml = (html || "").toLowerCase();
  return normalizedHtml.includes("lnklogout") || normalizedHtml.includes("logged in as");
}

function inferSemesterFromCode(code) {
  if (!code) {
    return null;
  }

  const numberMatch = code.match(/(\d{3})/);
  if (!numberMatch) {
    return null;
  }

  const number = numberMatch[1];
  const group = parseInt(number[0], 10);
  if (Number.isNaN(group)) {
    return null;
  }

  const suffix = code.split(number)[1] || "";
  const sectionMatch = suffix.match(/[A-Z]/);
  if (!sectionMatch) {
    return null;
  }

  const baseSemester = (group - 1) * 2 + 1;
  return sectionMatch[0] === "A" ? baseSemester : baseSemester + 1;
}

async function getLibraryAuthCookie() {
  return new Promise((resolve) => {
    chrome.cookies.get(
      { url: `${LIBRARY_BASE_URL}/`, name: ".ASPXFORMSAUTH" },
      (cookie) => resolve(cookie || null)
    );
  });
}

async function saveLibraryAuth(details) {
  const current = (await load("libraryAuth")) || {};
  await save("libraryAuth", {
    ...current,
    ...details,
    updatedAt: Date.now()
  });
}

async function openSearchPage() {
  const response = await fetch(SEARCH_URL, {
    method: "GET",
    credentials: "include"
  });

  const html = await response.text();
  return {
    html,
    fields: extractAspNetFields(html)
  };
}

async function loginToLibrary(encodedMemberId, encodedPassword) {
  const memberId = decodeBase64(encodedMemberId);
  const password = decodeBase64(encodedPassword);

  if (!memberId || !password) {
    throw new Error("Missing library credentials");
  }

  const loginPageResponse = await fetch(LOGIN_URL, {
    method: "GET",
    credentials: "include"
  });

  const loginPageHtml = await loginPageResponse.text();
  const tokens = extractAspNetFields(loginPageHtml);

  if (!tokens.viewState || !tokens.eventValidation) {
    throw new Error("Unable to read library login tokens");
  }

  const formData = new URLSearchParams({
    __VIEWSTATE: tokens.viewState,
    __VIEWSTATEGENERATOR: tokens.viewStateGenerator,
    __EVENTVALIDATION: tokens.eventValidation,
    txtMemberid: memberId,
    txtPassword: password,
    signin: "Sign In"
  });

  const loginResponse = await fetch(LOGIN_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString(),
    redirect: "follow"
  });

  const loginResultHtml = await loginResponse.text();
  const authCookie = await getLibraryAuthCookie();
  const loginSucceeded = Boolean(authCookie?.value) || isAuthenticatedPage(loginResultHtml);

  if (!loginSucceeded) {
    throw new Error("Library login failed");
  }

  const searchPage = await openSearchPage();
  const searchFields = searchPage.fields;

  const authDetails = {
    isAuthenticated: true,
    cookieName: ".ASPXFORMSAUTH",
    cookieValue: authCookie?.value || "",
    loginUrl: loginResponse.url,
    viewState: searchFields.viewState,
    eventValidation: searchFields.eventValidation,
    viewStateGenerator: searchFields.viewStateGenerator,
    loggedInAt: Date.now()
  };

  await saveLibraryAuth(authDetails);

  return authDetails;
}

async function ensureLibrarySession(encodedMemberId, encodedPassword) {
  const existingCookie = await getLibraryAuthCookie();
  const searchPage = await openSearchPage();

  if (existingCookie?.value && isAuthenticatedPage(searchPage.html)) {
    const authDetails = {
      isAuthenticated: true,
      cookieName: ".ASPXFORMSAUTH",
      cookieValue: existingCookie.value,
      viewState: searchPage.fields.viewState,
      eventValidation: searchPage.fields.eventValidation,
      viewStateGenerator: searchPage.fields.viewStateGenerator
    };

    await saveLibraryAuth(authDetails);
    return authDetails;
  }

  return loginToLibrary(encodedMemberId, encodedPassword);
}

function parseResultRow($, rowElement, index) {
  const row = $(rowElement);

  const title = normalizeText(
    row
      .find("span")
      .filter((_, el) => {
        const style = ($(el).attr("style") || "").toLowerCase();
        return style.includes("font-weight") && style.includes("bold");
      })
      .first()
      .text()
  );

  if (!title) {
    return null;
  }

  const downloadAnchor = row.find("a[onclick*='fnDownload']").first();
  const onclick = decodeHtmlEntities(downloadAnchor.attr("onclick") || "");
  const downloadMatch = onclick.match(/fnDownload\('([^']+)'\)/i) || onclick.match(/fnDownload\("([^"]+)"\)/i);
  const downloadPath = downloadMatch?.[1] || "";

  const yearLabel = row
    .find("span")
    .filter((_, el) => normalizeText($(el).text()).startsWith("Year,Ed:"))
    .first();
  const yearEdition = normalizeText(yearLabel.next("span").first().text());

  const idLabel = row
    .find("span")
    .filter((_, el) => normalizeText($(el).text()).startsWith("ID:"))
    .first();
  const recordId = normalizeText(idLabel.next("span").first().text());

  const callNoLabel = row
    .find("span")
    .filter((_, el) => normalizeText($(el).text()).startsWith("Call_No:"))
    .first();
  const callNo = normalizeText(callNoLabel.next("span").first().text());

  const statusContainerText = normalizeText(
    row
      .find("span")
      .filter((_, el) => normalizeText($(el).text()).startsWith("Status:"))
      .first()
      .parent()
      .text()
  );
  const statusMatch = statusContainerText.match(/Status:\s*([A-Za-z]+)/i);
  const status = statusMatch?.[1] || "Unknown";

  const courseCodeMatch = title.match(/\(([A-Z0-9]+)\)\s*$/i);
  const courseCode = courseCodeMatch?.[1] || "";

  return {
    id: `${downloadPath || title}-${index}`,
    title,
    courseCode,
    yearEdition,
    recordId,
    callNo,
    status,
    downloadPath,
    downloadUrl: toAbsoluteLibraryUrl(downloadPath)
  };
}

function parseSearchResults(payload, query) {
  const $ = cheerio.load(payload || "");
  const parsedResults = [];

  $("#GridView1 tr").each((index, row) => {
    const parsedRow = parseResultRow($, row, index);
    if (parsedRow) {
      parsedResults.push(parsedRow);
    }
  });

  const labelTotal = parseInt(normalizeText($("#Label2").first().text()), 10);
  const regexTotalMatch = payload.match(/Total Search Results:\s*<span[^>]*>\s*(\d+)\s*<\/span>/i);
  const regexTotal = regexTotalMatch ? parseInt(regexTotalMatch[1], 10) : NaN;

  return {
    query,
    totalResults: Number.isFinite(labelTotal)
      ? labelTotal
      : (Number.isFinite(regexTotal) ? regexTotal : parsedResults.length),
    results: parsedResults
  };
}

function buildSearchPayload({ query, viewState, eventValidation, viewStateGenerator }) {
  return new URLSearchParams({
    ToolkitScriptManager1: "UpdatePanel1|cmdSearch",
    __EVENTTARGET: "",
    __EVENTARGUMENT: "",
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGenerator,
    __VIEWSTATEENCRYPTED: "",
    __EVENTVALIDATION: eventValidation,
    txtMemberid: "",
    txtPassword: "",
    txtTitle: query,
    txtAuthor: "",
    txtYear: "",
    txtSubject: "",
    txtCallno: "",
    txtPublisher: "",
    cmbCategory: "",
    txtLocation: "",
    txtEdition: "",
    txtAccessNo: "",
    __ASYNCPOST: "true",
    cmdSearch: "Search"
  });
}

function arrayBufferToBase64(arrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function triggerBrowserDownload(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(downloadId);
      }
    );
  });
}

export async function getPyqCourseCatalog() {
  const [pesuData, semestersData] = await Promise.all([
    load("pesuData"),
    load("semestersData")
  ]);

  const rawSubjects = Object.values(pesuData?.subjects || {});
  const uniqueCourses = new Map();

  for (const subject of rawSubjects) {
    const subjectCode = normalizeText(subject.subjectCode);
    const subjectName = normalizeText(subject.subjectName);
    const semester = subject.semester ?? inferSemesterFromCode(subjectCode);

    if (!subjectCode || !subjectName || !semester) {
      continue;
    }

    const dedupeKey = `${semester}-${subjectCode}`;
    if (!uniqueCourses.has(dedupeKey)) {
      uniqueCourses.set(dedupeKey, {
        id: dedupeKey,
        subjectId: subject.id,
        subjectCode,
        subjectName,
        semester,
        semesterLabel: `Semester ${semester}`
      });
    }
  }

  const courses = Array.from(uniqueCourses.values()).sort((first, second) => {
    if (first.semester !== second.semester) {
      return first.semester - second.semester;
    }

    return first.subjectCode.localeCompare(second.subjectCode);
  });

  const semesterSet = new Set(courses.map((course) => course.semester));
  const fallbackSemesters = Array.from(semesterSet)
    .sort((first, second) => first - second)
    .map((number) => ({ value: String(number), label: `Semester ${number}`, number }));

  const semesters = (semestersData || [])
    .map((semester) => ({
      value: String(semester.number),
      label: `Semester ${semester.number}`,
      number: semester.number
    }))
    .filter((semester) => semesterSet.has(semester.number));

  return {
    semesters: semesters.length > 0 ? semesters : fallbackSemesters,
    courses
  };
}

export async function loginLibraryWithCredentials({ encodedMemberId, encodedPassword }) {
  return loginToLibrary(encodedMemberId, encodedPassword);
}

export async function searchLibraryPyqs({ query, encodedMemberId, encodedPassword }) {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) {
    throw new Error("Search query is required");
  }

  const auth = await ensureLibrarySession(encodedMemberId, encodedPassword);

  const searchPage = await openSearchPage();
  const viewState = searchPage.fields.viewState || auth.viewState;
  const eventValidation = searchPage.fields.eventValidation || auth.eventValidation;
  const viewStateGenerator = searchPage.fields.viewStateGenerator || auth.viewStateGenerator;

  if (!viewState || !eventValidation) {
    throw new Error("Unable to fetch library search tokens");
  }

  const payload = buildSearchPayload({
    query: cleanQuery,
    viewState,
    eventValidation,
    viewStateGenerator
  });

  const searchResponse = await fetch(SEARCH_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "X-MicrosoftAjax": "Delta=true"
    },
    body: payload.toString()
  });

  const responseText = await searchResponse.text();
  const parsed = parseSearchResults(responseText, cleanQuery);
  const deltaFields = extractAspNetFieldsFromDelta(responseText);
  const cookie = await getLibraryAuthCookie();

  await saveLibraryAuth({
    isAuthenticated: true,
    cookieName: ".ASPXFORMSAUTH",
    cookieValue: cookie?.value || auth.cookieValue || "",
    viewState: deltaFields.viewState || viewState,
    eventValidation: deltaFields.eventValidation || eventValidation,
    viewStateGenerator: deltaFields.viewStateGenerator || viewStateGenerator,
    lastQuery: cleanQuery,
    totalResults: parsed.totalResults
  });

  return parsed;
}

export async function downloadLibraryPyq({
  downloadPath,
  title,
  encodedMemberId,
  encodedPassword
}) {
  const absoluteUrl = toAbsoluteLibraryUrl(downloadPath);
  if (!absoluteUrl) {
    throw new Error("Invalid download URL");
  }

  await ensureLibrarySession(encodedMemberId, encodedPassword);

  const fileResponse = await fetch(absoluteUrl, {
    method: "GET",
    credentials: "include"
  });

  if (!fileResponse.ok) {
    throw new Error(`Unable to download file (HTTP ${fileResponse.status})`);
  }

  const fileBlob = await fileResponse.blob();
  const fileBuffer = await fileBlob.arrayBuffer();
  const fileBase64 = arrayBufferToBase64(fileBuffer);
  const mimeType = (fileResponse.headers.get("Content-Type") || "application/pdf").split(";")[0];
  const dataUrl = `data:${mimeType};base64,${fileBase64}`;

  const fallbackName = `PYQ_${Date.now()}`;
  const safeName = sanitizeFilename(title || fallbackName) || fallbackName;
  const hasPdfExtension = safeName.toLowerCase().endsWith(".pdf");
  const fileName = hasPdfExtension ? safeName : `${safeName}.pdf`;
  const downloadId = await triggerBrowserDownload(dataUrl, `PESU_PYQs/${fileName}`);

  return {
    downloadId,
    fileName,
    sourceUrl: absoluteUrl
  };
}
