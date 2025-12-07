import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { getCourseMaterials } from './pesuAPI.js';
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


async function mergePDFs(pdfBlobs) {
  const mergedPdf = await PDFDocument.create();

  for (const blob of pdfBlobs) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (error) {
      console.error('Error merging PDF:', error);
      // Skip corrupted PDFs, continue with others
    }
  }

  return await mergedPdf.save();
}

function groupBySubject(results) {
  const grouped = {};

  for (const { item, result } of results) {
    const { subjectId, subjectName, subjectCode } = item;

    if (!grouped[subjectId]) {
      grouped[subjectId] = {
        subjectName,
        subjectCode,
        pdfs: [],
        nonPdfs: [],
        items: []
      };
    }

    if (result.success && result.blob) {
      grouped[subjectId].items.push({ item, result });

      if (result.extension === '.pdf') {
        grouped[subjectId].pdfs.push({
          blob: result.blob,
          className: item.className,
          unitNumber: item.unitNumber
        });
      } else {
        grouped[subjectId].nonPdfs.push({
          blob: result.blob,
          extension: result.extension,
          className: item.className,
          unitNumber: item.unitNumber
        });
      }
    }
  }

  return grouped;
}

// Get file content from a class material
async function getClassMaterialFile(subjectId, classId) {
  try {
    const result = await getCourseMaterials(subjectId, classId);
    
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
      return { blob: result.data, extension, success: true };
    }
    
    if (result.type === 'html') {
      // Parse HTML to get download links
      const downloadLinks = parseDownloadLinks(result.data);
      
      if (downloadLinks.length === 0) {
        return { success: false, error: 'No download links found' };
      }
      
      // Try to download the first available link
      for (const link of downloadLinks) {
        const fullUrl = resolveDownloadUrl(link.url);
        const downloadResult = await downloadSingleFile(fullUrl);
        
        if (downloadResult.success) {
          return downloadResult;
        }
      }
      
      return { success: false, error: 'All download links failed' };
    }
    
    return { success: false, error: 'Unknown response type' };
  } catch (error) {
    console.error(`Failed to get material for class ${classId}:`, error);
    return { success: false, error: error.message };
  }
}

