export function getCookie(name) {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: "https://www.example.com", name }, (cookie) => {
      resolve(cookie ? cookie.value : null);
    });
  });
}
