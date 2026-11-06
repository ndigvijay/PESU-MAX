import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import {
  fetchPesu,
  getCourseMaterials,
  getUnitClasses,
  CONTENT_TYPE_NAMES,
  CONTENT_TYPE_IDS,
  isPesuSessionExpiredError
} from './pesuAPI.js';
import { parseDownloadLinks, parseUnitClasses, resolveDownloadUrl } from './parser.js';
import { parallelBatch } from './MiscControllers.js';
import { convertMultipleOfficeBlobsToPdfWithILovePdf, isOfficeConvertibleExtension } from './ilovepdfHelper.js';
import { load } from '../utils/storage.js';
import { RESOURCES_KEY } from '../utils/storageKeys.js';
import { DEFAULT_MERGE_MODE, MERGE_MODES, normalizeMergeMode } from './mergeModes.js';

const BASE_URL = "https://www.pesuacademy.com";

// File extension mapping based on content type
const CONTENT_TYPE_TO_EXT = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'text/plain': '.txt',
  'application/zip': '.zip'
};

// File types that are already compressed 
const ALREADY_COMPRESSED_EXTENSIONS = new Set([
  '.pdf',
  '.pptx',
  '.ppt',
  '.docx',
  '.xlsx',
  '.xls',
  '.zip',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.mp4',
  '.mp3'
]);

const MERGEABLE_CONTENT_TYPES = [
  { id: CONTENT_TYPE_IDS.slides, key: 'slides', name: CONTENT_TYPE_NAMES[CONTENT_TYPE_IDS.slides] },
  { id: CONTENT_TYPE_IDS.notes, key: 'notes', name: CONTENT_TYPE_NAMES[CONTENT_TYPE_IDS.notes] },
  { id: CONTENT_TYPE_IDS.assignments, key: 'assignments', name: CONTENT_TYPE_NAMES[CONTENT_TYPE_IDS.assignments] },
  { id: CONTENT_TYPE_IDS.qb, key: 'qb', name: CONTENT_TYPE_NAMES[CONTENT_TYPE_IDS.qb] },
  { id: CONTENT_TYPE_IDS.qa, key: 'qa', name: CONTENT_TYPE_NAMES[CONTENT_TYPE_IDS.qa] }
];

const DEFAULT_MERGE_OPTIONS = {
  slides: false,
  notes: false,
  assignments: false,
  qb: false,
  qa: false
};

function isAlreadyCompressedExt(extension) {
  if (!extension) return false;
  return ALREADY_COMPRESSED_EXTENSIONS.has(extension.toLowerCase());
}

