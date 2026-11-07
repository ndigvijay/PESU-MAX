import JSZip from "jszip";
import * as cheerio from "cheerio";
import { load, save } from "../utils/storage.js";
import { parallelBatch } from "../helpers/MiscControllers.js";
import {
  courseKeyFromQuery,
  librarySearchTitle,
  recordNumberFromId,
  subjectKeyFromCourseCode
} from "../helpers/libraryPaperLinks.js";
import {
  readCachedSearch,
  serializeLibraryRequest,
  singleFlight,
  withFileSlot,
  writeCachedSearch
} from "./libraryRequestCache.js";
import {
  LIBRARY_BASE_URL,
  attachPaperLinks,
  findPaperPath,
  rememberPaperLinks,
  toLibraryUrl
} from "./libraryPaperResolver.js";

const LIBRARY_MEMBER_ID = "UEVTMTIwMjEwMDkzMw==";
const LIBRARY_PASSWORD = "UEVTSk5NellyVzk=";
const LOGIN_URL = `${LIBRARY_BASE_URL}/MyPage.aspx`;
const SEARCH_URL = `${LIBRARY_BASE_URL}/Search.aspx`;
const LIBRARY_GRID_EVENT_TARGET = "GridView1";
const LIBRARY_AUTH_COOKIE = ".ASPXFORMSAUTH";
const LOGIN_TOKENS_KEY = "libraryLoginTokens";
const SEARCH_TOKENS_KEY = "librarySearchTokens";
const PYQ_CATEGORY = "Digital Library";
const EAGER_RESULT_LIMIT = 40;
const EAGER_PAGE_LIMIT = 4;
const FULL_SEARCH_PAGE_LIMIT = 10;
const RENAMED_COURSE_PAGE_LIMIT = 3;
const PAPER_CHECK_CONCURRENCY = 3;
const PDF_CACHE_TTL_MS = 15 * 60 * 1000;

let loginInFlight = null;
const libraryRequestCounts = {};

async function trackedLibraryFetch(requestType, url, options) {
  libraryRequestCounts[requestType] = (libraryRequestCounts[requestType] || 0) + 1;
  const startedAt = Date.now();

  try {
    const response = await fetch(url, options);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[PESU-MAX library request]", {
        requestType,
        count: libraryRequestCounts[requestType],
        status: response.status,
        durationMs: Date.now() - startedAt
      });
    }
    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[PESU-MAX library request failed]", {
        requestType,
        count: libraryRequestCounts[requestType],
        durationMs: Date.now() - startedAt
      });
    }
    throw error;
  }
}

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

function extractLoggedInIdentity(payload) {
  const labelMatch = (payload || "").match(
    /<span[^>]*(?:id|name)=["']Label1["'][^>]*>([\s\S]*?)<\/span>/i
  );
  return normalizeText(decodeHtmlEntities((labelMatch?.[1] || "").replace(/<[^>]+>/g, "")));
}

function isGuestPage(payload) {
  return extractLoggedInIdentity(payload).toLowerCase() === "guest";
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
      { url: `${LIBRARY_BASE_URL}/`, name: LIBRARY_AUTH_COOKIE },
      (cookie) => resolve(cookie || null)
    );
  });
}

function hasFormTokens(tokens) {
  return Boolean(tokens?.viewState && tokens?.eventValidation);
}

async function loadFormTokens(storageKey) {
  const tokens = await load(storageKey).catch(() => null);
  return hasFormTokens(tokens) ? tokens : null;
}

