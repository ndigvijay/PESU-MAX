import JSZip from 'jszip';
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

export async function createBulkDownloadZip(selectedItems, progressCallback, contentTypes = [2]) {
  const zip = new JSZip();
  // Total operations = items * content types
  const totalOperations = selectedItems.length * contentTypes.length;
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
      const result = await getClassMaterialFile(subjectId, classId, contentType);
      completed++;
      if (progressCallback) {
        progressCallback({
          current: completed,
          total: totalOperations,
          currentItem: `${className} (${contentTypeName})`,
          status: 'downloading'
        });
      }
      return { item, contentType, result };
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
      return { item, contentType, result: { success: false, error: error.message } };
    }
  }, 5);

  const failedItems = [];
  let failed = 0;

  for (const { item, contentType, result } of results) {
    const { subjectName, subjectCode, subjectId, unitNumber, className, classId } = item;
    const contentTypeName = CONTENT_TYPE_NAMES[contentType] || 'PESU_Material';
    
    if (result.success && result.blob) {
      const safeFolderName = sanitizeFilename(subjectName);
      const unitFolder = String(unitNumber || 1);
      const contentFolder = sanitizeFilename(contentTypeName);
      const safeFileName = sanitizeFilename(className) + result.extension;
      // Structure: Subject/Unit/ContentType/file.pdf
      const filePath = `${safeFolderName}/${unitFolder}/${contentFolder}/${safeFileName}`;
      
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
        contentType: contentTypeName,
        error: result.error || 'Unknown error'
      });
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
      successful: totalOperations - failed,
      failed,
      failedItems,
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