function normalizeExtension(extension) {
  if (typeof extension !== 'string' || !extension.trim()) {
    return '';
  }

  const trimmed = extension.trim().toLowerCase();
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

// Detect file extension from response headers
function getFileExtension(response, fallback = '.pdf') {
  const contentDisposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = contentDisposition.match(/filename[*]?=["']?(?:UTF-8'')?([^"';\n]+)/i);
  
  if (filenameMatch) {
    const filename = filenameMatch[1].trim();
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (extMatch) {
      return '.' + extMatch[1].toLowerCase();
    }
  }
  
  const contentType = response.headers.get('Content-Type') || '';
  for (const [type, ext] of Object.entries(CONTENT_TYPE_TO_EXT)) {
    if (contentType.includes(type)) {
      return ext;
    }
  }
  
  return fallback;
}

// Sanitize filename for filesystem
function sanitizeFilename(name) {
  return String(name || 'file')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

function isZipHeader(header) {
  return header.length >= 4
    && header[0] === 0x50
    && header[1] === 0x4b
    && header[2] === 0x03
    && header[3] === 0x04;
}

function hasPdfSignature(header) {
  if (!header || header.length < 4) {
    return false;
  }

  for (let index = 0; index <= header.length - 4; index++) {
    if (
      header[index] === 0x25
      && header[index + 1] === 0x50
      && header[index + 2] === 0x44
      && header[index + 3] === 0x46
    ) {
      return true;
    }
  }

  return false;
}

function hasOleSignature(header) {
  return header.length >= 8
    && header[0] === 0xd0
    && header[1] === 0xcf
    && header[2] === 0x11
    && header[3] === 0xe0
    && header[4] === 0xa1
    && header[5] === 0xb1
    && header[6] === 0x1a
    && header[7] === 0xe1;
}

function containsAsciiBytes(bytes, text) {
  const pattern = Array.from(text, (character) => character.charCodeAt(0));

  for (let index = 0; index <= bytes.length - pattern.length; index++) {
    let matched = true;

    for (let patternIndex = 0; patternIndex < pattern.length; patternIndex++) {
      if (bytes[index + patternIndex] !== pattern[patternIndex]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return true;
    }
  }

  return false;
}

function containsUtf16LeBytes(bytes, text) {
  const pattern = [];
  for (const character of text) {
    pattern.push(character.charCodeAt(0), 0x00);
  }

  for (let index = 0; index <= bytes.length - pattern.length; index++) {
    let matched = true;

    for (let patternIndex = 0; patternIndex < pattern.length; patternIndex++) {
      if (bytes[index + patternIndex] !== pattern[patternIndex]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return true;
    }
  }

  return false;
}

function isWordDocFile(bytes) {
  if (!hasOleSignature(bytes)) {
    return false;
  }

  return containsUtf16LeBytes(bytes, 'WordDocument')
    || containsAsciiBytes(bytes, 'Microsoft Office Word');
}

async function inspectBlobFileType(blob, reportedExtension = '') {
  const normalizedReportedExtension = normalizeExtension(reportedExtension);

  if (!blob) {
    return {
      isPdf: false,
      resolvedExtension: normalizedReportedExtension
    };
  }

  try {
    const header = new Uint8Array(await blob.slice(0, 1024).arrayBuffer());

    if (hasPdfSignature(header)) {
      return {
        isPdf: true,
        resolvedExtension: '.pdf'
      };
    }

    if (isZipHeader(header)) {
      try {
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const zipEntryNames = Object.keys(zip.files);

        if (zipEntryNames.some((name) => name.startsWith('ppt/'))) {
          return {
            isPdf: false,
            resolvedExtension: '.pptx'
          };
        }

        if (zipEntryNames.some((name) => name.startsWith('word/'))) {
          return {
            isPdf: false,
            resolvedExtension: '.docx'
          };
        }

        if (zipEntryNames.some((name) => name.startsWith('xl/'))) {
          return {
            isPdf: false,
            resolvedExtension: '.xlsx'
          };
        }

        return {
          isPdf: false,
          resolvedExtension: normalizedReportedExtension || '.zip'
        };
      } catch {
        return {
          isPdf: false,
          resolvedExtension: normalizedReportedExtension
        };
      }
    }

    if (hasOleSignature(header)) {
      const bytes = new Uint8Array(await blob.arrayBuffer());

      if (isWordDocFile(bytes)) {
        return {
          isPdf: false,
          resolvedExtension: '.doc'
        };
      }
    }

    return {
      isPdf: false,
      resolvedExtension: normalizedReportedExtension
    };
  } catch {
    return {
      isPdf: false,
      resolvedExtension: normalizedReportedExtension
    };
  }
}

function buildIndividualFilePath(item, contentTypeName, fileResult, fileNumber, totalFilesInClass, options = {}) {
  const { subjectName, unitNumber, className, classIndex } = item;
  const { flattenIntoContentFolder = false, extensionOverride = fileResult.extension } = options;
  const safeFolderName = sanitizeFilename(subjectName);
  const contentFolder = sanitizeFilename(contentTypeName);
  const numberingPrefix = `${unitNumber}.${classIndex || 1}.${fileNumber}`;

  let baseFileName;
  if (fileResult.name) {
    baseFileName = `${numberingPrefix}_${sanitizeFilename(fileResult.name)}`;
  } else if (totalFilesInClass > 1) {
    baseFileName = `${numberingPrefix}_${sanitizeFilename(className)}`;
  } else {
    baseFileName = `${numberingPrefix}_${sanitizeFilename(className)}`;
  }

  const safeFileName = baseFileName + extensionOverride;

  if (contentFolder === 'QA' || contentFolder === 'QB' || flattenIntoContentFolder) {
    return `${safeFolderName}/${contentFolder}/${safeFileName}`;
  }

  const unitFolder = String(unitNumber || 1);
  return `${safeFolderName}/${unitFolder}/${contentFolder}/${safeFileName}`;
}

function normalizeMergeOptions(mergeOptions = {}, mergeSlides = false) {
  return {
    ...DEFAULT_MERGE_OPTIONS,
    ...(mergeOptions || {}),
    slides: Boolean(mergeSlides || mergeOptions?.slides)
  };
}

function getEnabledMergeContentTypes(contentTypes, mergeOptions = {}, mergeSlides = false) {
  const normalizedMergeOptions = normalizeMergeOptions(mergeOptions, mergeSlides);

  return MERGEABLE_CONTENT_TYPES.filter((contentType) =>
    contentTypes.includes(contentType.id) && normalizedMergeOptions[contentType.key]
  );
}

function buildMergeGroupKey(subjectId, unitId, contentType, mergeMode) {
  return normalizeMergeMode(mergeMode) === MERGE_MODES.unit
    ? `${subjectId}:${unitId}:${contentType}`
    : `${subjectId}:${contentType}`;
}

function buildMergedContentFilePath(subjectName, subjectCode, unitName, unitId, contentTypeName, mergeMode) {
  const safeFolderName = sanitizeFilename(subjectName);
  const safeContentFolder = sanitizeFilename(contentTypeName);
  const unitLabel = String(unitName || '').trim() ? sanitizeFilename(unitName) : `Unit_${unitId}`;
  const mergedFileName = normalizeMergeMode(mergeMode) === MERGE_MODES.unit
    ? (subjectCode
      ? `${sanitizeFilename(subjectCode)}_${unitLabel}_Merged_${safeContentFolder}.pdf`
      : `${unitLabel}_Merged_${safeContentFolder}.pdf`)
    : (subjectCode
      ? `${sanitizeFilename(subjectCode)}_Merged_${safeContentFolder}.pdf`
      : `${safeFolderName}_Merged_${safeContentFolder}.pdf`);

  return `${safeFolderName}/${safeContentFolder}/${mergedFileName}`;
}

function getFilenameFromPath(filePath) {
  const parts = String(filePath || '').split('/');
  return parts[parts.length - 1] || 'file';
}

function formatErrorMessage(error, fallbackMessage = 'Unknown error') {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

async function addFileToZip(zip, filePath, blob, extension) {
  const arrayBuffer = await blob.arrayBuffer();
  const useStore = isAlreadyCompressedExt(extension);
  const fileOptions = useStore
    ? { binary: true, compression: 'STORE' }
    : { binary: true, compression: 'DEFLATE', compressionOptions: { level: 4 } };

  zip.file(filePath, arrayBuffer, fileOptions);
}

async function hashBlob(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function removeDuplicateSourceFiles(files) {
  const seenHashes = new Set();
  const uniqueFiles = [];

  for (const file of files) {
    const hash = await hashBlob(file.blob);
    if (seenHashes.has(hash)) {
      continue;
    }

    seenHashes.add(hash);
    uniqueFiles.push(file);
  }

  return uniqueFiles;
}

async function mergeSubjectContentPdfs(files) {
  const mergedPdf = await PDFDocument.create();
  const mergeFailures = [];
  let mergedSourceFiles = 0;

  for (const file of files) {
    try {
      const pdfBytes = await file.blob.arrayBuffer();
      const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
      mergedSourceFiles++;
    } catch (error) {
      mergeFailures.push({
        item: file.item,
        error: error.message || 'Failed to merge PDF'
      });
    }
  }

  if (mergedSourceFiles === 0) {
    return { blob: null, mergedSourceFiles, mergeFailures };
  }

  const mergedBytes = await mergedPdf.save();
  return {
    blob: new Blob([mergedBytes], { type: 'application/pdf' }),
    mergedSourceFiles,
    mergeFailures
  };
}

// Download a single file from URL
async function downloadSingleFile(url) {
  try {
    const response = await fetchPesu(url, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const extension = getFileExtension(response);
    
    return { blob, extension, success: true };
  } catch (error) {
    if (isPesuSessionExpiredError(error)) {
      throw error;
    }

    console.error(`Failed to download ${url}:`, error);
    return { success: false, error: error.message };
  }
}

// Get file content from a class material
async function getClassMaterialFile(subjectId, unitId, classId, classNo, contentType = 2) {
  try {
    const result = await getCourseMaterials(subjectId, unitId, classId, classNo, contentType);

    if (!result) {
      return [{ success: false, error: 'No response from server' }];
    }

    if (result.type === 'binary') {
      // Direct binary download
      let extension = '.pdf';
      if (result.contentType) {
        for (const [type, ext] of Object.entries(CONTENT_TYPE_TO_EXT)) {
          if (result.contentType.includes(type)) {
            extension = ext;
            break;
          }
        }
      }
      return [{ blob: result.data, extension, success: true, name: null }];
    }
    if (result.type === 'html') {
      // Parse HTML to get download links
      const downloadLinks = parseDownloadLinks(result.data);
      if (downloadLinks.length === 0) {
        return [{ success: false, error: 'No download links found in HTML' }];
      }

      const downloadPromises = downloadLinks.map(async (link) => {
        try {
          const fullUrl = resolveDownloadUrl(link.url);
          const downloadResult = await downloadSingleFile(fullUrl);
          return {
            ...downloadResult,
            name: link.name || null 
          };
        } catch (err) {
          if (isPesuSessionExpiredError(err)) {
            throw err;
          }

          return { success: false, error: err.message, name: link.name || null };
        }
      });

      const results = await Promise.all(downloadPromises);
      const successfulDownloads = results.filter(r => r.success);

      if (successfulDownloads.length === 0) {
        return results.length > 0 ? results : [{ success: false, error: 'All download links failed' }];
      }

      return successfulDownloads;
    }

    return [{ success: false, error: `Unknown response type: ${result.type}` }];
  } catch (error) {
    if (isPesuSessionExpiredError(error)) {
      throw error;
    }

    console.error(`Failed to get material for class ${classId}:`, error);
    return [{ success: false, error: error.message || 'Unknown error occurred' }];
  }
}

export async function createBulkDownloadZip(selectedItems, progressCallback, contentTypes = [2], options = {}) {
  const { mergeOptions = {}, mergeSlides = false, mergeMode = DEFAULT_MERGE_MODE } = options;
  const normalizedMergeMode = normalizeMergeMode(mergeMode);
  const zip = new JSZip();
  const normalizedMergeOptions = normalizeMergeOptions(mergeOptions, mergeSlides);
  const enabledMergeContentTypes = getEnabledMergeContentTypes(contentTypes, normalizedMergeOptions);
  const enabledMergeContentTypeIds = new Set(enabledMergeContentTypes.map((contentType) => contentType.id));
  const subjectMergeGroups = new Map();

  if (enabledMergeContentTypes.length > 0) {
    for (const item of selectedItems) {
      for (const mergeContentType of enabledMergeContentTypes) {
        const groupKey = buildMergeGroupKey(item.subjectId, item.unitId, mergeContentType.id, normalizedMergeMode);

        if (!subjectMergeGroups.has(groupKey)) {
          subjectMergeGroups.set(groupKey, {
            subjectId: item.subjectId,
            subjectCode: item.subjectCode,
            subjectName: item.subjectName,
            unitId: normalizedMergeMode === MERGE_MODES.unit ? item.unitId : null,
            unitName: normalizedMergeMode === MERGE_MODES.unit ? item.unitName : null,
            contentType: mergeContentType.id,
            contentTypeName: mergeContentType.name,
            files: []
          });
        }
      }
    }
  }

  const downloadOperations = selectedItems.length * contentTypes.length;
  const totalOperations = downloadOperations + subjectMergeGroups.size;
  let completed = 0;

  // Create download tasks for each item and content type combination
  const downloadTasks = [];
  for (const item of selectedItems) {
    for (const contentType of contentTypes) {
      downloadTasks.push({ item, contentType });
    }
  }

  const results = await parallelBatch(downloadTasks, async (task) => {
    const { item, contentType } = task;
    const { subjectId, unitId, classId, classNo, className } = item;
    const contentTypeName = CONTENT_TYPE_NAMES[contentType] || 'Unknown';

    try {
      const filesArray = await getClassMaterialFile(subjectId, unitId, classId, classNo, contentType);
      completed++;
      if (progressCallback) {
        progressCallback({
          current: completed,
          total: totalOperations,
          currentItem: `${className} (${contentTypeName})`,
          status: 'downloading'
        });
      }
      return { item, contentType, filesArray };
    } catch (error) {
      if (isPesuSessionExpiredError(error)) {
        throw error;
      }

      completed++;
      if (progressCallback) {
        progressCallback({
          current: completed,
          total: totalOperations,
          currentItem: `${className} (${contentTypeName})`,
          status: 'downloading'
        });
      }
      return { item, contentType, filesArray: [{ success: false, error: error.message }] };
    }
  }, 5);

  const failedItems = [];
  let failed = 0;
  let totalFiles = 0;
  let mergedSubjects = 0;
  let mergedSlideSources = 0;
  const mergedSubjectsByType = {};
  const mergedSourceFilesByType = {};
  const duplicateSourceFilesByType = {};
  let downloadedFiles = 0;
  const downloadedFilesByType = {};

  for (const { item, contentType, filesArray } of results) {
    const { subjectName, subjectCode, subjectId, unitNumber, className, classId, classIndex } = item;
    const contentTypeName = CONTENT_TYPE_NAMES[contentType] || 'PESU_Material';

    if (!filesArray || !Array.isArray(filesArray) || filesArray.length === 0) {
      failed++;
      failedItems.push({
        subjectName,
        subjectCode,
        subjectId,
        unitNumber,
        className,
        classId,
        contentType: contentTypeName,
        error: 'No files returned'
      });
      continue;
    }

    for (let i = 0; i < filesArray.length; i++) {
      const fileResult = filesArray[i];

      if (!fileResult) {
        failed++;
        failedItems.push({
          subjectName,
          subjectCode,
          subjectId,
          unitNumber,
          className,
          classId,
          contentType: contentTypeName,
          error: 'Invalid file result'
        });
        continue;
      }

      if (fileResult.success && fileResult.blob) {
        downloadedFiles++;
        downloadedFilesByType[contentTypeName] = (downloadedFilesByType[contentTypeName] || 0) + 1;
        const fileNumber = i + 1;
        const isMergeSelectedType = enabledMergeContentTypeIds.has(contentType);
        const reportedExtension = normalizeExtension(fileResult.extension);
        const fileInspection = await inspectBlobFileType(fileResult.blob, reportedExtension);
        const resolvedExtension = fileInspection.resolvedExtension || reportedExtension;

        const filePath = buildIndividualFilePath(
          item,
          contentTypeName,
          fileResult,
          fileNumber,
          filesArray.length,
          {
            flattenIntoContentFolder: isMergeSelectedType,
            extensionOverride: resolvedExtension || fileResult.extension
          }
        );
        const canMergeThisFile = isMergeSelectedType;
        const isMergeablePdf = canMergeThisFile && fileInspection.isPdf;
        const isMergeableOffice = canMergeThisFile
          && !isMergeablePdf
          && isOfficeConvertibleExtension(resolvedExtension);

        if (isMergeablePdf || isMergeableOffice) {
          const mergeGroupKey = buildMergeGroupKey(subjectId, item.unitId, contentType, normalizedMergeMode);

          subjectMergeGroups.get(mergeGroupKey)?.files.push({
            item,
            blob: fileResult.blob,
            extension: resolvedExtension,
            unitNumber,
            classIndex: classIndex || 1,
            fileNumber,
            isPdf: isMergeablePdf,
            filePath,
            fileName: getFilenameFromPath(filePath)
          });
          continue;
        }

        try {
          await addFileToZip(zip, filePath, fileResult.blob, resolvedExtension || fileResult.extension);
          totalFiles++;
        } catch (error) {
          failed++;
          failedItems.push({
            subjectName,
            subjectCode,
            subjectId,
            unitNumber,
            className,
            classId,
            contentType: contentTypeName,
            error: error.message || 'Failed to add file to ZIP'
          });
        }
      } else if (!fileResult.success) {
        failed++;
        failedItems.push({
          subjectName,
          subjectCode,
          subjectId,
          unitNumber,
          className,
          classId,
          contentType: contentTypeName,
          error: fileResult.error || 'Unknown error'
        });
      }
    }
  }

  if (subjectMergeGroups.size > 0) {
    const subjectGroups = Array.from(subjectMergeGroups.values());
    const conversionJobs = [];
    const conversionResults = new Map();

    for (const subjectGroup of subjectGroups) {
      subjectGroup.files.sort((first, second) => {
        if (first.unitNumber !== second.unitNumber) {
          return first.unitNumber - second.unitNumber;
        }

        if (first.classIndex !== second.classIndex) {
          return first.classIndex - second.classIndex;
        }

        return first.fileNumber - second.fileNumber;
      });

      const uniqueFiles = await removeDuplicateSourceFiles(subjectGroup.files);
      const duplicateCount = subjectGroup.files.length - uniqueFiles.length;
      if (duplicateCount > 0) {
        duplicateSourceFilesByType[subjectGroup.contentTypeName] = (duplicateSourceFilesByType[subjectGroup.contentTypeName] || 0) + duplicateCount;
      }
      subjectGroup.files = uniqueFiles;

      for (const sourceFile of subjectGroup.files) {
        if (!sourceFile.isPdf) {
          conversionJobs.push({
            blob: sourceFile.blob,
            filename: sourceFile.fileName,
            extension: sourceFile.extension,
            originalSourceFile: sourceFile
          });
        }
      }
    }

    if (conversionJobs.length > 0) {
      progressCallback?.({
        current: downloadOperations,
        total: totalOperations,
        currentItem: `Converting Office files to PDF (0/${conversionJobs.length})`,
        status: 'converting',
        convertedCount: 0,
        convertTotal: conversionJobs.length
      });
    }

    const convertedFiles = await convertMultipleOfficeBlobsToPdfWithILovePdf(conversionJobs, {
      concurrency: 5,
      onProgress: (convertedCount, convertTotal) => {
        progressCallback?.({
          current: downloadOperations,
          total: totalOperations,
          currentItem: `Converting Office files to PDF (${convertedCount}/${convertTotal})`,
          status: 'converting',
          convertedCount,
          convertTotal
        });
      }
    });

    for (const conversionResult of convertedFiles) {
      conversionResults.set(conversionResult.sourceFile.originalSourceFile, conversionResult);
    }

    let mergedProgress = 0;

    await parallelBatch(subjectGroups, async (subjectGroup) => {
      if (progressCallback) {
        progressCallback({
          current: downloadOperations + mergedProgress,
          total: totalOperations,
          currentItem: `Merging ${subjectGroup.contentTypeName} for ${subjectGroup.subjectName}`,
          status: 'merging',
          mergeContentType: subjectGroup.contentTypeName
        });
      }

      try {
        if (subjectGroup.files.length === 0) {
          return;
        }

        const filesToMerge = [];

        for (const sourceFile of subjectGroup.files) {
          if (sourceFile.isPdf) {
            filesToMerge.push({ item: sourceFile.item, blob: sourceFile.blob });
            continue;
          }

          const conversionResult = conversionResults.get(sourceFile);
          if (conversionResult?.success) {
            filesToMerge.push({ item: sourceFile.item, blob: conversionResult.blob });
          } else {
            const conversionError = conversionResult?.error;
            const conversionErrorMessage = formatErrorMessage(
              conversionError,
              `Failed to convert ${sourceFile.fileName} to PDF`
            );

            failed++;
            failedItems.push({
              subjectName: sourceFile.item.subjectName,
              subjectCode: sourceFile.item.subjectCode,
              subjectId: sourceFile.item.subjectId,
              unitNumber: sourceFile.item.unitNumber,
              className: sourceFile.item.className,
              classId: sourceFile.item.classId,
              contentType: subjectGroup.contentTypeName,
              error: `Failed to convert ${sourceFile.fileName} to PDF: ${conversionErrorMessage}`
            });

            try {
              await addFileToZip(zip, sourceFile.filePath, sourceFile.blob, sourceFile.extension);
              totalFiles++;
            } catch (zipError) {
              failed++;
              failedItems.push({
                subjectName: sourceFile.item.subjectName,
                subjectCode: sourceFile.item.subjectCode,
                subjectId: sourceFile.item.subjectId,
                unitNumber: sourceFile.item.unitNumber,
                className: sourceFile.item.className,
                classId: sourceFile.item.classId,
                contentType: subjectGroup.contentTypeName,
                error: zipError.message || 'Failed to add original file to ZIP after conversion failure'
              });
            }
          }
        }

        if (filesToMerge.length === 0) {
          return;
        }

        const mergeResult = await mergeSubjectContentPdfs(filesToMerge);

        for (const mergeFailure of mergeResult.mergeFailures) {
          failed++;
          failedItems.push({
            subjectName: mergeFailure.item.subjectName,
            subjectCode: mergeFailure.item.subjectCode,
            subjectId: mergeFailure.item.subjectId,
            unitNumber: mergeFailure.item.unitNumber,
            className: mergeFailure.item.className,
            classId: mergeFailure.item.classId,
            contentType: subjectGroup.contentTypeName,
            error: mergeFailure.error
          });
        }

        if (!mergeResult.blob) {
          return;
        }

        const mergedFilePath = buildMergedContentFilePath(
          subjectGroup.subjectName,
          subjectGroup.subjectCode,
          subjectGroup.unitName,
          subjectGroup.unitId,
          subjectGroup.contentTypeName,
          normalizedMergeMode
        );
        await addFileToZip(zip, mergedFilePath, mergeResult.blob, '.pdf');
        totalFiles++;
        mergedSubjectsByType[subjectGroup.contentTypeName] = (mergedSubjectsByType[subjectGroup.contentTypeName] || 0) + 1;
        mergedSourceFilesByType[subjectGroup.contentTypeName] = (mergedSourceFilesByType[subjectGroup.contentTypeName] || 0) + mergeResult.mergedSourceFiles;

        if (subjectGroup.contentType === CONTENT_TYPE_IDS.slides) {
          mergedSubjects++;
          mergedSlideSources += mergeResult.mergedSourceFiles;
        }
      } catch (error) {
        failed++;
        failedItems.push({
          subjectName: subjectGroup.subjectName,
          subjectCode: subjectGroup.subjectCode,
          subjectId: subjectGroup.subjectId,
          contentType: subjectGroup.contentTypeName,
          error: error.message || `Failed to merge subject ${String(subjectGroup.contentTypeName || '').toLowerCase()}`
        });
      } finally {
        mergedProgress++;
        progressCallback?.({
          current: downloadOperations + mergedProgress,
          total: totalOperations,
          currentItem: `Finished ${subjectGroup.contentTypeName} for ${subjectGroup.subjectName}`,
          status: 'merging',
          mergeContentType: subjectGroup.contentTypeName
        });
      }
    }, 5);
  }
  
  if (progressCallback) {
    progressCallback({
      current: totalOperations,
      total: totalOperations,
      currentItem: 'Generating ZIP file...',
      status: 'zipping'
    });
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 4 }
  });

  const totalMergedFiles = Object.values(mergedSubjectsByType)
    .reduce((count, mergedCount) => count + mergedCount, 0);

  return {
    blob: zipBlob,
    stats: {
      total: totalOperations,
      successful: totalFiles,
      downloadedFiles,
      downloadedFilesByType,
      failed,
      failedItems,
      mergedSubjects,
      mergedSlideSources,
      mergedSubjectsByType,
      mergedSourceFilesByType,
      mergeMode: normalizedMergeMode,
      duplicateSourceFilesByType,
      totalMergedFiles,
      contentTypes: contentTypes.map(ct => CONTENT_TYPE_NAMES[ct] || ct)
    }
  };
}

// Extract selected class details from selection state and pesu data
export function getSelectedClassesInfo(selectedClasses, pesuData) {
  const selectedItems = [];
  
  if (!pesuData?.items) return selectedItems;
  
  for (const subject of pesuData.items) {
    (subject.units || []).forEach((unit, unitIndex) => {
      let classIndexInUnit = 0;
      for (const cls of (unit.classes || [])) {
        if (selectedClasses[cls.id]) {
          classIndexInUnit++;
          selectedItems.push({
            subjectId: subject.id,
            subjectCode: subject.subjectCode,
            subjectName: subject.subjectName,
            unitId: unit.id,
            unitName: unit.name,
            unitNumber: unitIndex + 1,
            classId: cls.id,
            classNo: cls.classNo || String(classIndexInUnit),
            className: cls.className,
            classIndex: classIndexInUnit
          });
        }
      }
    });
  }
  
  return selectedItems;
}

// Trigger browser download of a blob
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


const EXTENSION_TO_CONTENT_TYPE = Object.entries(CONTENT_TYPE_TO_EXT).reduce((acc, [mime, ext]) => {
  if (!acc[ext]) {
    acc[ext] = mime;
  }
  return acc;
}, {});

function getExtensionFromContentType(contentType = '', fallback = '.pdf') {
  for (const [type, ext] of Object.entries(CONTENT_TYPE_TO_EXT)) {
    if (contentType.includes(type)) {
      return ext;
    }
  }
  return fallback;
}

function buildNotificationDownloadFilename(rawName, extension) {
  const normalizedExt = normalizeExtension(extension) || '.pdf';
  let baseName = String(rawName || 'PESU_Material').trim();
  if (baseName.toLowerCase().endsWith(normalizedExt.toLowerCase())) {
    baseName = baseName.slice(0, -normalizedExt.length);
  }
  const safeBase = sanitizeFilename(baseName) || 'PESU_Material';
  return `${safeBase}${normalizedExt}`;
}

async function prepareDownloadedFile(blob, reportedExtension, rawName) {
  const normalizedReportedExt = normalizeExtension(reportedExtension) || '.pdf';
  const inspection = await inspectBlobFileType(blob, normalizedReportedExt);
  const resolvedExtension = inspection.resolvedExtension || normalizedReportedExt;
  const mimeType = EXTENSION_TO_CONTENT_TYPE[resolvedExtension] || blob.type || 'application/octet-stream';
  const filename = buildNotificationDownloadFilename(rawName, resolvedExtension);

  return {
    blob,
    filename,
    mimeType
  };
}

export async function downloadNotificationFiles(notification) {
  const subjectId = String(notification?.subjectId || '').trim();
  const unitId = String(notification?.unitId || '').trim();
  const classId = String(notification?.classId || '').trim();
  const resources = Array.isArray(notification?.resources) ? notification.resources : [];

  const tasks = [];
  for (const resource of resources) {
    const items = Array.isArray(resource?.items) ? resource.items : [];
    const type = Number(resource?.type);
    const label = resource?.label || CONTENT_TYPE_NAMES[type] || 'Resource';

    for (const item of items) {
      tasks.push({ item, type, label });
    }
  }

  if (!subjectId || !unitId || !classId || tasks.length === 0) {
    throw new Error('This notification has no downloadable files.');
  }

  let classNoPromise = null;
  const resolveClassNo = () => {
    if (!classNoPromise) {
      classNoPromise = (async () => {
        try {
          const storedResources = await load(RESOURCES_KEY);
          const storedClassNo = storedResources?.subjects?.[subjectId]?.units?.[unitId]?.classes?.[classId]?.classNo;
          if (storedClassNo != null && String(storedClassNo).trim() !== '') {
            return String(storedClassNo).trim();
          }
        } catch {
          // Fall back to the class list on PESU Academy.
        }

        try {
          const classesHtml = await getUnitClasses(subjectId, unitId);
          const unitClasses = classesHtml ? parseUnitClasses(classesHtml) : [];
          const matchedClass = unitClasses.find((cls) => String(cls.id) === classId);

          if (matchedClass?.classNo != null && String(matchedClass.classNo).trim() !== '') {
            return String(matchedClass.classNo).trim();
          }
        } catch (error) {
          if (isPesuSessionExpiredError(error)) {
            throw error;
          }
        }

        return null;
      })();
    }

    return classNoPromise;
  };

  const results = await parallelBatch(tasks, async ({ item, type, label }) => {
    const docId = String(item?.docId || '').trim();
    const rawName = item?.name || label;

    try {
      if (!docId) {
        throw new Error('Could not identify this file on PESU Academy.');
      }

      if (docId.includes(':')) {
        const classNo = await resolveClassNo();
        if (!classNo) {
          throw new Error('Could not locate this class on PESU Academy.');
        }

        const result = await getCourseMaterials(subjectId, unitId, classId, classNo, type);
        if (result?.type !== 'binary' || !result.data) {
          throw new Error('This file is no longer available as a single download.');
        }

        return await prepareDownloadedFile(
          result.data,
          getExtensionFromContentType(result.contentType),
          rawName
        );
      }

      const downloadResult = await downloadSingleFile(
        resolveDownloadUrl(`/Academy/s/referenceMeterials/downloadslidecoursedoc/${docId}`)
      );
      if (!downloadResult.success || !downloadResult.blob) {
        throw new Error(downloadResult.error || 'Could not download this file.');
      }

      return await prepareDownloadedFile(downloadResult.blob, downloadResult.extension, rawName);
    } catch (error) {
      if (isPesuSessionExpiredError(error)) {
        throw error;
      }

      return { name: rawName, error: formatErrorMessage(error, 'Could not download this file.') };
    }
  }, 3);

  const files = [];
  const failed = [];

  for (const result of results) {
    if (result?.error) {
      failed.push({ name: result.name, error: result.error });
    } else {
      files.push(result);
    }
  }

  if (files.length === 0) {
    throw new Error(failed[0]?.error || 'Could not download the requested file.');
  }

  return { files, failed };
}
