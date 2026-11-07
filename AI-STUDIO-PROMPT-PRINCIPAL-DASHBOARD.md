# AI Studio prompt — Principal Dashboard (mobile app)

Copy-paste this whole prompt into AI Studio, in the same School Management System mobile app project. Do NOT start a new app — update the existing one.

---

Build an update to my existing School Management System mobile app for Government Girls Degree College, Sukkur. Keep everything that already works (5 phases, Firebase realtime sync, login, students, attendance, fees, results) and add ONLY the changes below. Do not change the Firebase project, database URL, or data shape.

## 1. Separate Principal and Admin accounts (demo login)

Right now Admin and Principal are one account. Split them into 2 separate demo accounts, password demo123 for all:

- `principal` / demo123 — Principal, view-only reports dashboard
- `admin` / demo123 — Admin, full access, can add/remove students and mark fees Paid
- `teacher` / demo123 — Teacher, attendance + results, students view-only (unchanged)
- `student` / demo123 — Student, only own record Maryam GGDC-2026-004 (unchanged)
- `parent` / demo123 — Parent, only daughter Maryam's record (unchanged)

Show all 5 accounts as tappable buttons on the login screen. Principal must NOT see any Add, Remove, Save, or Mark as Paid button anywhere. Admin keeps all of them.

## 2. Principal Dashboard — first screen after Principal login

When Principal logs in, the FIRST screen is a Dashboard called "College at a glance". Admin also sees this Dashboard, but Teacher / Student / Parent do NOT see it.

Dashboard contents, all computed LIVE from the same Firebase data the Fees / Students / Results screens use (shared root /ggdc-sms/ — students, fees, results). Never hard-code the numbers:

- 4 KPI cards on top:
  1. Total Students — 419 (6 programs, demo data)
  2. Fees Collected — sum of all fees with status Paid (demo: Rs. 24,000, 7 paid)
  3. Fees Pending — sum of all fees with status Pending (demo: Rs. 24,000, 7 pending)
  4. Overall Result — average % across all programs (demo marks)
- Fee collection rate bar: Collected / (Collected + Pending) as a % with a green progress bar (demo: 50%).
- 4 graphs (use charts, not tables):
  1. Donut chart: Fees Collected vs Pending
  2. Bar chart: Students per program — FSc Pre-Medical 96, FSc Pre-Engineering 84, FA Humanities 62, ADS Science 74, BS Computer Science 58, BSc Science 45
  3. Bar chart: Average % per program (from Results data, demo marks)
  4. Stacked bar chart: Fees per program — Paid vs Pending in Rs.
- 3 buttons under the graphs: "Fees Record", "Results", "Students" — each opens that screen in view-only mode for Principal.
- When Admin marks a fee Paid on web or mobile, the Principal dashboard numbers and graphs must update immediately through Firebase realtime sync. Same data, same root /ggdc-sms/.

## 3. New colour scheme (use these exact hex codes)

This is the new scheme, based on top school apps like Schola, EduBoard and PowerSchool — indigo primary + emerald success:

- Header / navigation: Deep Indigo #1E1B4B, darker #14123D
- Primary buttons / links: Indigo #4F46E5 (hover #4338CA)
- Success / Collected / Present: Emerald #10B981 (dark #047857)
- Pending / Warning: Amber #F59E0B
- Results accent: Violet #8B5CF6
- Secondary accent: Teal #06B6D4
- Page background: soft lavender-grey #F8F7FF
- Cards: white #FFFFFF, border #E4E2F5, rounded corners 16px, soft shadow
- Text: dark indigo #1E1B4B, muted text #5B5B7F

Apply this scheme to the WHOLE app — login screen, dashboard, and every other screen — not only the dashboard.

## 4. Relevant-only pages (do not mix sections)

- Fees screen: ONLY fees — summary, collection bar, program + status filter, fee list. No attendance, no results on this screen.
- Attendance screen: ONLY attendance — program + date, Present/Absent, day summary. No fees, no results.
- Students screen: ONLY students. Results screen: ONLY results.
- Dashboard screen: ONLY the KPI cards, collection bar, and the 4 graphs above.

## 5. What to keep unchanged

- Firebase config: project ggdc-sukkur-sms, Realtime Database https://ggdc-sukkur-sms-default-rtdb.asia-southeast1.firebasedatabase.app, root /ggdc-sms/
- Programs, demo students (9 seed students), demo fee amounts (FSc Rs. 4,000; FA Rs. 2,500; ADS Rs. 3,500; BS CS Rs. 5,000; BSc Rs. 3,000; B.Com Rs. 2,000), demo result marks — all demo data only, no real student data.
- Institution name: Government Girls Degree College, Sukkur — NOT Girls High School.

## 6. Check before finishing

- Log in as principal / demo123: Dashboard opens first, 4 KPI cards show, all 4 graphs draw, no edit buttons visible.
- Log in as admin / demo123: Dashboard opens, Admin can still add a student and mark a fee Paid, and the Principal dashboard updates.
- Log in as teacher / demo123: no Dashboard, no fee editing.
- Test on a phone-size screen — KPI cards stack, graphs fit without sideways scrolling.

Then export the updated code as before so a clean APK can be built from it.
