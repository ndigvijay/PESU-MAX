# PESU-MAX Privacy Policy

Effective date: April 20, 2026

PESU-MAX is a Chrome extension that helps PES University students use PESU Academy features more efficiently (course material downloads, attendance view, GPA view, and faculty lookup).

## 1) Single Purpose

PESU-MAX processes user data only to provide its core student utility features:

- Access and organize course materials from PESU Academy
- Show attendance and GPA details in the extension UI
- Fetch faculty information from the PES staff website
- Download selected materials for the user

The extension does not use collected data for advertising, profiling, or unrelated analytics.

## 2) Data We Collect and Process

Depending on feature usage, PESU-MAX may process:

- **Authentication/session data**: PESU Academy session cookie value (`JSESSIONID`)
- **Profile data**: name, PRN, SRN, program, branch, semester, section, campus, and where available, email and phone
- **Academic data**: semesters, enrolled subjects, units/classes, attendance values, SGPA/CGPA values
- **Download metadata**: selected subject/class/content type and generated ZIP filename/time
- **Faculty lookup data**: faculty search query and publicly available faculty profile details from `staff.pes.edu`

## 3) How Data Is Collected

Data is collected from:

- PESU Academy pages and endpoints while the user is logged in
- Browser extension storage APIs used by PESU-MAX
- User-initiated actions (for example, searching faculty or downloading materials)

## 4) Where Data Is Stored

PESU-MAX stores extension data in `chrome.storage.local` on the user device.

PESU-MAX does not operate its own external database for user data.

## 5) Data Transmission and Third Parties

To provide requested functionality, the extension may send requests to:

- `https://www.pesuacademy.com/*`
- `https://files.pesuacademy.com/*`
- `https://staff.pes.edu/*`
- `https://www.ilovepdf.com/*` and `https://*.ilovepdf.com/*` (only when Office-to-PDF conversion is used)

If Office file conversion is triggered, the file being converted is transmitted to iLovePDF infrastructure as required to complete that conversion.

## 6) User Consent

PESU-MAX is intended to collect/process data only after user consent is obtained through the extension experience and only to support the extension's single purpose.

Users can stop using the extension at any time and remove extension data from browser storage.

## 7) User Controls

Users can control data use by:

- Logging out of PESU Academy
- Removing/uninstalling the extension
- Clearing extension storage from Chrome extension settings
- Avoiding optional features that involve third-party conversion services

## 8) Data Retention

Data stored by the extension remains on-device until:

- it is refreshed/overwritten by normal extension operation,
- the user clears extension data, or
- the extension is uninstalled.

## 9) Data Sharing, Sale, and Advertising

- No sale of user data
- No use of user data for targeted advertising
- No sharing of user data with data brokers

Data is processed only as needed to deliver requested extension features.

## 10) Security

PESU-MAX uses browser-provided extension APIs and HTTPS network requests to interact with allowed domains. While reasonable measures are used, no system can guarantee absolute security.

## 11) Children's Privacy

PESU-MAX is intended for university users and is not directed to children under 13.

## 12) Changes to This Policy

This policy may be updated to reflect feature, legal, or compliance changes. The latest version will be made available with the extension/project materials.

## 13) Contact

Project repository: `https://github.com/ndigvijay/PESU-MAX`

For privacy questions, please open an issue in the repository.
