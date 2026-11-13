const ILOVE_PDF_BASE_URL = "https://www.ilovepdf.com";
const DEFAULT_CONVERSION_CONCURRENCY = 5;
const RETRY_DELAYS_MS = [500, 1500];
const UPLOAD_CHUNK_SIZE_BYTES = 2 * 1024 * 1024;

const OFFICE_CONVERSION_CONFIG = {
  ".ppt": {
    toolPath: "/powerpoint_to_pdf",
    tool: "officepdf",
    subtool: "powerpointpdf",
    packagedFilename: "ilovepdf-converted"
  },
  ".pptx": {
    toolPath: "/powerpoint_to_pdf",
    tool: "officepdf",
    subtool: "powerpointpdf",
    packagedFilename: "ilovepdf-converted"
  },
  ".doc": {
    toolPath: "/word_to_pdf",
    tool: "officepdf",
    subtool: null,
    packagedFilename: "ilovepdf_converted"
  },
  ".docx": {
    toolPath: "/word_to_pdf",
    tool: "officepdf",
    subtool: null,
    packagedFilename: "ilovepdf_converted"
  }
};

const OFFICE_MIME_TYPES = {
  ".doc": "application/msword"
};

export function isOfficeConvertibleExtension(extension) {
  const normalized = normalizeExtension(extension);
  return Boolean(OFFICE_CONVERSION_CONFIG[normalized]);
}

export async function convertOfficeBlobToPdfWithILovePdf({ blob, filename, extension }) {
  if (!blob) {
    throw new Error("No file blob provided for iLovePDF conversion");
  }

  const normalizedExtension = normalizeExtension(extension || getFileExtension(filename));
  const config = OFFICE_CONVERSION_CONFIG[normalizedExtension];

  if (!config) {
    throw new Error(`Unsupported office format for conversion: ${normalizedExtension || "unknown"}`);
  }

  const resolvedFilename = resolveFilename(filename, normalizedExtension);
  const taskConfig = await fetchTaskConfig(config.toolPath);
  const workerServer = getWorkerServer(taskConfig);
  const outputBaseName = buildOutputBaseName(resolvedFilename, "_converted");

  const uploadResult = await uploadBlob({
    workerServer,
    token: taskConfig.token,
    taskId: taskConfig.taskId,
    blob: officeBlobWithCorrectType(blob, normalizedExtension),
    filename: resolvedFilename
  });

  await processFiles({
    workerServer,
    token: taskConfig.token,
    taskId: taskConfig.taskId,
    uploadedFiles: [
      {
        filename: resolvedFilename,
        server_filename: uploadResult.server_filename
      }
    ],
    outputBaseName,
    tool: config.tool,
    subtool: config.subtool,
    packagedFilename: config.packagedFilename
  });

  return downloadProcessedFile({ workerServer, taskId: taskConfig.taskId });
}

