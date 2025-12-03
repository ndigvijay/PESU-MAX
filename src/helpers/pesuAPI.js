const BASE_URL = "https://www.pesuacademy.com/Academy";

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

export const getCourseMaterials = async (courseId, classId) => {
    const params = new URLSearchParams({
      url: "studentProfilePESUAdmin",
      controllerMode: "6403",
      actionType: "60",
      selectedData: courseId,
      id: "2",
      unitid: classId
    });

    const response = await fetch(`${BASE_URL}/s/studentProfilePESUAdmin?${params.toString()}`,{
      method: "GET",
      credentials: "include",
    });
    
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/pdf') || 
        contentType.includes('application/octet-stream') ||
        contentType.includes('application/vnd')) {
      return { type: 'binary', data: await response.blob(), contentType };
    }
    
    return { type: 'html', data: await response.text() };
};
