const BASE_URL = "https://www.pesuacademy.com/Academy";
const CSRF_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedCsrfToken = null;
let cachedCsrfFetchedAt = 0;
let csrfTokenPromise = null;

export const CONTENT_TYPE_IDS = {
  slides: 2,
  notes: 3,
  assignments: 5,
  qb: 6,
  qa: 7
};

export const CONTENT_TYPE_NAMES = {
  2: 'Slides',
  3: 'Notes',
  5: 'Assignments',
  6: 'QB',
  7: 'QA'
};

export const getAllSemesters = async () => {
  const response = await fetch(
    `${BASE_URL}/a/studentProfilePESU/getStudentSemestersPESU`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest"
      }
    }
  );
  const data = await response.json();
  return data;
}


export const getSemesterDetails = async (semesterId) => {
  const csrfToken = await getCsrfToken();
  const formBody = new URLSearchParams({
    controllerMode: "6403",
    actionType: "38",
    id: semesterId,     
    menuId: "653"
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest"
  };

  if (csrfToken) {
    headers["X-CSRF-TOKEN"] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/s/studentProfilePESUAdmin`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formBody.toString()
  });

  return response.text();
};



export const getSubjectsCode = async () => {
  const response = await fetch(`${BASE_URL}/a/g/getSubjectsCode`,{
    method: "GET",
    credentials: "include",
  });
  const data = await response.json();
  return data;
};

export const getCourseUnits = async (courseId) => {
    const response = await fetch(`${BASE_URL}/a/i/getCourse/${courseId}`,{
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return data && data.trim() ? data : null;
};

export const getUnitClasses = async (unitId) => {
    const response = await fetch(`${BASE_URL}/a/i/getCourseClasses/${unitId}`,{
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return data && data.trim() ? data : null;
};

export const getUserProfile = async () => {
    const params = new URLSearchParams({
      menuId: "670",
      url: "studentProfilePESUAdmin",
      controllerMode: "6414",
      actionType: "5",
      id: "0",
      selectedData: "0",
      _: String(Date.now())
    });

    const response = await fetch(`${BASE_URL}/s/studentProfilePESUAdmin?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const data = await response.text();
    return data;
};

export const getCsrfToken = async () => {
  const now = Date.now();
  if (cachedCsrfToken && now - cachedCsrfFetchedAt < CSRF_CACHE_TTL_MS) {
    return cachedCsrfToken;
  }

  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
  try {
    const response = await fetch(`${BASE_URL}/s/studentProfilePESU`, {
      method: "GET",
      credentials: "include",
    });
    
    const html = await response.text();
    
    const metaMatch = html.match(/<meta\s+name="_csrf"\s+content="([^"]+)"/i);
    if (metaMatch) {
      cachedCsrfToken = metaMatch[1];
      cachedCsrfFetchedAt = Date.now();
      return cachedCsrfToken;
    }
    
    const inputMatch = html.match(/<input[^>]+name="_csrf"[^>]+value="([^"]+)"/i);
    if (inputMatch) {
      cachedCsrfToken = inputMatch[1];
      cachedCsrfFetchedAt = Date.now();
      return cachedCsrfToken;
    }
    
    const inputMatchReversed = html.match(/<input[^>]+value="([^"]+)"[^>]+name="_csrf"/i);
    if (inputMatchReversed) {
      cachedCsrfToken = inputMatchReversed[1];
      cachedCsrfFetchedAt = Date.now();
      return cachedCsrfToken;
    }
    
    const altMetaMatch = html.match(/<meta\s+content="([^"]+)"\s+name="_csrf"/i);
    if (altMetaMatch) {
      cachedCsrfToken = altMetaMatch[1];
      cachedCsrfFetchedAt = Date.now();
      return cachedCsrfToken;
    }
    
    const headerMatch = html.match(/_csrf['"]\s*(?:content|value)\s*=\s*['"]([^'"]+)['"]/i);
    if (headerMatch) {
      cachedCsrfToken = headerMatch[1];
      cachedCsrfFetchedAt = Date.now();
      return cachedCsrfToken;
    }
    
    const hiddenInputMatch = html.match(/<input\s+type="hidden"\s+name="_csrf"\s+value="([^"]+)"/i);
    if (hiddenInputMatch) {
      cachedCsrfToken = hiddenInputMatch[1];
      cachedCsrfFetchedAt = Date.now();
      return cachedCsrfToken;
    }
    
    const anyInputCsrf = html.match(/name="_csrf"[^>]*value="([^"]+)"/i) || 
                         html.match(/value="([^"]+)"[^>]*name="_csrf"/i);
    if (anyInputCsrf) {
      cachedCsrfToken = anyInputCsrf[1];
      cachedCsrfFetchedAt = Date.now();
      return cachedCsrfToken;
    }
    
    return null;
  } catch (error) {
    console.error("[CSRF] Error fetching CSRF token:", error);
    return null;
  } finally {
    csrfTokenPromise = null;
  }
  })();

  return csrfTokenPromise;
};

export const getAttendance = async (semesterId) => {
  // get the CSRF token
  const csrfToken = await getCsrfToken();
  
  const formParams = {
    controllerMode: "6407",
    actionType: "8",
    batchClassId: semesterId,
    menuId: "660"
  };
  
  if (csrfToken) {
    formParams._csrf = csrfToken;
  }
  
  const formBody = new URLSearchParams(formParams);

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest"
  };
  
  // Add CSRF token
  if (csrfToken) {
    headers["X-CSRF-TOKEN"] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/s/studentProfilePESUAdmin`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formBody.toString()
  });

  const data = await response.text();
  return data;
};

export const getSemesterGpa = async (semesterId) => {
  const csrfToken = await getCsrfToken();
  const formParams = {
    controllerMode: "6402",
    actionType: "8",
    semid: semesterId,
    menuId: "652"
  };
  
  if (csrfToken) {
    formParams._csrf = csrfToken;
  }
  
  const formBody = new URLSearchParams(formParams);

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest"
  };
  
  if (csrfToken) {
    headers["X-CSRF-TOKEN"] = csrfToken;
  } else {
    console.error("[GPA] WARNING: No CSRF token available!");
  }

  
  try {
    const response = await fetch(`${BASE_URL}/s/studentProfilePESUAdmin`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formBody.toString()
    });

    
    const text = await response.text();    
      
    return text;
  } catch (error) {
    console.error("[GPA] Fetch error:", error);
    console.error("[GPA] Error message:", error.message);
    throw error;
  }
};

export const getCourseMaterials = async (courseId, classId, contentType = 2) => {
    const params = new URLSearchParams({
      url: "studentProfilePESUAdmin",
      controllerMode: "6403",
      actionType: "60",
      selectedData: courseId,
      id: String(contentType),
      unitid: classId
    });

    const response = await fetch(`${BASE_URL}/s/studentProfilePESUAdmin?${params.toString()}`,{
      method: "GET",
      credentials: "include",
    });
    
    const responseContentType = response.headers.get('Content-Type') || '';
    
    if (responseContentType.includes('application/pdf') || 
        responseContentType.includes('application/octet-stream') ||
        responseContentType.includes('application/vnd')) {
      return { type: 'binary', data: await response.blob(), contentType: responseContentType };
    }
    
    return { type: 'html', data: await response.text() };
};