export async function createBulkDownloadZip(selectedItems, progressCallback, options = {}) {
  const zip = new JSZip();
  const totalItems = selectedItems.length;
  let completed = 0;
  const mergeBySubject = options.mergeBySubject || false;

  // Step 1: Download all files in parallel
  const results = await parallelBatch(selectedItems, async (item) => {
    const { subjectId, classId, className } = item;

    try {
      const result = await getClassMaterialFile(subjectId, classId);
      completed++;
      if (progressCallback) {
        progressCallback({
          current: completed,
          total: totalItems,
          currentItem: className,
          status: 'downloading'
        });
      }
      return { item, result };
    } catch (error) {
      completed++;
      if (progressCallback) {
        progressCallback({
          current: completed,
          total: totalItems,
          currentItem: className,
          status: 'downloading'
        });
      }
      return { item, result: { success: false, error: error.message } };
    }
  }, 5);

  const failedItems = [];
  let failed = 0;
  let mergedCount = 0;
  let mergedSubjectsCount = 0;
  let nonPdfCount = 0;

  // Step 2: Branch based on merge option
  if (mergeBySubject) {
    // MERGE MODE: Group by subject and merge PDFs
    if (progressCallback) {
      progressCallback({
        current: totalItems,
        total: totalItems,
        currentItem: 'Grouping files by subject...',
        status: 'processing'
      });
    }

    const grouped = groupBySubject(results);
    const subjectIds = Object.keys(grouped);

    for (let i = 0; i < subjectIds.length; i++) {
      const subjectId = subjectIds[i];
      const { subjectName, subjectCode, pdfs, nonPdfs, items } = grouped[subjectId];
      const safeFolderName = sanitizeFilename(subjectName);

      if (progressCallback) {
        progressCallback({
          current: totalItems,
          total: totalItems,
          currentItem: `Processing ${subjectName}...`,
          status: 'processing'
        });
      }

      // Merge PDFs for this subject
      if (pdfs.length > 0) {
        try {
          if (pdfs.length === 1) {
            // Single PDF - just add it
            const arrayBuffer = await pdfs[0].blob.arrayBuffer();
            const fileName = `${safeFolderName}.pdf`;
            zip.file(fileName, arrayBuffer, {
              binary: true,
              compression: 'STORE'
            });
          } else {
            // Multiple PDFs - merge them
            const pdfBlobs = pdfs.map(p => p.blob);
            const mergedPdfBytes = await mergePDFs(pdfBlobs);
            const fileName = `${safeFolderName}.pdf`;
            zip.file(fileName, mergedPdfBytes, {
              binary: true,
              compression: 'STORE'
            });
            mergedCount += pdfs.length;
            mergedSubjectsCount++;
          }
        } catch (error) {
          console.error(`Error merging PDFs for ${subjectName}:`, error);
          // Fall back to individual files
          for (const pdf of pdfs) {
            const arrayBuffer = await pdf.blob.arrayBuffer();
            const safeFileName = sanitizeFilename(pdf.className) + '.pdf';
            const filePath = `${safeFolderName}/${safeFileName}`;
            zip.file(filePath, arrayBuffer, {
              binary: true,
              compression: 'STORE'
            });
          }
        }
      }

      // Add non-PDF files to subject folder
      for (const file of nonPdfs) {
        const safeFileName = sanitizeFilename(file.className) + file.extension;
        const filePath = `${safeFolderName}/${safeFileName}`;
        const arrayBuffer = await file.blob.arrayBuffer();
        const useStore = isAlreadyCompressedExt(file.extension);
        const fileOptions = useStore
          ? { binary: true, compression: 'STORE' }
          : { binary: true, compression: 'DEFLATE', compressionOptions: { level: 4 } };
        zip.file(filePath, arrayBuffer, fileOptions);
        nonPdfCount++;
      }
    }

    // Count failed items from results
    for (const { item, result } of results) {
      if (!result.success) {
        failed++;
        failedItems.push({
          subjectName: item.subjectName,
          subjectCode: item.subjectCode,
          subjectId: item.subjectId,
          unitNumber: item.unitNumber,
          className: item.className,
          classId: item.classId,
          error: result.error || 'Unknown error'
        });
      }
    }

  } else {
    for (const { item, result } of results) {
      const { subjectName, subjectCode, subjectId, unitNumber, className, classId } = item;

      if (result.success && result.blob) {
        const safeFolderName = sanitizeFilename(subjectName);
        const unitFolder = String(unitNumber || 1);
        const safeFileName = sanitizeFilename(className) + result.extension;
        const filePath = `${safeFolderName}/${unitFolder}/${safeFileName}`;

        const arrayBuffer = await result.blob.arrayBuffer();
        const useStore = isAlreadyCompressedExt(result.extension);
        const fileOptions = useStore
          ? { binary: true, compression: 'STORE' }
          : { binary: true, compression: 'DEFLATE', compressionOptions: { level: 4 } };

        zip.file(filePath, arrayBuffer, fileOptions);
      } else {
        failed++;
        failedItems.push({
          subjectName,
          subjectCode,
          subjectId,
          unitNumber,
          className,
          classId,
          error: result.error || 'Unknown error'
        });
      }
    }
  }

  // Step 3: Generate ZIP
  if (progressCallback) {
    progressCallback({
      current: totalItems,
      total: totalItems,
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
      total: totalItems,
      successful: totalItems - failed,
      failed,
      failedItems,
      merged: mergedCount,
      mergedSubjects: mergedSubjectsCount,
      nonPdfCount: nonPdfCount
    }
  };
}

// Extract selected class details from selection state and pesu data
export function getSelectedClassesInfo(selectedClasses, pesuData) {
  const selectedItems = [];
  
  if (!pesuData?.items) return selectedItems;
  
  for (const subject of pesuData.items) {
    (subject.units || []).forEach((unit, unitIndex) => {
      for (const cls of (unit.classes || [])) {
        if (selectedClasses[cls.id]) {
          selectedItems.push({
            subjectId: subject.id,
            subjectCode: subject.subjectCode,
            subjectName: subject.subjectName,
            unitId: unit.id,
            unitName: unit.name,
            unitNumber: unitIndex + 1,
            classId: cls.id,
            className: cls.className
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

