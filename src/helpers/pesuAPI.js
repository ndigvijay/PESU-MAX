const BASE_URL = "https://www.pesuacademy.com/Academy";

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
  const formBody = new URLSearchParams({
    controllerMode: "6403",
    actionType: "38",
    id: semesterId,     
    menuId: "653"
  });

  const response = await fetch(`${BASE_URL}/s/studentProfilePESUAdmin`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest"
    },
    body: formBody.toString()
  });

  const json = await response.json();
  return json;
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
  console.log("[CSRF] Fetching CSRF token from studentProfilePESU...");
  
  try {
    const response = await fetch(`${BASE_URL}/s/studentProfilePESU`, {
      method: "GET",
      credentials: "include",
    });
    
    console.log("[CSRF] Response status:", response.status);
    console.log("[CSRF] Response headers:", Object.fromEntries(response.headers.entries()));
    
    const html = await response.text();
    console.log("[CSRF] Response length:", html.length);
    
    const allMetaTags = html.match(/<meta[^>]+>/gi) || [];
    console.log("[CSRF] All meta tags found:", allMetaTags.length);
    allMetaTags.forEach((tag, i) => {
      if (tag.toLowerCase().includes('csrf') || tag.toLowerCase().includes('token')) {
        console.log(`[CSRF] Meta tag ${i}:`, tag);
      }
    });
    
    const allInputTags = html.match(/<input[^>]*csrf[^>]*>/gi) || [];
    console.log("[CSRF] CSRF input tags found:", allInputTags.length);
    allInputTags.forEach((tag, i) => {
      console.log(`[CSRF] Input tag ${i}:`, tag);
    });
    
    const metaMatch = html.match(/<meta\s+name="_csrf"\s+content="([^"]+)"/i);
    if (metaMatch) {
      console.log("[CSRF] Found via meta name pattern:", metaMatch[1]);
      return metaMatch[1];
    }
    
    const inputMatch = html.match(/<input[^>]+name="_csrf"[^>]+value="([^"]+)"/i);
    if (inputMatch) {
      console.log("[CSRF] Found via input pattern:", inputMatch[1]);
      return inputMatch[1];
    }
    
    const inputMatchReversed = html.match(/<input[^>]+value="([^"]+)"[^>]+name="_csrf"/i);
    if (inputMatchReversed) {
      console.log("[CSRF] Found via input pattern (reversed):", inputMatchReversed[1]);
      return inputMatchReversed[1];
    }
    
    const altMetaMatch = html.match(/<meta\s+content="([^"]+)"\s+name="_csrf"/i);
    if (altMetaMatch) {
      console.log("[CSRF] Found via alt meta pattern:", altMetaMatch[1]);
      return altMetaMatch[1];
    }
    
    const headerMatch = html.match(/_csrf['"]\s*(?:content|value)\s*=\s*['"]([^'"]+)['"]/i);
    if (headerMatch) {
      console.log("[CSRF] Found via header pattern:", headerMatch[1]);
      return headerMatch[1];
    }
    
    const hiddenInputMatch = html.match(/<input\s+type="hidden"\s+name="_csrf"\s+value="([^"]+)"/i);
    if (hiddenInputMatch) {
      console.log("[CSRF] Found via hidden input pattern:", hiddenInputMatch[1]);
      return hiddenInputMatch[1];
    }
    
    const anyInputCsrf = html.match(/name="_csrf"[^>]*value="([^"]+)"/i) || 
                         html.match(/value="([^"]+)"[^>]*name="_csrf"/i);
    if (anyInputCsrf) {
      console.log("[CSRF] Found via any input csrf pattern:", anyInputCsrf[1]);
      return anyInputCsrf[1];
    }
    
    console.log("[CSRF] No CSRF token found! HTML snippet (first 2000 chars):");
    console.log(html.substring(0, 2000));
    console.log("[CSRF] ... HTML snippet (around head/form area):");
    const headMatch = html.match(/<head[^>]*>[\s\S]{0,3000}/i);
    if (headMatch) {
      console.log(headMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error("[CSRF] Error fetching CSRF token:", error);
    return null;
  }
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
  console.log("[GPA] ========================================");
  console.log("[GPA] Fetching GPA for semester:", semesterId);
  
  const csrfToken = await getCsrfToken();
  console.log("[GPA] CSRF token received:", csrfToken ? `"${csrfToken.substring(0, 20)}..."` : "NULL");
  console.log("[GPA] CSRF token length:", csrfToken ? csrfToken.length : 0);
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