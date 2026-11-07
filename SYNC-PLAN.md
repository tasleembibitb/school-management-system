# School Management System — Vercel Deploy + Realtime Sync Plan

**Project:** School Management System — Government Girls Degree College, Sukkur (Demo)
**Built by:** Tasleem Bibi
**Date:** 2026-11-08
**Status:** ✅ DONE — wired 2026-11-08. Web app and mobile app both sync in realtime through Firebase Realtime Database (`/ggdc-sms/`). Verified end-to-end (see "Verification — what was actually tested" at the end of this file).

## What was actually done (2026-11-08)

- **Firebase project:** `ggdc-sukkur-sms` (free Spark plan, Singapore `asia-southeast1`), Realtime Database at `https://ggdc-sukkur-sms-default-rtdb.asia-southeast1.firebasedatabase.app`, test-mode rules (open read/write, expire 8 Dec 2026 — rules still need tightening, see below). Web app registered as "GGDC Sukkur SMS Web".
- **Database seeded once** with the canonical demo data: 9 students, 14 fee records (Rs. 24,000 collected / Rs. 24,000 pending), 24 result records across 7 programmes, attendance empty. Both apps also seed if the root is ever empty.
- **Web app** (`school-management-system/`): Firebase JS SDK v10.12.2 via CDN (app + auth + database compat), anonymous sign-in, `onValue` listeners on students/attendance/fees/results, localStorage kept as offline cache. Attendance is now keyed by student ID (not name) and the roster is the shared student list for the programme. Results now come from the shared store instead of the static table. Login + 4 demo roles unchanged (still local).
- **Mobile app** (`ggdc-apk-build/ai-studio-app-v2/`): `firebase` npm package, new `src/data/firebase.ts` (init, anonymous sign-in, seed-if-empty, listeners, write helpers), `src/data/store.ts` rewired to the shared store with localStorage as offline cache. Programme IDs unified to the plan's IDs (`fsc-pre-medical`, `fsc-pre-engineering`, `bs-computer-science`, …). Login + 4 roles unchanged (still local). Two real bugs found and fixed while wiring: (1) `addStudent` built IDs like `GGDC-2026-2026010` (all digits counted) — now uses the trailing number only, so the next ID is `GGDC-2026-010`; (2) Results used to invent computed marks for students with no record — now it shows exactly the shared records, same as the website.
- **New clean APK** built from the Firebase-wired code: 325,934 bytes (318 KB), package `com.tasleembibi.ggdcsukkur.sms`, signed (CN=Tasleem Bibi, same key, SHA-256 `a3da0640…a24f`), zero AppsGeyser strings, Firebase config strings present in the built JS, Fees Reset fix intact. File: `school-management-system/GGDC-Sukkur-SMS.apk` (previous login-version APK kept as `GGDC-Sukkur-SMS-login-old.apk`). Not launch-tested in an emulator — first real test on her phone.
- **Vercel:** live at `https://school-management-system-tb-026e.vercel.app/` (project `school-management-system`, deployed with inlined files — GitHub integration is NOT installed, so future updates need a manual redeploy). SSO/Vercel Authentication was disabled so the site is public.
- **One data fix:** Maryam (GGDC-2026-004) is now ADS Science Part I in the shared seed, matching both apps' "My Record" (the web seed had her in FA Humanities by mistake). FA Humanities now has no seed students, so its attendance list is empty until a student is added — the screen says so.
- **Still to do:** (1) tighten the RTDB rules before the test-mode expiry on 8 Dec 2026 (public read, write requires anonymous auth); (2) redeploy the web app to Vercel with the Firebase-wired files (the live site still serves the localStorage-only version until redeployed); (3) push the wired files to GitHub (repo still at commit `5803274`).

## The problem

Today the web app and the mobile app (APK) each keep their own data in
`localStorage` on their own device. A student added on the website does **not**
appear in the APK, and a fee marked Paid in the APK does **not** appear on the
website. `localStorage` can never sync between two apps — both apps must read
and write one shared cloud store instead.

## Part 1 — Vercel deploy (web app)

### Current status: ✅ LIVE (deployed 2026-11-08 01:30 PKT)

- Live URL: **https://school-management-system-tb-026e.vercel.app/** (verified HTTP 200, "All 5 Phases" title). Project `school-management-system`.
- The project was created **without** a Git link (the GitHub integration is not installed), and the first deployment used inlined files — so future updates need a manual redeploy, not a git push.
- SSO / Vercel Authentication was on by default and was **disabled** (`ssoProtection: null`) so the site is public.
- **Not yet redeployed:** the live site still serves the localStorage-only version. The Firebase-wired files in this folder need a redeploy to go live.

