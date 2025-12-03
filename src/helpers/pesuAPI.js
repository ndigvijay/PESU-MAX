const BASE_URL = "https://www.pesuacademy.com/Academy";




// curl 'https://www.pesuacademy.com/Academy/a/studentProfilePESU/getStudentSemestersPESU?_=1764590648945' \
//   -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0' \
//   -H 'Accept: */*' \
//   -H 'Accept-Language: en-US,en;q=0.5' \
//   -H 'Accept-Encoding: gzip, deflate, br, zstd' \
//   -H 'Content-Type: application/x-www-form-urlencoded' \
//   -H 'X-CSRF-Token: 338843a4-a119-488b-bf6a-f14c859f9372' \
//   -H 'X-Requested-With: XMLHttpRequest' \
//   -H 'Connection: keep-alive' \
//   -H 'Referer: https://www.pesuacademy.com/Academy/s/studentProfilePESU' \
//   -H 'Cookie: JSESSIONID=cg4UsIrybx7nX2AZTk4bkcdG65nU-8_vzw8GICgm.ip-172-21-1-69; _ga_1HJ7TVZ77N=GS2.1.s1754502904$o70$g1$t1754502913$j51$l0$h0; _ga=GA1.1.2008986841.1711732223; AWSALB=jc0HvQT+vGFljbmFIPw7UxYlFsxI4DlYQsglpq/zPv9XNfSTS0ZqBOgVQdOKxnHp7Be013MLCoAwJq0cyoFA/7MNZkcMRFcdBkWLZkgsSj4wORCmR+7y+uJFQDGg; AWSALBCORS=jc0HvQT+vGFljbmFIPw7UxYlFsxI4DlYQsglpq/zPv9XNfSTS0ZqBOgVQdOKxnHp7Be013MLCoAwJq0cyoFA/7MNZkcMRFcdBkWLZkgsSj4wORCmR+7y+uJFQDGg' \
//   -H 'Sec-Fetch-Dest: empty' \
//   -H 'Sec-Fetch-Mode: cors' \
//   -H 'Sec-Fetch-Site: same-origin' \
//   -H 'TE: trailers'



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
    // Response is JSON-encoded HTML string (can be empty string "")
    const data = await response.json();
    // Return null if empty string
    return data && data.trim() ? data : null;
};

export const getUnitClasses = async (unitId) => {
    const response = await fetch(`${BASE_URL}/a/i/getCourseClasses/${unitId}`,{
      method: "GET",
      credentials: "include",
    });
    // Response is JSON-encoded HTML string (can be empty string "")
    const data = await response.json();
    // Return null if empty string
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
    
    // If it's a binary file, return the blob
    if (contentType.includes('application/pdf') || 
        contentType.includes('application/octet-stream') ||
        contentType.includes('application/vnd')) {
      return { type: 'binary', data: await response.blob(), contentType };
    }
    
    // Otherwise return HTML for parsing download links
    return { type: 'html', data: await response.text() };
};
