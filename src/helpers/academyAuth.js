export const ACADEMY_BASE_URL = "https://www.pesuacademy.com/Academy";
export const ACADEMY_PROFILE_PATH = "/s/studentProfilePESU";
const ACADEMY_LOGIN_PATH = "/j_spring_security_check";


export async function probeSession() {
  const controller = new AbortController();

  try {
    const response = await fetch(`${ACADEMY_BASE_URL}${ACADEMY_PROFILE_PATH}`, {
      credentials: "include",
      redirect: "follow",
      signal: controller.signal
    });

    const alive = response.url.includes(ACADEMY_PROFILE_PATH);
    controller.abort();
    return alive;
  } catch (error) {
    return null;
  }
}

async function readLoginToken() {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`${ACADEMY_BASE_URL}/`, { credentials: "include" });
    const html = await response.text();
    const match =
      html.match(/name="_csrf"[^>]*value="([^"]+)"/i) ||
      html.match(/value="([^"]+)"[^>]*name="_csrf"/i);

    if (match) return match[1];
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
}

export async function loginToAcademy({ username, password }) {
  const token = await readLoginToken();

  if (!token) {
    throw new Error("Unable to read academy login token");
  }

  const controller = new AbortController();
  const response = await fetch(`${ACADEMY_BASE_URL}${ACADEMY_LOGIN_PATH}`, {
    method: "POST",
    credentials: "include",
    redirect: "follow",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      _csrf: token,
      j_username: username,
      j_password: password
    }).toString(),
    signal: controller.signal
  });

  const loggedIn = response.url.includes(ACADEMY_PROFILE_PATH);
  controller.abort();
  return loggedIn;
}
