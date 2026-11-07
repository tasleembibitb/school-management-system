# School Management System — Government Girls Degree College, Sukkur (Demo)

A College Management System for Government Girls Degree College, Sukkur, Sindh, Pakistan — built in phases by **Tasleem Bibi**, final-year BSCS student, Begum Nusrat Bhutto Women University, Sukkur. **All 5 phases are complete and merged into this one app.**

- **College motto:** Discipline • Dedication • Excellence
- **Skills used:** HTML, CSS, JavaScript
- **Also by Tasleem:** PITP Certified Web Developer & Data Scientist, Sukkur IBA University, Sep–Nov 2025; Frontend Developer Intern, Decode Labs, Sukkur, Apr–May 2026
- **LinkedIn:** https://www.linkedin.com/in/tasleem-bibi-431b2a361/
- **GitHub:** https://github.com/tasleembibitb
- **Mobile app:** a mobile-app version is built in Google AI Studio (same college, same programs); its APK is available on request and is not committed to this repo.

> **Demo Project / Built by Tasleem Bibi.** Demo project for Government Girls Degree College, Sukkur — not the college's official site. Program names and subjects are the college's real programs (Intermediate FSc/FA under BISE Sukkur; ADS Science under SALU; BS Computer Science, BSc Science, B.Com). All student numbers, student names, attendance, fees and marks are sample demo data only, and in-charges are labelled "In-charge (demo)" — no invented teacher names are presented as real college staff. No principal name, phone number, email address, or street address is used anywhere in this project. Tasleem studied ADS Science at this college; her marks and seat number are NOT in this app.

## Login — 4 demo roles

The app opens with a login page. **Demo login only — no real accounts; the login itself is checked locally in the browser and no password is sent anywhere.** Student, attendance, fees and results data syncs in realtime with the mobile app through Firebase Realtime Database (shared data at `/ggdc-sms/`), with an offline copy kept in the browser. The login session is kept in the browser's sessionStorage, so a refresh keeps you logged in; Logout ends it.

| Demo account | Password | Role | What it can do |
|---|---|---|---|
| `admin` | `demo123` | Admin (Principal / College Admin) | Full access — add/remove students, mark attendance, mark fees Paid, view results, all programs |
| `teacher` | `demo123` | Teacher | Mark + save attendance, view results and students (view only — cannot add/remove students or change fees) |
| `student` | `demo123` | Student | View only — only her own record (demo student Maryam, GGDC-2026-004, ADS Science): attendance, fee record, result |
| `parent` | `demo123` | Parent | View only — only their daughter's record (same demo student Maryam): attendance, fees, results |

- The login page shows all four demo accounts as quick-pick buttons — tap one to log in straight away.
- After login the header shows the logged-in name and role, with a Logout button.
- Permissions are enforced in the page itself: roles that cannot use an action do not see its buttons or forms (e.g. Student/Parent never see the Students, Attendance, Fees or Results sections — only a "My Record" view; Teacher sees the Students and Fees sections but without the Add form, Remove buttons or Mark as Paid buttons, with a "View only" note).
- A wrong username or password shows an error message in Roman Urdu/English and keeps you on the login page.

## Phase 1 — Done

- College landing page: hero, About, Programs, Contact sections
- Programs list: **6 programs**, with level/year, main subjects and student counts
  - FSc Pre-Medical, Intermediate XI & XII — Biology, Chemistry, Physics, English — 96 students
  - FSc Pre-Engineering, Intermediate XI & XII — Mathematics, Chemistry, Physics, English — 84 students
  - FA Humanities, Intermediate XI & XII — Civics, Economics, Education, English — 62 students
  - ADS Science, Associate Degree Part I & II — English, Bio-Chemistry, Zoology, Botany — 74 students
  - BS Computer Science, 4-Year Degree — Programming, Data Structures, Databases, Web Development — 58 students
  - BSc Science, 2-Year Degree — Botany, Zoology, Chemistry, English — 45 students
  - Total: **419 students** (96 + 84 + 62 + 74 + 58 + 45 = 419, sample demo data)
- Responsive design (desktop, tablet, mobile) in dark blue / teal, matching the TB branding
- Mobile menu, program search (try "ADS Science" or "FSc"), demo enquiry form that sends nothing — enquiry options cover XI, XII, ADS Part I & II, BS Computer Science, BSc Science and B.Com Commerce
- HTML, CSS, JavaScript only — no frameworks, no build step

## Phase 2 — Done: Student records

- **Students section:** add a student (name, program, year / part) and search students by name or program, with a program filter.
  - Programs in the form: all **7 verified programs** — FSc Pre-Medical, FSc Pre-Engineering, FA Humanities, ADS Science, BS Computer Science, BSc Science, B.Com Commerce
  - Year / Part options: XI, XII, Part I, Part II, Year 1, Year 2, Year 3, Year 4
  - Each added student gets an automatic demo ID (GGDC-2026-010, …)
- **Storage:** students sync in realtime with the mobile app through Firebase Realtime Database (shared root `/ggdc-sms/students`, keyed by student ID); an offline copy is kept in the browser's localStorage (key `ggdc-sms-students-v1`). Added students appear in the APK within seconds, and vice versa.
- **Seed data:** 9 sample demo students (generic names only) — Amina (FSc Pre-Medical, XI), Fatima (FSc Pre-Medical, XII), Zainab (FSc Pre-Engineering, XI), Maryam (ADS Science, Part I), Sana (ADS Science, Part I), Hina (ADS Science, Part II), Noor (BS Computer Science, Year 1), Sara (BSc Science, Year 2), Mahnoor (B.Com Commerce, Year 1)
- **Remove & reset:** any student card can be removed (demo), and "Reset demo students" restores the original 9 sample students.

