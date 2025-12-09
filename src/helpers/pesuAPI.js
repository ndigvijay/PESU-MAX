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