## Part 2 — Realtime sync (the real fix)

### Recommended: Firebase Realtime Database (free tier)

**Why this one:**

- Tasleem already signs into Google services with
  `tasleem.bibi.pitp24@gmail.com` (AI Studio, Gmail) — Firebase uses the
  same Google account, no new account/password to remember.
- Realtime Database (RTDB) is built for exactly this: every connected app
  gets live updates the moment data changes (`onValue` listeners), with no
  server code to write or run.
- Free Spark plan is plenty for a demo: 1 GB stored data, 10 GB/month
  downloads, 100 simultaneous connections. This app's whole dataset is a
  few kilobytes.
- Works from both sides with no backend: plain JavaScript in the web app
  (Firebase JS SDK loaded from CDN, no bundler needed) and the React app
  (`firebase` npm package).
- Offline support built in: the APK keeps working without internet and
  syncs when it comes back online.

**Alternatives considered and rejected:**

- *Cloud Firestore* — also Google/free, but its document/collection model
  fits this app's simple JSON shapes less directly than RTDB's plain JSON
  tree, and its realtime listeners cost more reads.
- *Supabase* — good, but needs a separate account and a Postgres table
  design; more moving parts for a demo.
- *A custom server / API* — needs hosting, maintenance and a database;
  overkill and not free-forever in the same way.

### One shared data shape (both apps use exactly this)

Single RTDB root: `/ggdc-sms/`

```json
{
  "ggdc-sms": {
    "students": {
      "GGDC-2026-001": {
        "id": "GGDC-2026-001",
        "name": "Amina",
        "programmeId": "fsc-pre-medical",
        "programmeName": "FSc Pre-Medical",
        "yearPart": "XI",
        "enrollmentDate": "2026-11-08"
      }
    },
    "attendance": {
      "fsc-pre-medical": {
        "2026-11-08": {
          "GGDC-2026-001": true,
          "GGDC-2026-002": false
        }
      }
    },
    "fees": {
      "1": {
        "id": 1,
        "name": "Amina",
        "programmeId": "fsc-pre-medical",
        "programmeName": "FSc Pre-Medical",
        "yearPart": "XI",
        "amount": 4000,
        "status": "Paid",
        "receiptId": "RCP-123",
        "updatedAt": "2026-11-08"
      }
    },
    "results": {
      "ads-science": {
        "GGDC-2026-006": {
          "studentId": "GGDC-2026-006",
          "studentName": "Maryam",
          "programmeId": "ads-science",
          "yearPart": "Part I",
          "subjectMarks": { "English": 85, "Bio-Chemistry": 88, "Zoology": 81, "Botany": 86 },
          "overallPercentage": 85.0,
          "grade": "A",
          "isPass": true
        }
      }
    }
  }
}
```

Notes on the shape:

- **Students are keyed by ID** (object, not array) so both apps can add,
  delete and merge without index conflicts.
- **Attendance is keyed by programme → date → student ID** (`true` =
  present, `false` = absent). This fixes a current mismatch: the web app
  keys attendance by student *name* (`"Program|date" → {name: status}`),
  while the mobile app keys by student *ID*. ID-based wins — names can
  repeat, IDs cannot.
- **Fees are keyed by fee ID** (1–14), same as the web app today.
- **Results become stored data** instead of a hard-coded table. Today the
  web app's results are a static `RESULTS` object in `script.js` (not saved
  anywhere) and the mobile app computes them from seed data. Storing them
  under `/results/<programmeId>/<studentId>` keeps both apps showing the
  same marks and grades.
- **Programme catalogue is shared:** both apps must use the same 7
  programmes with the same IDs and names:

  | programmeId | programmeName |
  |---|---|
  | `fsc-pre-medical` | FSc Pre-Medical |
  | `fsc-pre-engineering` | FSc Pre-Engineering |
  | `fa-humanities` | FA Humanities |
  | `ads-science` | ADS Science |
  | `bs-computer-science` | BS Computer Science |
  | `bsc-science` | BSc Science |
  | `bcom-commerce` | B.Com Commerce |

  The web app currently uses display names only (`"FSc Pre-Medical"`);
  it must map each display name to the matching `programmeId` above.

### Seed data (one-time, copied from the apps as they are today)