## Phase 3 — Done: Attendance

- **Attendance section:** pick a program (all 7 programs) and a date, see the students of that program (from the shared student list), mark each Present / Absent, and save. A saved record reloads when you pick the same program and date again, on the website and in the mobile app.
- **Live summary:** total students, present, absent, and present percentage update as you mark.
- **Buttons:** Mark all present, Mark all absent, Clear saved record.
- **Storage:** records sync in realtime with the mobile app through Firebase Realtime Database (shared root `/ggdc-sms/attendance`, keyed by programme → date → student ID, `true` = present); an offline copy is kept in the browser's localStorage (key `ggdc-attendance-v1`).
- All student names are generic sample demo data only — no real students or staff.

## Phase 4 — Done: Fees record

- **Fees section:** filter by program (all 7 programs) and by status (Paid / Pending) to see fee records.
- **14 sample demo fee records** (2 per program), fee amounts per term in PKR — sample demo amounts only, not real college fees:
  - FSc Pre-Medical — Rs. 4,000 | FSc Pre-Engineering — Rs. 4,000 | FA Humanities — Rs. 2,500
  - ADS Science — Rs. 3,500 | BS Computer Science — Rs. 5,000 | BSc Science — Rs. 3,000 | B.Com Commerce — Rs. 2,000
  - Seed totals: **Rs. 24,000 collected (7 paid) and Rs. 24,000 pending (7 pending)** out of Rs. 48,000 total
- **Mark a fee as Paid** — synced in realtime with the mobile app (Firebase, shared root `/ggdc-sms/fees`, keyed by fee ID 1–14); an offline copy is kept in the browser (localStorage key `ggdc-fees-v1`). The summary (total collected, total pending, paid/pending counts) updates live. "Reset demo fees" restores the seed data.

## Phase 5 — Done: Result report

- **Results section:** choose any of the 7 programs and see sample demo students with marks per subject (out of 100 each, total out of 400), percentage and grade — A (85%+), B (70–84%), C (60–69%), D (50–59%), E (40–49%), Fail (below 40%); pass means 40% or more.
- **Class summary** for the chosen program: class average, top student, pass count (e.g. ADS Science: average 67.3%, top student Maryam 85.0%, 4 of 4 passed).
- ADS Science uses the real ADS subjects (English, Bio-Chemistry, Zoology, Botany) — but all marks are invented sample demo data. Tasleem's own ADS marks and seat number are NOT used anywhere.
- **Storage:** results sync in realtime with the mobile app through Firebase Realtime Database (shared root `/ggdc-sms/results`, keyed by programme → student ID); the same marks and grades show on the website and in the APK.

## Realtime sync — web app ↔ mobile app (Firebase)

Both apps read and write one shared Firebase Realtime Database (free Spark plan, project `ggdc-sukkur-sms`, region Singapore), root `/ggdc-sms/`:

| Data | Shared shape |
|---|---|
| Students | `/students/<ID>` — `{ id, name, programmeId, programmeName, yearPart, enrollmentDate }` |
| Attendance | `/attendance/<programmeId>/<date>/<studentId>` — `true` = present, `false` = absent |
| Fees | `/fees/<1–14>` — `{ id, studentId, studentName, programmeId, amount, status, receiptId, updatedAt }` |
| Results | `/results/<programmeId>/students/<studentId>` — `{ studentName, subjectMarks, overallPercentage, grade, isPass }` |

- The database was seeded once with the demo data (9 students, 14 fee records, 24 result records, empty attendance). Both apps seed it again only if it is ever empty.
- The web app loads the Firebase JS SDK from the Google CDN (`firebase-app-compat.js`, `firebase-auth-compat.js`, `firebase-database-compat.js`, v10.12.2) and signs in anonymously; the mobile app uses the `firebase` npm package with the same config. The Firebase web config in the code is public client config by design — the database rules are what protect the data (test-mode rules until 8 Dec 2026; they must be tightened before then).
- The demo login (admin / teacher / student / parent, password `demo123`) is **not** Firebase — it is still checked locally in each app, exactly as before.
- Verified end-to-end (2026-11-08): a student added on the website appeared in the live database and in the mobile store within seconds; a fee marked Paid in the mobile store appeared in the database; attendance saved on the website appeared in the database — and the test writes were removed afterwards, so the shared data is back to the seed (9 students, Rs. 24,000 / Rs. 24,000 fees, ADS average 67.3%).
- One deliberate difference: the mobile app's Results screen shows exactly the shared result records (same as the website). A student added later gets no invented result row on either app.

## How to run

Open `index.html` in any browser — no server, install or build step needed.

```bash
# or, from this folder:
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | What it is |
|---|---|
| `index.html` | Landing page, About, Programs, Students, Attendance, Fees, Results, Contact |
| `style.css` | All styling — dark blue / teal, responsive (attendance rows, fees cards, results table, grade badges) |
| `script.js` | Mobile menu, program search, student records, attendance, fees record, result report, demo form, footer year, demo login with 4 roles + permissions, My Record view |
| `README.md` | This file |

## Notes

- No jobs, clients, certificates or results have been invented.
- Program names and subjects match the college's real programs; student numbers, names, attendance, fees and marks are sample demo data, clearly labelled on the page.
- Merge note: Phases 3–5 were built in separate folders and merged into this app. Their Attendance (`ggdc-attendance-v1`), Fees (`ggdc-fees-v1`) and Results code was merged as-is; the duplicate student-record code in the Phase 3 and Phase 5 folders (different localStorage keys, different seed lists) was deliberately left out so the Phase 2 student data (key `ggdc-sms-students-v1`) is not broken. The Phase 5 results summary cards were renamed to `result-summary-card` so they do not clash with the Phase 4 fees summary cards.