function fetchFormTokens(storageKey, url, requestType) {
  return singleFlight(`tokens:${storageKey}`, async () => {
    const response = await trackedLibraryFetch(requestType, url, {
      method: "GET",
      credentials: "include"
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`Library unavailable (HTTP ${response.status})`);

    const tokens = extractAspNetFields(html);
    if (!hasFormTokens(tokens)) {
      throw new Error("Unable to read library form tokens");
    }

    await save(storageKey, tokens).catch(() => {});
    return tokens;
  });
}

async function getSearchTokens({ refresh = false } = {}) {
  const cached = refresh ? null : await loadFormTokens(SEARCH_TOKENS_KEY);
  return cached || fetchFormTokens(SEARCH_TOKENS_KEY, SEARCH_URL, "search-page");
}

async function submitLogin(tokens, memberId, password) {
  const response = await trackedLibraryFetch("login-submit", LOGIN_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      __VIEWSTATE: tokens.viewState,
      __VIEWSTATEGENERATOR: tokens.viewStateGenerator,
      __EVENTVALIDATION: tokens.eventValidation,
      txtMemberid: memberId,
      txtPassword: password,
      signin: "Sign In"
    }).toString(),
    redirect: "manual"
  });

  const redirected = response.type === "opaqueredirect"
    || (response.status >= 300 && response.status < 400);
  return redirected && Boolean((await getLibraryAuthCookie())?.value);
}

async function loginToLibrary() {
  const memberId = decodeBase64(LIBRARY_MEMBER_ID);
  const password = decodeBase64(LIBRARY_PASSWORD);

  if (!memberId || !password) {
    throw new Error("Missing library credentials");
  }

  const cachedTokens = await loadFormTokens(LOGIN_TOKENS_KEY);
  if (cachedTokens && await submitLogin(cachedTokens, memberId, password)) {
    return;
  }

  const freshTokens = await fetchFormTokens(LOGIN_TOKENS_KEY, LOGIN_URL, "login-page");
  if (await submitLogin(freshTokens, memberId, password)) {
    return;
  }

  throw new Error("Library login failed");
}

function loginWithCoalescing() {
  if (!loginInFlight) {
    loginInFlight = loginToLibrary()
      .finally(() => {
        loginInFlight = null;
      });
  }

  return loginInFlight;
}

async function ensureLibraryCookie() {
  if (!(await getLibraryAuthCookie())?.value) {
    await loginWithCoalescing();
  }
}

function classifySearchResponse(response, responseText) {
  if (/^\d+\|error\|/.test(responseText)
    || /validation of viewstate|invalid postback|invalid viewstate/i.test(responseText)) {
    return "stale";
  }

  if (response.status === 401 || response.status === 403
    || /mypage\.aspx/i.test(response.url)
    || /\|pageredirect\|[^|]*\|?[^|]*mypage\.aspx/i.test(responseText)) {
    return "logged-out";
  }

  if (!response.ok) {
    throw new Error(`Library search failed (HTTP ${response.status})`);
  }

  if (!/GridView1|id=["']Label2["']|\bLabel2\|/i.test(responseText)) {
    throw new Error("Unexpected library search response. Please refresh the search.");
  }

  return isGuestPage(responseText) ? "guest" : "member";
}

async function postLibrarySearch(formData, requestType) {
  const response = await trackedLibraryFetch(requestType, SEARCH_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "X-MicrosoftAjax": "Delta=true"
    },
    body: formData.toString()
  });

  const responseText = await response.text();
  return { status: classifySearchResponse(response, responseText), responseText };
}

// Guest searches return every paper without its link, so a login is only needed for a member search.
async function sendSearchPostback(formData, requestType, { asMember = false } = {}) {
  const needsLogin = (status) => status === "logged-out" || (asMember && status === "guest");
  if (asMember) {
    await ensureLibraryCookie();
  }

  const result = await postLibrarySearch(formData, requestType);
  if (!needsLogin(result.status)) {
    return result;
  }

  await loginWithCoalescing();
  const retry = await postLibrarySearch(formData, `${requestType}-retry`);
  if (needsLogin(retry.status)) {
    throw new Error("Library login failed");
  }
  return retry;
}

const pdfCache = new Map();
let pdfCacheBytes = 0;
const PDF_CACHE_LIMIT = 20 * 1024 * 1024;

