import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { getCourseMaterials, CONTENT_TYPE_NAMES, CONTENT_TYPE_IDS } from './pesuAPI.js';
import { parseDownloadLinks, resolveDownloadUrl } from './parser.js';
import { parallelBatch } from './MiscControllers.js';

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

function isAlreadyCompressedExt(extension) {
  if (!extension) return false;
  return ALREADY_COMPRESSED_EXTENSIONS.has(extension.toLowerCase());
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
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

async function isPdfBlob(blob) {
  if (!blob) return false;

  try {
    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  } catch {
    return false;
  }
}

function buildIndividualFilePath(item, contentTypeName, fileResult, fileNumber, totalFilesInClass) {
  const { subjectName, unitNumber, className, classIndex } = item;
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

  const safeFileName = baseFileName + fileResult.extension;

  if (contentFolder === 'QA' || contentFolder === 'QB') {
    return `${safeFolderName}/${contentFolder}/${safeFileName}`;
  }

  const unitFolder = String(unitNumber || 1);
  return `${safeFolderName}/${unitFolder}/${contentFolder}/${safeFileName}`;
}

function buildMergedSlidesFilePath(subjectName, subjectCode) {
  const safeFolderName = sanitizeFilename(subjectName);
  const mergedFileName = subjectCode
    ? `${sanitizeFilename(subjectCode)}_Merged_Slides.pdf`
    : 'Merged_Slides.pdf';

  return `${safeFolderName}/Slides/${mergedFileName}`;
}

async function addFileToZip(zip, filePath, blob, extension) {
  const arrayBuffer = await blob.arrayBuffer();
  const useStore = isAlreadyCompressedExt(extension);
  const fileOptions = useStore
    ? { binary: true, compression: 'STORE' }
    : { binary: true, compression: 'DEFLATE', compressionOptions: { level: 4 } };

  zip.file(filePath, arrayBuffer, fileOptions);
}

async function mergeSubjectSlidePdfs(files) {
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
    const response = await fetch(url, {
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
    console.error(`Failed to download ${url}:`, error);
    return { success: false, error: error.message };
  }
}

// Get file content from a class material
async function getClassMaterialFile(subjectId, classId, contentType = 2) {
  try {
    const result = await getCourseMaterials(subjectId, classId, contentType);

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
    console.error(`Failed to get material for class ${classId}:`, error);
    return [{ success: false, error: error.message || 'Unknown error occurred' }];
  }
}

export async function createBulkDownloadZip(selectedItems, progressCallback, contentTypes = [2], options = {}) {
  const { mergeSlides = false } = options;
  const zip = new JSZip();
  const shouldMergeSlides = mergeSlides && contentTypes.includes(CONTENT_TYPE_IDS.slides);
  const subjectSlideGroups = new Map();

  if (shouldMergeSlides) {
    for (const item of selectedItems) {
      if (!subjectSlideGroups.has(item.subjectId)) {
        subjectSlideGroups.set(item.subjectId, {
          subjectId: item.subjectId,
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          files: []
        });
      }
    }
  }

  const downloadOperations = selectedItems.length * contentTypes.length;
  const totalOperations = downloadOperations + subjectSlideGroups.size;
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
    const { subjectId, classId, className } = item;
    const contentTypeName = CONTENT_TYPE_NAMES[contentType] || 'Unknown';

    try {
      const filesArray = await getClassMaterialFile(subjectId, classId, contentType);
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
        const fileNumber = i + 1;
        const canMergeThisFile = shouldMergeSlides && contentType === CONTENT_TYPE_IDS.slides;
        const isMergeablePdf = canMergeThisFile && await isPdfBlob(fileResult.blob);

        if (isMergeablePdf) {
          subjectSlideGroups.get(subjectId)?.files.push({
            item,
            blob: fileResult.blob,
            unitNumber,
            classIndex: classIndex || 1,
            fileNumber
          });
          continue;
        }

        const filePath = buildIndividualFilePath(item, contentTypeName, fileResult, fileNumber, filesArray.length);

        try {
          await addFileToZip(zip, filePath, fileResult.blob, fileResult.extension);
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

  if (shouldMergeSlides) {
    let mergedProgress = 0;

    for (const subjectGroup of subjectSlideGroups.values()) {
      mergedProgress++;

      if (progressCallback) {
        progressCallback({
          current: downloadOperations + mergedProgress,
          total: totalOperations,
          currentItem: `Merging slides for ${subjectGroup.subjectName}`,
          status: 'merging'
        });
      }

      if (subjectGroup.files.length === 0) {
        continue;
      }

      subjectGroup.files.sort((first, second) => {
        if (first.unitNumber !== second.unitNumber) {
          return first.unitNumber - second.unitNumber;
        }

        if (first.classIndex !== second.classIndex) {
          return first.classIndex - second.classIndex;
        }

        return first.fileNumber - second.fileNumber;
      });

      try {
        const mergeResult = await mergeSubjectSlidePdfs(subjectGroup.files);

        for (const mergeFailure of mergeResult.mergeFailures) {
          failed++;
          failedItems.push({
            subjectName: mergeFailure.item.subjectName,
            subjectCode: mergeFailure.item.subjectCode,
            subjectId: mergeFailure.item.subjectId,
            unitNumber: mergeFailure.item.unitNumber,
            className: mergeFailure.item.className,
            classId: mergeFailure.item.classId,
            contentType: CONTENT_TYPE_NAMES[CONTENT_TYPE_IDS.slides],
            error: mergeFailure.error
          });
        }

        if (!mergeResult.blob) {
          continue;
        }

        const mergedFilePath = buildMergedSlidesFilePath(subjectGroup.subjectName, subjectGroup.subjectCode);
        await addFileToZip(zip, mergedFilePath, mergeResult.blob, '.pdf');
        totalFiles++;
        mergedSubjects++;
        mergedSlideSources += mergeResult.mergedSourceFiles;
      } catch (error) {
        failed++;
        failedItems.push({
          subjectName: subjectGroup.subjectName,
          subjectCode: subjectGroup.subjectCode,
          subjectId: subjectGroup.subjectId,
          contentType: CONTENT_TYPE_NAMES[CONTENT_TYPE_IDS.slides],
          error: error.message || 'Failed to merge subject slides'
        });
      }
    }
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
  
  return {
    blob: zipBlob,
    stats: {
      total: totalOperations,
      successful: totalFiles,
      failed,
      failedItems,
      mergedSubjects,
      mergedSlideSources,
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