export async function convertMultipleOfficeBlobsToPdfWithILovePdf(
  files,
  { concurrency = DEFAULT_CONVERSION_CONCURRENCY, onProgress, retries = RETRY_DELAYS_MS.length } = {}
) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const results = new Array(files.length);
  const workerCount = Math.min(Math.max(1, concurrency), files.length);
  let nextIndex = 0;
  let completed = 0;

  const workers = Array.from({ length: workerCount }, async (_, workerIndex) => {
    if (workerIndex > 0) {
      await delay(workerIndex * 75);
    }

    while (nextIndex < files.length) {
      const index = nextIndex++;
      const sourceFile = files[index];

      try {
        const blob = await withRetry(
          () => convertOfficeBlobToPdfWithILovePdf(sourceFile),
          retries
        );
        results[index] = { sourceFile, success: true, blob };
      } catch (error) {
        results[index] = { sourceFile, success: false, error };
      }

      completed++;
      onProgress?.(completed, files.length, results[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchTaskConfig(toolPath) {
  const resolvedToolPath = normalizeToolPath(toolPath);
  const response = await fetch(`${ILOVE_PDF_BASE_URL}${resolvedToolPath}`, {
    method: "GET",
    cache: "no-store"
  });

  const html = await response.text();

  if (!response.ok) {
    throw createHttpError(`Failed to fetch iLovePDF task config: ${response.status}`, response);
  }

  const configMatch = html.match(/(?:var\s+|window\.)ilovepdfConfig\s*=\s*({[\s\S]*?});/);
  const taskIdMatch = html.match(/ilovepdfConfig\.taskId\s*=\s*['"]([^'"]+)['"]/);

  if (!configMatch) {
    throw new Error("Could not extract iLovePDF config");
  }

  let config;
  try {
    config = JSON.parse(configMatch[1]);
  } catch (_error) {
    throw new Error("Failed to parse iLovePDF config");
  }

  if (!config.taskId && taskIdMatch?.[1]) {
    config.taskId = taskIdMatch[1];
  }

  if (!config.taskId || !config.token) {
    throw new Error("Invalid iLovePDF task config");
  }

  return config;
}

function getWorkerServer(config) {
  const candidate = Array.isArray(config.servers) && config.servers.length > 0
    ? config.servers[0]
    : config.workerServer;

  if (!candidate) {
    throw new Error("No iLovePDF worker server available");
  }

  let normalizedUrl = String(candidate).trim();

  if (normalizedUrl.startsWith("//")) {
    normalizedUrl = `https:${normalizedUrl}`;
  } else if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const parsedUrl = new URL(normalizedUrl);
  if (!parsedUrl.hostname.includes(".")) {
    parsedUrl.hostname = `${parsedUrl.hostname}.ilovepdf.com`;
  }

  return parsedUrl.origin;
}

function buildUploadFormData({ filename, taskId, chunkIndex, totalChunks, chunkBlob }) {
  const formData = new FormData();
  formData.append("name", filename);
  formData.append("chunk", String(chunkIndex));
  formData.append("chunks", String(totalChunks));
  formData.append("task", taskId);
  formData.append("preview", "1");
  formData.append("pdfinfo", "0");
  formData.append("pdfforms", "0");
  formData.append("pdfresetforms", "0");
  formData.append("v", "web.0");
  formData.append("file", chunkBlob, filename);
  return formData;
}

async function uploadBlob({ workerServer, token, taskId, blob, filename }) {
  const totalChunks = Math.max(1, Math.ceil(blob.size / UPLOAD_CHUNK_SIZE_BYTES));
  let finalPayload = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * UPLOAD_CHUNK_SIZE_BYTES;
    const end = Math.min(start + UPLOAD_CHUNK_SIZE_BYTES, blob.size);
    const chunkBlob = blob.slice(start, end, blob.type);
    const formData = buildUploadFormData({
      filename,
      taskId,
      chunkIndex,
      totalChunks,
      chunkBlob
    });

    const response = await fetch(`${workerServer}/v1/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      const fallback = totalChunks === 1
        ? `Failed to upload file ${filename}`
        : `Failed to upload file ${filename} (part ${chunkIndex + 1} of ${totalChunks})`;
      throw createHttpError(buildApiErrorMessage(payload, fallback), response);
    }

    finalPayload = payload;
  }

  if (!finalPayload?.server_filename) {
    throw new Error(`Upload succeeded but server filename is missing for ${filename}`);
  }

  return finalPayload;
}

async function processFiles({ workerServer, token, taskId, uploadedFiles, outputBaseName, tool, subtool, packagedFilename }) {
  const formData = new FormData();
  formData.append("output_filename", outputBaseName);
  formData.append("task", taskId);
  formData.append("tool", tool);

  if (subtool) {
    formData.append("subtool", subtool);
  }

  if (packagedFilename) {
    formData.append("packaged_filename", packagedFilename);
  }

  uploadedFiles.forEach((item, index) => {
    formData.append(`files[${index}][server_filename]`, item.server_filename);
    formData.append(`files[${index}][filename]`, item.filename);
  });

  const response = await fetch(`${workerServer}/v1/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const payload = await parseResponse(response);
  if (!response.ok || payload?.status !== "TaskSuccess") {
    const message = buildApiErrorMessage(payload, "iLovePDF processing failed");
    throw response.ok ? new Error(message) : createHttpError(message, response);
  }

  return payload;
}

async function downloadProcessedFile({ workerServer, taskId }) {
  const response = await fetch(`${workerServer}/v1/download/${encodeURIComponent(taskId)}`, {
    method: "GET"
  });

  if (!response.ok) {
    throw createHttpError(`Failed to download processed file: ${response.status}`, response);
  }

  return response.blob();
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { message: text };
  }
}

function normalizeToolPath(toolPath) {
  if (typeof toolPath !== "string" || !toolPath.trim()) {
    return "/merge_pdf";
  }

  const path = toolPath.trim();
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeExtension(extension) {
  if (typeof extension !== "string" || !extension.trim()) {
    return "";
  }

  const trimmed = extension.trim().toLowerCase();
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function officeBlobWithCorrectType(blob, extension) {
  const mimeType = OFFICE_MIME_TYPES[normalizeExtension(extension)];

  if (!mimeType || blob.type === mimeType) {
    return blob;
  }

  return new Blob([blob], { type: mimeType });
}

function getFileExtension(filename) {
  if (typeof filename !== "string") {
    return "";
  }

  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function resolveFilename(filename, extension) {
  const ext = normalizeExtension(extension);
  if (typeof filename === "string" && filename.trim()) {
    if (getFileExtension(filename)) {
      return filename.trim();
    }

    return `${filename.trim()}${ext}`;
  }

  return `file${ext || ".pptx"}`;
}

function buildOutputBaseName(filename, suffix) {
  const baseName = (filename || "file").replace(/\.[^.]+$/, "");
  return `${baseName}${suffix}`;
}

function buildApiErrorMessage(payload, fallbackMessage) {
  const extractedMessage = extractPayloadMessage(payload);
  return extractedMessage ? `${fallbackMessage}: ${extractedMessage}` : fallbackMessage;
}

function createHttpError(message, response) {
  const error = new Error(message);
  error.status = response.status;
  error.retryAfter = response.headers.get("Retry-After");
  return error;
}

async function withRetry(operation, retries) {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isRetryableError(error)) {
        throw error;
      }

      const retryAfterMs = parseRetryAfter(error.retryAfter);
      await delay(retryAfterMs ?? RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
      attempt++;
    }
  }
}

function isRetryableError(error) {
  if (error instanceof TypeError) {
    return true;
  }

  return error?.status === 408
    || error?.status === 429
    || error?.status >= 500;
}

function parseRetryAfter(value) {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const retryDate = Date.parse(value);
  return Number.isNaN(retryDate) ? null : Math.max(0, retryDate - Date.now());
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function extractPayloadMessage(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return truncateString(value, 400);
  }

  if (typeof value?.message === 'string' && value.message.trim()) {
    return truncateString(value.message, 400);
  }

  if (typeof value?.error === 'string' && value.error.trim()) {
    return truncateString(value.error, 400);
  }

  try {
    return truncateString(JSON.stringify(value), 400);
  } catch {
    return '';
  }
}

function truncateString(value, maxLength = 1500) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.length > maxLength
    ? `${value.slice(0, maxLength)}...[truncated]`
    : value;
}