async function fetchLibraryFile(absoluteUrl) {
  for (const [entryKey, entry] of pdfCache) {
    if (Date.now() - entry.savedAt >= PDF_CACHE_TTL_MS) {
      pdfCacheBytes -= entry.buffer.byteLength;
      pdfCache.delete(entryKey);
    }
  }

  const cached = pdfCache.get(absoluteUrl);
  if (cached) {
    return cached.buffer;
  }

  return singleFlight(`pdf:${absoluteUrl}`, () => withFileSlot(async () => {
    const response = await trackedLibraryFetch("pdf", absoluteUrl, {
      method: "GET",
      credentials: "omit"
    });
    if (!response.ok) throw new Error(`Unable to download file (HTTP ${response.status})`);

    const buffer = await response.arrayBuffer();
    if (!new TextDecoder().decode(buffer.slice(0, 5)).startsWith("%PDF-")) {
      throw new Error("Library returned an invalid PDF.");
    }

    if (buffer.byteLength <= PDF_CACHE_LIMIT) {
      while (pdfCache.size >= 10 || pdfCacheBytes + buffer.byteLength > PDF_CACHE_LIMIT) {
        const oldestKey = pdfCache.keys().next().value;
        pdfCacheBytes -= pdfCache.get(oldestKey).buffer.byteLength;
        pdfCache.delete(oldestKey);
      }
      pdfCache.set(absoluteUrl, { buffer, savedAt: Date.now() });
      pdfCacheBytes += buffer.byteLength;
    }
    return buffer;
  }));
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
  const year = Number((yearEdition.match(/\b(?:19|20)\d{2}\b/) || [])[0]) || null;

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
  const stableId = recordId || downloadPath || `${title}-${yearEdition}-${callNo}-${index}`;

  return {
    id: stableId,
    title,
    courseCode,
    yearEdition,
    year,
    recordId,
    callNo,
    status,
    downloadPath
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
  const deltaLabelMatch = payload.match(/\bLabel2\|\s*(\d+)\b/i);
  const genericLabelMatch = payload.match(/id=["']Label2["'][^>]*>\s*(\d+)\s*</i);
  const regexTotal = regexTotalMatch ? parseInt(regexTotalMatch[1], 10) : NaN;
  const deltaTotal = deltaLabelMatch ? parseInt(deltaLabelMatch[1], 10) : NaN;
  const genericLabelTotal = genericLabelMatch ? parseInt(genericLabelMatch[1], 10) : NaN;
  const hasNextPage = /Page\$Next/i.test(payload);

  return {
    query,
    totalResults: Number.isFinite(labelTotal)
      ? labelTotal
      : (Number.isFinite(regexTotal)
          ? regexTotal
          : (Number.isFinite(deltaTotal)
              ? deltaTotal
              : (Number.isFinite(genericLabelTotal) ? genericLabelTotal : parsedResults.length))),
    results: parsedResults,
    hasNextPage
  };
}

function buildSearchFields({ query, year }) {
  return {
    txtMemberid: "",
    txtPassword: "",
    txtTitle: librarySearchTitle(query),
    txtAuthor: "",
    txtYear: year || "",
    txtSubject: "",
    txtCallno: "",
    txtPublisher: "",
    cmbCategory: PYQ_CATEGORY,
    txtLocation: "",
    txtEdition: "",
    txtAccessNo: ""
  };
}

function buildSearchPayload({ query, year, viewState, eventValidation, viewStateGenerator }) {
  return new URLSearchParams({
    ToolkitScriptManager1: "UpdatePanel1|cmdSearch",
    __EVENTTARGET: "",
    __EVENTARGUMENT: "",
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGenerator,
    __VIEWSTATEENCRYPTED: "",
    __EVENTVALIDATION: eventValidation,
    ...buildSearchFields({ query, year }),
    __ASYNCPOST: "true",
    cmdSearch: "Search"
  });
}

function buildPaginationPayload({ query, year, viewState, eventValidation, viewStateGenerator }) {
  return new URLSearchParams({
    ToolkitScriptManager1: `UpdatePanel1|${LIBRARY_GRID_EVENT_TARGET}`,
    ...buildSearchFields({ query, year }),
    __EVENTTARGET: LIBRARY_GRID_EVENT_TARGET,
    __EVENTARGUMENT: "Page$Next",
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGenerator,
    __VIEWSTATEENCRYPTED: "",
    __EVENTVALIDATION: eventValidation,
    __ASYNCPOST: "true"
  });
}

async function fetchFirstSearchPage({ query, year }, searchOptions) {
  const tokens = await getSearchTokens();
  const result = await sendSearchPostback(
    buildSearchPayload({ query, year, ...tokens }),
    "search-submit",
    searchOptions
  );
  if (result.status !== "stale") {
    return result.responseText;
  }

  const freshTokens = await getSearchTokens({ refresh: true });
  const retry = await sendSearchPostback(
    buildSearchPayload({ query, year, ...freshTokens }),
    "search-retry",
    searchOptions
  );
  if (retry.status === "stale") {
    throw new Error("Library search failed. Please try again.");
  }
  return retry.responseText;
}

async function fetchNextSearchPage({ query, year, cursor }, searchOptions) {
  const result = await sendSearchPostback(
    buildPaginationPayload({ query, year, ...cursor }),
    "pagination-submit",
    searchOptions
  );
  if (result.status === "stale") {
    throw new Error("These search results have expired. Please search again.");
  }
  return result.responseText;
}

function filterCourseKeyResults(results, query) {
  const courseKey = courseKeyFromQuery(query);
  if (!courseKey) {
    return results;
  }

  return results.filter(
    (result) => subjectKeyFromCourseCode(result.courseCode) === courseKey
  );
}

function readSearchPage(responseText, query) {
  const parsed = parseSearchResults(responseText, query);
  const fields = extractAspNetFieldsFromDelta(responseText);
  const cursor = parsed.hasNextPage && parsed.results.length > 0 && hasFormTokens(fields)
    ? fields
    : null;

  return {
    totalResults: parsed.totalResults,
    results: filterCourseKeyResults(parsed.results, query),
    rawIds: parsed.results.map((result) => result.id),
    nextCursor: cursor
  };
}

function appendSearchPage(entry, page) {
  const seenIds = new Set(entry.results.map((item) => item.id));
  const freshResults = page.results.filter((item) => !seenIds.has(item.id));
  const results = [...entry.results, ...freshResults];

  const entryRawIds = Array.isArray(entry.rawIds) ? entry.rawIds : [];
  const seenRawIds = new Set([
    ...entryRawIds,
    ...entry.results.map((item) => item.id)
  ]);
  const pageRawIds = Array.isArray(page.rawIds)
    ? page.rawIds
    : page.results.map((item) => item.id);
  const freshRawIds = [];
  for (const rawId of pageRawIds) {
    if (!seenRawIds.has(rawId)) {
      seenRawIds.add(rawId);
      freshRawIds.push(rawId);
    }
  }

  const complete = !page.nextCursor || freshRawIds.length === 0;

  return {
    ...entry,
    totalResults: Math.max(page.totalResults || 0, results.length),
    results,
    rawIds: [...entryRawIds, ...freshRawIds],
    complete,
    nextCursor: complete ? null : page.nextCursor
  };
}

const MONTH_NUMBERS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
};

function examSessionText(title) {
  const text = normalizeText(title).replace(/\s*\([A-Z0-9]+\)\s*$/i, "");
  const esaIndex = text.toUpperCase().lastIndexOf("(ESA)");
  if (esaIndex >= 0) {
    return text.slice(esaIndex + "(ESA)".length);
  }

  const markerIndex = text.toLowerCase().indexOf("[e resource : question paper]");
  if (markerIndex >= 0) {
    return text.slice(markerIndex + "[e resource : question paper]".length);
  }

  return text;
}

function examSessionMonth(title) {
  const months = examSessionText(title).match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi
  );
  if (!months || months.length === 0) {
    return 0;
  }

  const lastMonth = months[months.length - 1].slice(0, 3).toLowerCase();
  return MONTH_NUMBERS[lastMonth] || 0;
}

function compareResultsByRecency(first, second) {
  const yearDifference = (second.year || 0) - (first.year || 0);
  if (yearDifference !== 0) {
    return yearDifference;
  }

  return examSessionMonth(second.title) - examSessionMonth(first.title);
}

function sortResultsByRecency(results) {
  return [...results].sort(compareResultsByRecency);
}

async function performLibrarySearch(
  { query, year },
  { asMember = false, loadAllPages = false, maxPages = 0 } = {}
) {
  const searchOptions = { asMember };
  const needsAllPages = loadAllPages || Boolean(courseKeyFromQuery(query));
  const firstPage = readSearchPage(await fetchFirstSearchPage({ query, year }, searchOptions), query);
  let entry = appendSearchPage(
    { query, year, totalResults: 0, results: [], complete: false, nextCursor: null },
    firstPage
  );

  if (maxPages > 0 || needsAllPages || entry.totalResults <= EAGER_RESULT_LIMIT) {
    const pageLimit = maxPages > 0
      ? maxPages
      : (needsAllPages ? FULL_SEARCH_PAGE_LIMIT : EAGER_PAGE_LIMIT);
    for (let pageCount = 1; pageCount < pageLimit && !entry.complete; pageCount += 1) {
      const page = readSearchPage(
        await fetchNextSearchPage({ query, year, cursor: entry.nextCursor }, searchOptions),
        query
      );
      entry = appendSearchPage(entry, page);
    }
  }

  if (!entry.complete) {
    return entry;
  }

  const results = sortResultsByRecency(entry.results);
  return {
    ...entry,
    results,
    totalResults: courseKeyFromQuery(query) ? results.length : entry.totalResults
  };
}

async function searchPapersAsMember({ query, year }) {
  const entry = await serializeLibraryRequest(() => (
    performLibrarySearch({ query, year }, { asMember: true, loadAllPages: true })
  ));
  await rememberPaperLinks(entry.results);
  return entry.results;
}

function titleSubjectName(title) {
  const text = normalizeText(title);
  const markerIndex = text.toLowerCase().indexOf("[e resource");
  if (markerIndex >= 0) {
    return text.slice(0, markerIndex);
  }

  const separatorIndex = text.indexOf(" : ");
  return separatorIndex >= 0 ? text.slice(0, separatorIndex) : "";
}

function normalizeSubjectName(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function departmentLettersForKey(courseKey) {
  return (String(courseKey || "").match(/^[A-Z]+/) || [""])[0];
}

function programmePrefixFromCode(courseCode) {
  const code = String(courseCode || "").trim().toUpperCase();
  return /^[A-Z]{2}\d{2}(?=[A-Z])/.test(code) ? code.slice(0, 2) : "";
}

function fullCourseCodeFromQuery(query) {
  const code = String(query || "").trim().toUpperCase().replace(/\)+$/, "");
  return /^[A-Z]{2}\d{2}[A-Z]/.test(code) ? code : "";
}

async function searchRenamedCourseResults(courseKey, subjectName, mainCourseCode) {
  const currentYear = new Date().getFullYear();
  const targetName = normalizeSubjectName(subjectName);
  const mainDepartment = departmentLettersForKey(courseKey);
  const mainProgramme = programmePrefixFromCode(mainCourseCode);
  const extras = [];

  for (const year of [currentYear, currentYear - 1]) {
    try {
      const entry = await performLibrarySearch(
        { query: subjectName, year: String(year) },
        { maxPages: RENAMED_COURSE_PAGE_LIMIT }
      );
      extras.push(...entry.results);
    } catch {
      // A failed supplement year must not discard the main course results.
    }
  }

  return extras.filter((result) => {
    const extraKey = subjectKeyFromCourseCode(result.courseCode);
    if (extraKey === courseKey || departmentLettersForKey(extraKey) !== mainDepartment) {
      return false;
    }
    if (mainProgramme && programmePrefixFromCode(result.courseCode) !== mainProgramme) {
      return false;
    }

    return normalizeSubjectName(titleSubjectName(result.title)) === targetName;
  });
}

async function mergeRenamedCourseResults(entry, { query, year, subjectName }) {
  const courseKey = courseKeyFromQuery(query);
  const cleanSubjectName = normalizeText(subjectName);
  if (!courseKey || normalizeText(year) || !cleanSubjectName) {
    return entry;
  }

  const mainCourseCode = fullCourseCodeFromQuery(query)
    || entry.results.find(
      (result) => subjectKeyFromCourseCode(result.courseCode) === courseKey
    )?.courseCode
    || "";
  const extras = await searchRenamedCourseResults(courseKey, cleanSubjectName, mainCourseCode);
  const results = [...entry.results];
  const seenIds = new Set(results.map((item) => item.id));

  for (const extra of extras) {
    if (!seenIds.has(extra.id)) {
      seenIds.add(extra.id);
      results.push(extra);
    }
  }

  const sortedResults = sortResultsByRecency(results);
  return {
    ...entry,
    results: sortedResults,
    totalResults: entry.complete
      ? sortedResults.length
      : Math.max(entry.totalResults, sortedResults.length)
  };
}

function memberSearchForPaper({ courseCode, title, year }) {
  if (courseCode) {
    return { query: librarySearchTitle(courseCode), year: "" };
  }

  return { query: normalizeText(String(title || "").split("[")[0]), year: year ? String(year) : "" };
}

// Guessed links are checked here, on use; a login is the last resort when no guess exists on the server.
async function resolvePaperUrl(paper) {
  const knownPath = await findPaperPath(paper);
  if (knownPath) {
    return toLibraryUrl(knownPath);
  }

  const memberSearch = memberSearchForPaper(paper);
  if (!memberSearch.query) {
    throw new Error("This paper is not available in the library");
  }

  const results = await singleFlight(
    `member-search:${searchCacheKey(memberSearch.query, memberSearch.year)}`,
    () => searchPapersAsMember(memberSearch)
  );
  const recordNumber = recordNumberFromId(paper.recordId);
  const match = results.find((result) => recordNumberFromId(result.recordId) === recordNumber);
  if (!match?.downloadPath) {
    throw new Error("This paper is not available in the library");
  }

  return toLibraryUrl(match.downloadPath);
}

function searchCacheKey(query, year, subjectName = "") {
  return JSON.stringify([
    query.toLowerCase(),
    year,
    String(subjectName || "").toLowerCase()
  ]);
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

function ensurePdfExtension(name) {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

function buildZipFileName(query) {
  const safeQuery = sanitizeFilename(query || "PYQs") || "PYQs";
  return `PESU_PYQs_${safeQuery}.zip`;
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
        searchCode: subjectKeyFromCourseCode(subjectCode),
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

export async function searchLibraryPyqs({ query, year, subjectName }) {
  const cleanQuery = normalizeText(query);
  const cleanYear = normalizeText(year);
  const cleanSubjectName = normalizeText(subjectName);
  if (!cleanQuery) {
    throw new Error("Search query is required");
  }

  const cacheKey = searchCacheKey(cleanQuery, cleanYear, cleanSubjectName);
  const entry = await readCachedSearch(cacheKey)
    || await singleFlight(`search:${cacheKey}`, () => serializeLibraryRequest(async () => {
      const mainEntry = await performLibrarySearch({ query: cleanQuery, year: cleanYear });
      const freshEntry = await mergeRenamedCourseResults(mainEntry, {
        query: cleanQuery,
        year: cleanYear,
        subjectName: cleanSubjectName
      }).catch(() => mainEntry);
      await writeCachedSearch(cacheKey, freshEntry);
      return freshEntry;
    }));

  return { ...entry, results: await attachPaperLinks(entry.results) };
}

export async function loadMoreLibraryPyqs({ query, year, subjectName, cursor }) {
  const cleanQuery = normalizeText(query);
  const cleanYear = normalizeText(year);
  const cleanSubjectName = normalizeText(subjectName);
  if (!cleanQuery) {
    throw new Error("Search query is required");
  }

  if (!hasFormTokens(cursor)) {
    throw new Error("No next page is available for this search");
  }

  const cacheKey = searchCacheKey(cleanQuery, cleanYear, cleanSubjectName);
  return singleFlight(`page:${cacheKey}:${cursor.viewState}`, () => serializeLibraryRequest(async () => {
    const page = readSearchPage(
      await fetchNextSearchPage({ query: cleanQuery, year: cleanYear, cursor }),
      cleanQuery
    );

    const cached = await readCachedSearch(cacheKey);
    let totalResults = page.totalResults;
    if (cached?.nextCursor?.viewState === cursor.viewState) {
      const merged = appendSearchPage(cached, page);
      await writeCachedSearch(cacheKey, merged);
      if (merged.complete && courseKeyFromQuery(cleanQuery)) {
        totalResults = merged.results.length;
      }
    }

    return {
      ...page,
      totalResults,
      results: await attachPaperLinks(page.results)
    };
  }));
}

export async function downloadLibraryPyq(paper) {
  const absoluteUrl = await resolvePaperUrl(paper);
  const { title } = paper;
  const fileBuffer = await fetchLibraryFile(absoluteUrl);
  const dataUrl = `data:application/pdf;base64,${arrayBufferToBase64(fileBuffer)}`;

  const fallbackName = `PYQ_${Date.now()}`;
  const safeName = sanitizeFilename(title || fallbackName) || fallbackName;
  const fileName = ensurePdfExtension(safeName);
  const downloadId = await triggerBrowserDownload(dataUrl, `PESU_PYQs/${fileName}`);

  return {
    downloadId,
    fileName,
    sourceUrl: absoluteUrl
  };
}

export async function openLibraryPyq(paper) {
  const url = await resolvePaperUrl(paper);
  await chrome.tabs.create({ url });
  return { url };
}

export async function verifyCoursePaperLinks(courseCode) {
  const query = librarySearchTitle(courseCode);
  const entry = await serializeLibraryRequest(() => (
    performLibrarySearch({ query, year: "" }, { loadAllPages: true })
  ));
  const papers = await attachPaperLinks(entry.results);
  const foundPaths = await parallelBatch(papers, findPaperPath, PAPER_CHECK_CONCURRENCY);

  if (papers.some((paper, index) => paper.recordId && !foundPaths[index])) {
    await searchPapersAsMember({ query, year: "" });
  }
}

export async function downloadLibraryPyqsZip({ items, query }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No PYQs selected for ZIP download");
  }

  const zip = new JSZip();
  const failedItems = [];
  let successful = 0;

  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.id, item])).values()
  );
  const queue = uniqueItems.map((item, index) => ({ item, index }));
  const workerCount = Math.min(3, queue.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) {
          return;
        }

        const { item, index } = next;
        try {
          const fileBuffer = await fetchLibraryFile(await resolvePaperUrl(item));
          const fallbackName = `PYQ_${index + 1}`;
          const safeName = sanitizeFilename(item.title || fallbackName) || fallbackName;
          const fileName = `${String(index + 1).padStart(2, "0")}_${ensurePdfExtension(safeName)}`;

          zip.file(fileName, fileBuffer, {
            binary: true,
            compression: "STORE"
          });
          successful += 1;
        } catch (error) {
          failedItems.push({
            id: item.id,
            title: item.title || "Unknown PYQ",
            error: error.message || "Unknown error"
          });
        }
      }
    })
  );

  if (successful === 0) {
    throw new Error("Unable to download selected PYQs");
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 4 }
  });
  const zipBuffer = await zipBlob.arrayBuffer();
  const zipBase64 = arrayBufferToBase64(zipBuffer);
  const zipDataUrl = `data:application/zip;base64,${zipBase64}`;
  const fileName = buildZipFileName(query);
  const downloadId = await triggerBrowserDownload(zipDataUrl, `PESU_PYQs/${fileName}`);

  return {
    downloadId,
    fileName,
    stats: {
      total: uniqueItems.length,
      successful,
      failed: failedItems.length,
      failedItems
    }
  };
}
