# PESU-MAX Privacy Policy

Effective date: April 21, 2026

PESU-MAX is a Chrome extension that helps PES University students use PESU Academy features more efficiently, including attendance and GPA views, course material downloads, faculty lookup, Previous Year Question Paper (PYQ) search/downloads, and optional merged PDF downloads.

## 1) Single Purpose

PESU-MAX processes user data only to provide its core student utility features:

- Access and organize course materials from PESU Academy
- Show attendance, semester, and GPA details in the extension UI
- Fetch faculty information from the PES staff website
- Search and download library-hosted PYQs
- Create optional subject-wise merged PDF downloads from selected materials

The extension does not use collected data for advertising, profiling, or unrelated analytics.

## 2) Data We Collect and Process

Depending on feature usage, PESU-MAX may process:

- **Authentication/session data**: PESU Academy session cookie value (`JSESSIONID`) and library session/authentication cookie values used for the optional PYQ flow
- **Profile data**: name, PRN, SRN, program, branch, semester, section, campus, and where available, email and phone
- **Academic data**: semesters, enrolled subjects, units/classes, attendance values, SGPA/CGPA values
- **Download metadata**: selected subject/class/content type, merge choices, generated ZIP filename/time, selected PYQ titles, and PYQ ZIP filename/time
- **Search/query data**: faculty search queries and PYQ search queries such as course codes or custom titles
- **Faculty data**: publicly available faculty profile details from `staff.pes.edu`
- **Navigation metadata**: per-tab PESU Academy navigation interactions, such as selected portal sections and semester/course identifiers, used only to restore the prior view when the browser Back button is pressed

## 3) How Data Is Collected

Data is collected from:

- PESU Academy pages and endpoints while the user is logged in
- PES library pages and endpoints used for the optional PYQ search/download flow
- Browser extension storage APIs used by PESU-MAX
- User-initiated actions such as searching faculty, searching PYQs, downloading materials, or requesting merged PDFs

## 4) Where Data Is Stored

PESU-MAX stores extension data in `chrome.storage.local` on the user device. The Back-navigation feature stores its per-tab navigation metadata in `chrome.storage.session`, which is cleared when the browser session ends. Navigation metadata does not include credentials, cookies, CSRF tokens, request bodies, or page content.

PESU-MAX does not operate its own external database for user data.

## 5) Data Transmission and Third Parties

To provide requested functionality, the extension may send requests to:

- `https://www.pesuacademy.com/*`
- `https://files.pesuacademy.com/*`
- `https://staff.pes.edu/*`
- `http://library.pes.edu/*` and `https://library.pes.edu/*`
- `https://www.ilovepdf.com/*` and `https://*.ilovepdf.com/*` (only when the user requests merged PDF output for supported Office files)

PDF files selected for merged download are processed locally in the browser using the `pdf-lib` library and are not sent to a separate third-party merge service.

If the user uses the optional PYQ feature, the extension accesses PES library pages to authenticate the library session, search available PYQs, and download selected files.

If the user explicitly requests merged PDF output for supported Office files such as `.ppt`, `.pptx`, `.doc`, or `.docx`, the file being converted is transmitted to iLovePDF infrastructure only as required to convert it to PDF before the final merged download is created.

## 6) User Consent

PESU-MAX is intended to collect/process data only after user consent is obtained through the extension experience and only to support the extension's single purpose.

Users can stop using the extension at any time and remove extension data from browser storage.

## 7) User Controls

Users can control data use by:

- Logging out of PESU Academy
- Removing/uninstalling the extension
- Clearing extension storage from Chrome extension settings
- Avoiding optional faculty lookup, PYQ, or merged-download flows

## 8) Data Retention

Data stored by the extension remains on-device until:

- it is refreshed/overwritten by normal extension operation,
- the user clears extension data, or
- the extension is uninstalled.

Back-navigation metadata is retained only for the active browser session, is limited to a recent per-tab history, and is cleared when the tab is closed or the user explicitly logs out.

## 9) Data Sharing, Sale, and Advertising

- No sale of user data
- No use of user data for targeted advertising
- No sharing of user data with data brokers

Data is processed only as needed to deliver requested extension features.

## 10) Security

PESU-MAX uses browser-provided extension APIs and HTTPS or HTTP requests only to the allowed domains required for the extension features. While reasonable measures are used, no system can guarantee absolute security.

## 11) Children's Privacy

PESU-MAX is intended for university users and is not directed to children under 13.

## 12) Changes to This Policy

This policy may be updated to reflect feature, legal, or compliance changes. The latest version will be made available with the extension/project materials.

## 13) Contact

Project repository: `https://github.com/ndigvijay/PESU-MAX`

For privacy questions, please open an issue in the repository.