- **Students:** the same 9 seed students (GGDC-2026-001 … 009), with the web app's names — Amina, Fatima, Zainab, Maryam, Sana, Hina, Noor, Sara, Mahnoor. One fix: Maryam (GGDC-2026-004) is **ADS Science Part I**, not FA Humanities — that is what both apps' "My Record" already assumed. So FA Humanities has no seed students; its attendance list is empty until one is added.
- **Fees:** the same 14 seed records (7 Paid / Rs. 24,000, 7 Pending / Rs. 24,000), keyed by string ID `"1"`–`"14"`, with `studentId` where the name matches a student (6 records have no student link, `studentId: null`), `receiptId` RCP-001…007 on the Paid ones.
- **Attendance:** starts empty (no saved records yet in either app).
- **Results:** the web app's `RESULTS` table, converted — 24 records across all 7 programmes, keyed by programme → student ID. A result row matches a student in the directory only when name **and** programme both match (e.g. Maryam in ADS Science = GGDC-2026-004); other rows get a deterministic `GGDC-2026-1xx` ID in table order (101–121). ADS Science average stays 67.3%, top Maryam 85.0%, 4 of 4 passed. All sample demo data only — never Tasleem's real ADS marks (1393/1900) or seat number.
- **Note:** RTDB stores the fees object (`"1"`–`"14"`) as an array with a `null` at index 0 — both apps normalise array-or-object on read.

### Security rules (RTDB)

This is a demo with no real personal data, so the simplest safe setup is:

```json
{
  "rules": {
    "ggdc-sms": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

- Anyone can **read** (the deployed site is public anyway).
- **Writes require anonymous sign-in** (`signInAnonymously()` in both apps),
  which stops random bots from wiping the demo data while needing no login
  screen. If Tasleem later wants only her own edits, change `.write` to
  her Google UID.
- Never store real student names, phone numbers, CNICs or real marks here.

### What the Firebase config is (and is not)

- The Firebase web config (`apiKey`, `databaseURL`, `projectId`, …) goes
  **inside the apps' code** (web `script.js`, mobile `store.ts`). These
  keys are public by design — they only say *which* project to talk to.
  The security rules above are what actually protect the data.
- **Nobody must ever paste a Firebase service-account key, Admin SDK
  credential, or password into the apps or into chat.** If a step ever asks
  for one, stop and ask Tasleem.

## Part 3 — Code changes needed (per app)

### Web app (`school-management-system/script.js`) — ✅ DONE 2026-11-08

1. Firebase JS SDK (compat build) added with three `<script>` tags in
   `index.html` before `script.js`:
   `firebase-app-compat.js`, `firebase-auth-compat.js` and
   `firebase-database-compat.js` (v10.12.2 CDN).
2. `firebase.initializeApp(firebaseConfig)` + anonymous sign-in at the top
   of `script.js`; if the CDN is blocked/offline the app falls back to
   localStorage-only mode.
3. The three localStorage pairs were replaced with RTDB listeners + writes,
   keeping the same render code:
   - Students: `onValue` on `ggdc-sms/students` keeps the `students` array
     fresh; add/delete/reset write with `set()` / `remove()`. Students are
     enriched objects (`programmeId`, `programmeName`, `yearPart` kept
     alongside the old `program` / `year` fields the render code uses).
   - Attendance: `onValue` on `ggdc-sms/attendance`; the roster is now the
     shared student list for the programme (no more invented 6-name roster),
     records are keyed by student ID (`true`/`false`), written with
     `set()` per programme/date. The old name-keyed format is gone.
   - Fees: `onValue` on `ggdc-sms/fees`; "Mark as Paid" writes
     `status: "Paid"` with `update()` (plus receipt + date). Reset writes
     the whole seed back with `set()`.
   - Results: the static `RESULTS` object is now only the seed/offline
     fallback; a listener on `ggdc-sms/results` rebuilds it from the shared
     store. `gradeFor()` / `pctOf()` unchanged.
4. `localStorage` is kept as an offline cache: on load the cached copy
   renders immediately, then the first RTDB snapshot replaces it. If RTDB
   is unreachable, the app keeps working locally (demo still works, it just
   does not sync until the connection returns).
5. The login page and all 4 demo roles work exactly as before — the login
   is still checked locally, not through Firebase.
6. One-time seed: `buildSeedPayload()` converts the local seeds into the
   shared shape and writes it only if `/ggdc-sms/` is empty (the database
   was already seeded by REST before the apps were wired, so this is a
   safety net).

### Mobile app (`ggdc-apk-build/ai-studio-app-v2/src/data/store.ts`) — ✅ DONE 2026-11-08

1. `npm install firebase` in `ai-studio-app-v2/`.
2. New `src/data/firebase.ts`: init, anonymous sign-in, `ensureSeeded()`,
   `listenFb()` listeners, `fbSet` / `fbUpdate` / `fbRemove` write helpers,
   array/object normalisation for RTDB's numeric-key arrays.
3. `store.ts` rewired: `onValue` listeners on students/fees/attendance/
   results update the in-memory caches, persist the localStorage offline
   cache and call the existing `notifyListeners()` — **no UI screen changed**
   (every screen still reads through `AppStore` and the hooks).
4. `localStorage` kept as offline cache; RTDB offline persistence is the
   SDK's own (WebView has the INTERNET permission).
5. Mismatches fixed while doing this: both sides now use the plan's
   programme IDs (`fsc-pre-medical`, `fsc-pre-engineering`,
   `bs-computer-science`, …) and both read/write `programmeId`,
   `programmeName`, `yearPart`; attendance is ID-based on both sides;
   results are stored data on both sides.
6. Rebuilt the Vite app (`npm run build`) and the APK with the same
   hand-built tooling as before (aapt2/javac/d8/zipalign/apksigner), same
   package `com.tasleembibi.ggdcsukkur.sms`, same signing key, so it updates
   over the installed APK.

## Part 4 — Credentials / config needed, and who provides them

All items below are now provided / done (2026-11-08):

| Item | Status |
|---|---|
| Vercel account + login | ✅ Tasleem connected Vercel with Google `tasleem.bibi.pitp24@gmail.com`; project `school-management-system` created, live URL above |
| Firebase project | ✅ Created in her Google account: `ggdc-sukkur-sms`, Realtime Database in `asia-southeast1` (Singapore), test-mode rules |
| Firebase config values | ✅ Received (web config snippet) and baked into both apps — public client config, safe in code |
| RTDB security rules | ⏳ **Still to do** — test-mode rules expire 8 Dec 2026; set public read + write requires anonymous auth (see "Security rules" above) |
| One-time seed upload | ✅ Done via REST PUT, verified (9 students, 14 fees, 24 results) |
| Vercel deploy | ✅ Done (inlined files); **redeploy still to do** for the Firebase-wired files |
| Code changes + APK rebuild | ✅ Done (web app + mobile app + new APK, all verified — see "Verification" below) |

**Muse must NOT:** create a Google/Firebase/Vercel account for Tasleem,
enter her passwords, or use any service-account/admin credential.

## Part 5 — Exact steps to finish (in order)

1. ~~**Tasleem:** connect Vercel (sign in with Google) and create the
   Firebase project + Realtime Database; share the Firebase web config.~~
   ✅ DONE — Vercel connected, project `ggdc-sukkur-sms` + Realtime
   Database created (Singapore), web config received.
2. ~~**Muse:** deploy the web app to Vercel from the GitHub repo; verify the
   live URL loads all 5 phases.~~ ✅ DONE — live at
   `https://school-management-system-tb-026e.vercel.app/` (inlined files,
   not a git import — GitHub integration is not installed).
3. ~~**Muse:** set the RTDB security rules; run the one-time seed upload.~~
   Seed upload ✅ DONE (REST PUT, verified). Rules: **still to do** —
   test-mode rules expire 8 Dec 2026; set public read + write requires
   anonymous auth before then.
4. ~~**Muse:** wire the web app to RTDB (Part 3, web app), push to GitHub,
   redeploy on Vercel, verify.~~ Wiring ✅ DONE and verified live against
   the real database (see below). GitHub push + Vercel redeploy **still
   to do** — the live site still serves the localStorage-only version.
5. ~~**Muse:** wire the mobile app to RTDB (Part 3, mobile app), rebuild the
   APK, verify.~~ ✅ DONE — new clean APK built (325,934 bytes, same
   package/signature), store verified 12/12 against the live database.
6. ~~**Verify sync end-to-end:** add a student on the live website → check
   it appears in the APK within seconds (and vice versa); mark a fee Paid
   in the APK → check the website summary changes; save attendance on one
   → check it on the other. Then tell Tasleem it is live.~~ ✅ DONE at
   the data-layer level (see "Verification" below). A final on-phone check
   (add a student in the installed APK → see it on the website) is still
   open — the APK was not launch-tested in an emulator.
7. **Tell Tasleem:** the Vercel URL, the new APK file, and that data now
   syncs in realtime between web and mobile. *(Parent agent to do — the
   Vercel redeploy in step 4 should happen first so the live site matches.)*

## Verification — what was actually tested (2026-11-08)

**Web app — live jsdom test against the real database (10/10 passed):**
the app was served over local HTTP, loaded in jsdom with the real Firebase
CDN SDK, and every write was checked in the live RTDB via the REST API.
- Listeners populated 9 students, fees Rs. 24,000 / Rs. 24,000, ADS
  results avg 67.3% / top Maryam 85.0% from Firebase.
- Admin demo login worked; adding "Test Sync" (ADS Science, Part I) in
  the app created `GGDC-2026-010` in the live database and the grid
  re-rendered with 10 students.
- Marking fee #2 (Fatima) Paid in the app set `status: "Paid"` +
  `receiptId: RCP-002` in the live database.
- Saving ADS Science attendance for today wrote
  `{GGDC-2026-004: true, GGDC-2026-005: true, GGDC-2026-006: true,
  GGDC-2026-010: true}` to the live database (roster = shared students).
- All test writes were removed afterwards; the database was verified back
  to the seed (9 students, 14 fees 24,000/24,000, attendance empty).
- Note: the test's own cleanup step hit a transient `fetch failed` in the
  jsdom process; cleanup was completed and verified manually with curl.

**Mobile app — store test against the real database (12/12 passed):**
the real `store.ts` was run in Node (tsx) with the real Firebase SDK.
- Store synced 9 students (Maryam ADS Science Part I), fees 14 records
  24,000/24,000, ADS results avg 67.3 / top Maryam 85.0 A / 4 of 4.
- `addStudent` wrote `GGDC-2026-010` to the live database (ID bug found
  and fixed in this run — see above).
- `markFeePaid('2')`, `saveAttendance` and `resetFees` (deep-copy fix
  intact: back to 7 Paid / Rs. 24,000 + 7 Pending / Rs. 24,000) all
  verified in the live database; demo login/logout still work.
- All test writes removed afterwards; database verified back to the seed.
- `npx tsc --noEmit` clean, `npm run build` clean (Vite 8.3.6).

**New APK checks:** `apksigner verify` OK (v2+v3, 1 signer, CN=Tasleem
Bibi, SHA-256 `a3da0640…a24f` — same key as before); `aapt2 dump
badging` package `com.tasleembibi.ggdcsukkur.sms`, label "GGDC Sukkur
SMS", minSdk 24, targetSdk 35, only INTERNET permission; zero
"appsgeyser" strings; Firebase config strings present in the built JS;
Fees Reset fix strings present. **Not launch-tested** — no emulator in
the sandbox; first real launch test will be on Tasleem's phone.

**What was NOT verified:** the cross-app live loop in a real browser /
on a real phone (website change → installed APK within seconds and vice
versa) — the data layer on both sides was verified against the same live
database, but the APK itself was not run. Also the live Vercel site does
not yet serve the Firebase-wired files (redeploy pending).

## Current state (for the next agent)

- Web app: all 5 phases + login (4 roles) + Firebase realtime sync.
  GitHub repo `tasleembibitb/school-management-system` is still at commit
  `5803274` (localStorage-only version) — the wired files are NOT pushed
  yet. Staging folder `school-management-system-repo/` is synced with the
  wired files.
- Mobile app: all 5 phases + login (4 roles) + Firebase realtime sync.
  Sources in `~/workspace/ggdc-apk-build/ai-studio-app-v2/` (new
  `src/data/firebase.ts`; `store.ts` and `schoolData.ts` rewired to the
  canonical shared seed). New clean APK (318 KB, Firebase-wired) at
  `school-management-system/GGDC-Sukkur-SMS.apk`; previous APK kept as
  `GGDC-Sukkur-SMS-login-old.apk`.
- Vercel: live at `https://school-management-system-tb-026e.vercel.app/`
  — still serving the old localStorage-only files until redeployed.
- Firebase: project `ggdc-sukkur-sms`, RTDB Singapore, seeded with the
  canonical demo data (9 students, 14 fees, 24 results, attendance
  empty). Test-mode rules expire **8 Dec 2026** — tighten them before
  then (public read, write requires anonymous auth).
- Known behaviour change: FA Humanities has no seed students (Maryam
  moved to ADS Science), so its attendance list is empty until a student
  is added. The mobile Results screen no longer invents computed marks
  for students without a result record — it shows exactly the shared
  records, same as the website.
