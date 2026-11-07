// School Management System — All 5 phases + Firebase realtime sync
// Mobile menu, program search, student records, attendance, fees, results,
// demo enquiry form, footer year, demo login with 4 roles.
// Data syncs in realtime with the mobile app through Firebase Realtime
// Database (shared root /ggdc-sms/); localStorage keeps an offline copy so
// the app still works without internet. Demo data only — nothing real.

(function () {
  'use strict';

  // Logged-in demo user: { username, role, label, displayName } or null.
  // Set by the login code at the end of this file; render functions below
  // check it so a role can never use an action it is not allowed.
  var currentUser = null;

  // ---------- Firebase realtime sync (shared with the mobile app) ----------
  // Public client config — safe to ship in code (the RTDB rules are what
  // protect the data). Demo project only; no real student data.
  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCYrKxCjvvlyn8Euu2ITPNmtBG-R6y-hC8',
    authDomain: 'ggdc-sukkur-sms.firebaseapp.com',
    databaseURL: 'https://ggdc-sukkur-sms-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'ggdc-sukkur-sms',
    storageBucket: 'ggdc-sukkur-sms.firebasestorage.app',
    messagingSenderId: '1068130100899',
    appId: '1:1068130100899:web:b1cde8e2f15c4993150116'
  };
  var FB_ROOT = 'ggdc-sms';
  // FB.lastError holds the most recent Firebase write failure (null = none).
  // Sync must only be claimed when a write actually succeeded (m8 / C1).
  var FB = { ready: false, db: null, authAttempted: false, authOk: false, lastError: null };

  // Attempt anonymous sign-in before any write (C1). Returns a promise of
  // true/false. Safe to call repeatedly — it only tries once per page load.
  function ensureAuth() {
    if (FB.authOk) return Promise.resolve(true);
    if (!window.firebase || !window.firebase.auth) return Promise.resolve(false);
    if (FB.authAttempted) return Promise.resolve(FB.authOk);
    FB.authAttempted = true;
    try {
      return window.firebase.auth().signInAnonymously().then(function () {
        FB.authOk = true; return true;
      }).catch(function (e) { FB.lastError = e; return false; });
    } catch (e) { FB.lastError = e; return Promise.resolve(false); }
  }
  // Short user-facing sync note: only claim Firebase sync on real success.
  function syncNote(ok) {
    return ok
      ? 'Synced to the mobile app too (Firebase, demo).'
      : 'Saved in this browser only — Firebase sync did not succeed (offline or not signed in), so the mobile app may not see it yet.';
  }

  // Display program name -> shared programmeId (same IDs as the mobile app).
  var PROGRAMME_IDS = {
    'FSc Pre-Medical': 'fsc-pre-medical',
    'FSc Pre-Engineering': 'fsc-pre-engineering',
    'FA Humanities': 'fa-humanities',
    'ADS Science': 'ads-science',
    'BS Computer Science': 'bs-computer-science',
    'BSc Science': 'bsc-science',
    'B.Com Commerce': 'bcom-commerce'
  };
  var PROGRAMME_NAMES = {};
  Object.keys(PROGRAMME_IDS).forEach(function (n) { PROGRAMME_NAMES[PROGRAMME_IDS[n]] = n; });

  function todayString() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // All three return a Promise<boolean>: true only when the write reached
  // Firebase. Callers must use the result before claiming sync (m8).
  function fbWrite(refCall) {
    if (!FB.ready) return Promise.resolve(false);
    return ensureAuth().then(function () {
      try {
        var r = refCall();
        if (r && typeof r.then === 'function') {
          return r.then(function () { return true; }).catch(function (e) { FB.lastError = e; return false; });
        }
        return true;
      } catch (e) { FB.lastError = e; return false; }
    });
  }
  function fbSet(path, value) {
    return fbWrite(function () { return FB.db.ref(path).set(value); });
  }
  function fbUpdate(path, value) {
    return fbWrite(function () { return FB.db.ref(path).update(value); });
  }
  function fbRemove(path) {
    return fbWrite(function () { return FB.db.ref(path).remove(); });
  }
  // RTDB turns objects with sequential numeric keys ("1".."14") into arrays
  // with a null at index 0 — normalise both shapes to a plain array.
  function fbObjectToArray(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.filter(function (v) { return v !== null && v !== undefined; });
    return Object.keys(obj).map(function (k) { return obj[k]; });
  }
  function fbArrayToObject(arr, keyFn) {
    var obj = {};
    arr.forEach(function (item) { obj[keyFn(item)] = item; });
    return obj;
  }

  // In-page confirm dialog (M3) — works everywhere, including WebViews
  // where window.confirm returns false without showing anything.
  // Returns a Promise<boolean>; resolves false on Cancel / dismiss.
  var confirmDialog = document.getElementById('confirmDialog');
  var confirmMessageEl = document.getElementById('confirmMessage');
  var confirmYesBtn = document.getElementById('confirmYes');
  var confirmNoBtn = document.getElementById('confirmNo');
  var confirmResolve = null;
  function showConfirm(message) {
    return new Promise(function (resolve) {
      if (!confirmDialog) { resolve(false); return; }
      if (confirmMessageEl) confirmMessageEl.textContent = message;
      confirmDialog.hidden = false;
      confirmResolve = resolve;
      if (confirmYesBtn) confirmYesBtn.focus();
    });
  }
  function closeConfirm(result) {
    if (confirmDialog) confirmDialog.hidden = true;
    if (confirmResolve) { var r = confirmResolve; confirmResolve = null; r(result); }
  }
  if (confirmYesBtn) confirmYesBtn.addEventListener('click', function () { closeConfirm(true); });
  if (confirmNoBtn) confirmNoBtn.addEventListener('click', function () { closeConfirm(false); });
  if (confirmDialog) confirmDialog.addEventListener('click', function (e) { if (e.target === confirmDialog) closeConfirm(false); });

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.getElementById('navLinks');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.addEventListener('click', function (event) {
      if (event.target.tagName === 'A') {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Program search (FSc, FA, ADS, BS, BSc)
  var search = document.getElementById('classSearch');
  var grid = document.getElementById('classesGrid');
  var count = document.getElementById('classCount');
  var noResults = document.getElementById('noResults');
  if (search && grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.class-card'));
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var haystack = (card.getAttribute('data-search') || '') + ' ' + card.textContent.toLowerCase();
        var match = !q || haystack.indexOf(q) !== -1;
        card.style.display = match ? '' : 'none';
        if (match) shown += 1;
      });
      if (count) count.textContent = 'Showing ' + shown + (shown === 1 ? ' program' : ' programs');
      if (noResults) noResults.hidden = shown !== 0;
    });
  }

  // Phase 2 — Student records (localStorage, demo only, no server)
  var STUDENT_KEY = 'ggdc-sms-students-v1';
  var SEED_STUDENTS = [
    { id: 'GGDC-2026-001', name: 'Amina', program: 'FSc Pre-Medical', year: 'XI' },
    { id: 'GGDC-2026-002', name: 'Fatima', program: 'FSc Pre-Medical', year: 'XII' },
    { id: 'GGDC-2026-003', name: 'Zainab', program: 'FSc Pre-Engineering', year: 'XI' },
    { id: 'GGDC-2026-004', name: 'Maryam', program: 'ADS Science', year: 'Part I' },
    { id: 'GGDC-2026-005', name: 'Sana', program: 'ADS Science', year: 'Part I' },
    { id: 'GGDC-2026-006', name: 'Hina', program: 'ADS Science', year: 'Part II' },
    { id: 'GGDC-2026-007', name: 'Noor', program: 'BS Computer Science', year: 'Year 1' },
    { id: 'GGDC-2026-008', name: 'Sara', program: 'BSc Science', year: 'Year 2' },
    { id: 'GGDC-2026-009', name: 'Mahnoor', program: 'B.Com Commerce', year: 'Year 1' }
  ];

  // One student object, used by both the local cache and Firebase:
  // { id, name, program (display name), programmeId, programmeName,
  //   year, yearPart, enrollmentDate }
  function enrichStudent(s) {
    var program = s.program || s.programmeName || PROGRAMME_NAMES[s.programmeId] || '';
    return {
      id: s.id, name: s.name,
      program: program, programmeId: s.programmeId || PROGRAMME_IDS[program] || '',
      programmeName: program,
      year: s.year || s.yearPart || '', yearPart: s.yearPart || s.year || '',
      enrollmentDate: s.enrollmentDate || todayString()
    };
  }

  function loadStudents() {
    try {
      var raw = window.localStorage.getItem(STUDENT_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed.map(enrichStudent);
      }
    } catch (e) { /* localStorage unavailable — use in-memory seed */ }
    return SEED_STUDENTS.map(enrichStudent);
  }

  // localStorage is only the offline cache now — Firebase is the source of
  // truth, and the listener below keeps this copy fresh.
  function saveStudents(list) {
    try { window.localStorage.setItem(STUDENT_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  // Called by the Firebase listener: replace the list with the shared data.
  function syncStudentsFromFirebase(obj) {
    if (!obj) return;
    var list = fbObjectToArray(obj).map(enrichStudent);
    list.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    if (!list.length) return;
    students = list;
    saveStudents(students);
    renderStudents();
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var students = loadStudents();
  var studentsGrid = document.getElementById('studentsGrid');
  var studentSearch = document.getElementById('studentSearch');
  var studentFilter = document.getElementById('studentFilter');
  var studentCount = document.getElementById('studentCount');
  var studentNoResults = document.getElementById('studentNoResults');

  function renderStudents() {
    if (!studentsGrid) return;
    var q = studentSearch ? studentSearch.value.trim().toLowerCase() : '';
    var prog = studentFilter ? studentFilter.value : '';
    var shown = 0;
    var html = '';
    students.forEach(function (s) {
      var haystack = (s.name + ' ' + s.program + ' ' + s.year + ' ' + s.id).toLowerCase();
      var match = (!q || haystack.indexOf(q) !== -1) && (!prog || s.program === prog);
      if (!match) return;
      shown += 1;
      html += '<article class="class-card">' +
        '<p class="class-num">' + escapeHtml(s.name) + '</p>' +
        '<h3>' + escapeHtml(s.program) + '</h3>' +
        '<p><strong>Year / Part:</strong> ' + escapeHtml(s.year) + '</p>' +
        '<p><strong>Student ID:</strong> ' + escapeHtml(s.id) + '</p>' +
        '<p class="muted">Demo data</p>' +
        (currentUser && currentUser.role === 'admin'
          ? '<button class="btn btn-outline btn-small" type="button" data-delete="' + escapeHtml(s.id) + '">Remove (demo)</button>'
          : '') +
        '</article>';
    });
    studentsGrid.innerHTML = html;
    updateHeroCounts();
    if (studentCount) studentCount.textContent = 'Showing ' + shown + (shown === 1 ? ' student' : ' students');
    if (studentNoResults) studentNoResults.hidden = shown !== 0;
  }

  function nextStudentId() {
    var max = 0;
    students.forEach(function (s) {
      var n = parseInt(String(s.id).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    var next = max + 1;
    // padStart keeps numbers past 999 intact (1000 -> "1000", never "000").
    return 'GGDC-2026-' + String(next).padStart(3, '0');
  }

  // Hero counts are computed from the demo roster, never hardcoded (m2/m3).
  function updateHeroCounts() {
    var hs = document.getElementById('heroStudents');
    if (hs) hs.textContent = students.length;
    var hp = document.getElementById('heroPrograms');
    if (hp) {
      var seen = {};
      students.forEach(function (st) { seen[st.program] = true; });
      hp.textContent = Object.keys(seen).length;
    }
  }

  if (studentsGrid) renderStudents();
  updateHeroCounts();
  if (studentSearch) studentSearch.addEventListener('input', renderStudents);
  if (studentFilter) studentFilter.addEventListener('change', renderStudents);

  if (studentsGrid) {
    studentsGrid.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-delete]') : null;
      if (!btn) return;
      if (!currentUser || currentUser.role !== 'admin') {
        if (studentNote) studentNote.textContent = 'Sirf Admin student remove kar sakta hai — aapka account view only hai.';
        return;
      }
      var id = btn.getAttribute('data-delete');
      var victim = null;
      students.forEach(function (st) { if (st.id === id) victim = st; });
      showConfirm('Remove ' + (victim ? victim.name + ' (' + victim.id + ')' : id) + '? Ye student record delete ho jayega.').then(function (ok) {
        if (!ok) return;
        students = students.filter(function (st) { return st.id !== id; });
        saveStudents(students);
        fbRemove(FB_ROOT + '/students/' + id).then(function (synced) {
          if (studentNote) studentNote.textContent = 'Removed ' + (victim ? victim.name : id) + '. ' + syncNote(synced);
        });
        renderStudents();
      });
    });
  }

  var studentForm = document.getElementById('studentForm');
  var studentNote = document.getElementById('studentNote');
  if (studentForm) {
    studentForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!currentUser || currentUser.role !== 'admin') {
        if (studentNote) studentNote.textContent = 'Sirf Admin student add kar sakta hai — Teacher account view only hai.';
        return;
      }
      var name = document.getElementById('studentName').value.trim();
      var program = document.getElementById('studentProgram').value;
      var year = document.getElementById('studentYear').value;
      if (!name || !program || !year) {
        if (studentNote) studentNote.textContent = 'Please fill in the name, program and year / part.';
        return;
      }
      var duplicateName = students.some(function (st) { return st.name.trim().toLowerCase() === name.toLowerCase(); });
      var student = enrichStudent({ id: nextStudentId(), name: name, program: program, year: year });
      students.push(student);
      saveStudents(students);
      fbSet(FB_ROOT + '/students/' + student.id, student).then(function (ok) {
        if (studentNote) studentNote.textContent = 'Added ' + name + ' (' + program + ', ' + year + ') — ID ' + student.id + '. ' + syncNote(ok) +
          (duplicateName ? ' Warning: is naam ka ek student pehle se mojood hai — dono ka naam same hai, ID alag hai.' : '');
      });
      renderStudents();
      studentForm.reset();
    });
  }

  var resetBtn = document.getElementById('resetStudents');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!currentUser || currentUser.role !== 'admin') {
        if (studentNote) studentNote.textContent = 'Sirf Admin demo students reset kar sakta hai — aapka account view only hai.';
        return;
      }
      showConfirm('Reset demo students? Saare added students delete ho jayenge aur original 9 sample students wapas aa jayenge.').then(function (ok) {
        if (!ok) return;
        students = SEED_STUDENTS.map(enrichStudent);
        saveStudents(students);
        fbSet(FB_ROOT + '/students', fbArrayToObject(students, function (s) { return s.id; })).then(function (synced) {
          if (studentNote) studentNote.textContent = 'Demo students reset to the original 9 sample students. ' + syncNote(synced);
        });
        renderStudents();
      });
    });
  }

  // Demo enquiry form — shows a confirmation, sends nothing
  var form = document.getElementById('enquiryForm');
  var note = document.getElementById('enquiryNote');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('enquiryName').value.trim();
      var cls = document.getElementById('enquiryClass').value;
      if (note) {
        note.textContent = 'Thank you, ' + (name || 'parent') + '. This is a demo only — your enquiry about ' +
          (cls || 'the school') + ' was not sent anywhere.';
      }
      form.reset();
    });
  }

// ---------- Phase 3: Attendance ----------
  // Attendance is keyed by student ID (not name) so it syncs with the
  // mobile app: { programmeId: { date: { studentId: true/false } } }.
  // The roster is the shared student list for that programme.
  var ATTENDANCE_KEY = 'ggdc-attendance-v1';

  // In-memory copy of the shared attendance object; the Firebase listener
  // keeps it fresh, localStorage is only the offline cache.
  function loadAttendanceCache() {
    try {
      var raw = localStorage.getItem(ATTENDANCE_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch (e) { /* fall through */ }
    return {};
  }
  function saveAttendanceCache(all) {
    try { localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(all)); } catch (e) { /* storage unavailable */ }
  }
  var attendanceData = loadAttendanceCache();
  function loadAttendance() { return attendanceData; }
  function saveAttendance(all) {
    attendanceData = all || {};
    saveAttendanceCache(attendanceData);
  }
  function syncAttendanceFromFirebase(obj) {
    attendanceData = obj || {};
    saveAttendanceCache(attendanceData);
    if (currentProgram && currentDate) renderAttendance();
  }

  var attForm = document.getElementById('attendanceForm');
  var attProgram = document.getElementById('attendanceProgram');
  var attDate = document.getElementById('attendanceDate');
  var attNote = document.getElementById('attendanceNote');
  var attPanel = document.getElementById('attendancePanel');
  var attList = document.getElementById('attendanceList');
  var attSummary = document.getElementById('attendanceSummary');
  var attSaved = document.getElementById('attendanceSaved');
  var currentProgram = '';
  var currentDate = '';

  // Default the date picker to today
  if (attDate) {
    var today = new Date();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    attDate.value = today.getFullYear() + '-' + mm + '-' + dd;
  }

  // Saved record for the picked programme + date (or null).
  function attRecord() {
    var pid = PROGRAMME_IDS[currentProgram] || '';
    return (attendanceData[pid] && attendanceData[pid][currentDate]) || null;
  }

  // Summary counts only what was actually marked (m4): unmarked students
  // are "Not marked" — never counted as Present. The rate is Present out of
  // marked students only; '—' when nobody is marked yet.
  function attendanceCounts() {
    var rows = attList ? attList.querySelectorAll('.attendance-row') : [];
    var c = { total: rows.length, present: 0, absent: 0, notMarked: 0 };
    rows.forEach(function (row) {
      var checked = row.querySelector('input[type="radio"]:checked');
      if (!checked || checked.value === 'not-marked') c.notMarked += 1;
      else if (checked.value === 'present') c.present += 1;
      else if (checked.value === 'absent') c.absent += 1;
    });
    c.marked = c.present + c.absent;
    c.rate = c.marked ? Math.round((c.present / c.marked) * 100) : null;
    return c;
  }
  function updateSummary() {
    if (!attSummary || !attList) return;
    var c = attendanceCounts();
    attSummary.innerHTML =
      '<div class="summary-box"><strong>' + c.total + '</strong><span>Enrolled</span></div>' +
      '<div class="summary-box"><strong>' + c.present + '</strong><span>Present</span></div>' +
      '<div class="summary-box"><strong>' + c.absent + '</strong><span>Absent</span></div>' +
      '<div class="summary-box"><strong>' + c.notMarked + '</strong><span>Not marked</span></div>' +
      '<div class="summary-box"><strong>' + (c.rate === null ? '—' : c.rate + '%') + '</strong><span>Present (of marked)</span></div>';
  }
  // Summary of a SAVED record object {studentId: true/false} — computed from
  // the saved record itself, never recomputed from the current roster.
  function savedRecordSummary(record, rosterSize) {
    var present = 0, absent = 0;
    Object.keys(record || {}).forEach(function (k) { if (record[k] === true) present += 1; else if (record[k] === false) absent += 1; });
    var notMarked = Math.max(0, rosterSize - present - absent);
    var marked = present + absent;
    var rate = marked ? Math.round(present / marked * 100) : null;
    return 'Saved record: ' + present + ' present, ' + absent + ' absent, ' + notMarked + ' not marked' +
      (rate === null ? '.' : ' — ' + rate + '% present (of marked).');
  }

  function renderAttendance() {
    if (!attList || !currentProgram || !currentDate) return;
    var pid = PROGRAMME_IDS[currentProgram] || '';
    var roster = students.filter(function (s) { return s.programmeId === pid; });
    var saved = attRecord() || {};
    attList.innerHTML = '';
    if (!roster.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No students in ' + currentProgram + ' yet — add one in the Students section (Admin), then mark attendance here.';
      attList.appendChild(empty);
    }
    roster.forEach(function (st, i) {
      // Not-marked is the default: a student with no saved mark is neither
      // Present nor Absent until the teacher marks them (m4).
      var status = saved[st.id] === true ? 'present' : (saved[st.id] === false ? 'absent' : 'not-marked');
      var row = document.createElement('div');
      row.className = 'attendance-row';
      row.innerHTML =
        '<div><div class="student-name"></div>' +
        '<div class="student-program"></div></div>' +
        '<div class="attendance-choices">' +
        '<label><input type="radio" name="att-' + i + '" value="present"> Present</label>' +
        '<label><input type="radio" name="att-' + i + '" value="absent"> Absent</label>' +
        '<label><input type="radio" name="att-' + i + '" value="not-marked"> Not marked</label>' +
        '</div>';
      row.querySelector('.student-name').textContent = st.name;
      row.querySelector('.student-program').textContent = currentProgram + ' · Demo data';
      row.dataset.student = st.id;
      var radios = row.querySelectorAll('input[type="radio"]');
      var canMark = currentUser && (currentUser.role === 'admin' || currentUser.role === 'teacher');
      radios.forEach(function (r) {
        if (r.value === status) r.checked = true;
        r.disabled = !canMark;
        r.addEventListener('change', updateSummary);
      });
      attList.appendChild(row);
    });
    updateSummary();
    // Save is disabled when the roster is empty — never write an empty {} record (m6).
    if (saveBtn) saveBtn.disabled = roster.length === 0;
    if (attSaved) {
      var savedRec = attRecord();
      if (savedRec) attSaved.textContent = savedRecordSummary(savedRec, roster.length);
      else if (roster.length) attSaved.textContent = 'No saved record for this date yet — mark students, then save.';
    }
  }

  if (attForm) {
    attForm.addEventListener('submit', function (event) {
      event.preventDefault();
      currentProgram = attProgram.value;
      currentDate = attDate.value;
      // Empty date / program and future dates are rejected with a message,
      // never silently ignored (m5).
      if (!currentProgram) { if (attNote) attNote.textContent = 'Please choose a program first.'; return; }
      if (!currentDate) { if (attNote) attNote.textContent = 'Please choose a date first.'; return; }
      if (currentDate > todayString()) { if (attNote) attNote.textContent = 'Future date ki attendance nahi mark kar sakte — aaj ya pehle ki date chunein.'; return; }
      var exists = !!attRecord();
      if (attPanel) attPanel.hidden = false;
      renderAttendance();
      if (attNote) {
        attNote.textContent = exists
          ? 'Saved record found for ' + currentProgram + ' on ' + currentDate + ' — loaded below. Change any mark and save again to update it.'
          : 'Attendance list loaded for ' + currentProgram + ' on ' + currentDate + '. Mark each student Present, Absent, or leave Not marked, then save.';
      }
    });
  }

  var saveBtn = document.getElementById('saveAttendance');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) {
        if (attSaved) attSaved.textContent = 'Sirf Admin ya Teacher attendance save kar sakte hain.';
        return;
      }
      if (!currentProgram || !currentDate) { if (attSaved) attSaved.textContent = 'Pehle program aur date choose karke list load karein.'; return; }
      var pid = PROGRAMME_IDS[currentProgram] || '';
      // Only marked students are written; Not-marked students are left out
      // of the record entirely (m4). An empty roster never saves (m6).
      var record = {};
      attList.querySelectorAll('.attendance-row').forEach(function (row) {
        var checked = row.querySelector('input[type="radio"]:checked');
        if (checked && checked.value === 'present') record[row.dataset.student] = true;
        else if (checked && checked.value === 'absent') record[row.dataset.student] = false;
      });
      var rosterSize = attList.querySelectorAll('.attendance-row').length;
      if (rosterSize === 0) { if (attSaved) attSaved.textContent = 'Is program mein koi student nahi hai — attendance save nahi ho sakti.'; return; }
      if (Object.keys(record).length === 0) { if (attSaved) attSaved.textContent = 'Kuch mark nahi kiya — pehle kam az kam ek student ko Present ya Absent mark karein, phir save karein.'; return; }
      if (!attendanceData[pid]) attendanceData[pid] = {};
      attendanceData[pid][currentDate] = record;
      saveAttendance(attendanceData);
      fbSet(FB_ROOT + '/attendance/' + pid + '/' + currentDate, record).then(function (ok) {
        if (attSaved) attSaved.textContent = 'Attendance saved for ' + currentProgram + ' on ' + currentDate + '. ' +
          savedRecordSummary(record, rosterSize) + ' ' + syncNote(ok);
      });
      updateSummary();
    });
  }

  var markPresentBtn = document.getElementById('markAllPresent');
  if (markPresentBtn) {
    markPresentBtn.addEventListener('click', function () {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) { if (attSaved) attSaved.textContent = 'Sirf Admin ya Teacher attendance mark kar sakte hain.'; return; }
      attList.querySelectorAll('.attendance-row').forEach(function (row) {
        var r = row.querySelector('input[value="present"]');
        if (r) r.checked = true;
      });
      updateSummary();
    });
  }
  var markAbsentBtn = document.getElementById('markAllAbsent');
  if (markAbsentBtn) {
    markAbsentBtn.addEventListener('click', function () {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) { if (attSaved) attSaved.textContent = 'Sirf Admin ya Teacher attendance mark kar sakte hain.'; return; }
      attList.querySelectorAll('.attendance-row').forEach(function (row) {
        var r = row.querySelector('input[value="absent"]');
        if (r) r.checked = true;
      });
      updateSummary();
    });
  }
  var clearBtn = document.getElementById('clearAttendance');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) {
        if (attSaved) attSaved.textContent = 'Sirf Admin ya Teacher saved attendance clear kar sakte hain.';
        return;
      }
      if (!currentProgram || !currentDate) { if (attSaved) attSaved.textContent = 'Pehle program aur date choose karke list load karein.'; return; }
      showConfirm('Clear the saved attendance record for ' + currentProgram + ' on ' + currentDate + '? Ye record delete ho jayega.').then(function (ok) {
        if (!ok) return;
        var pid = PROGRAMME_IDS[currentProgram] || '';
        if (attendanceData[pid]) delete attendanceData[pid][currentDate];
        saveAttendance(attendanceData);
        fbRemove(FB_ROOT + '/attendance/' + pid + '/' + currentDate).then(function (synced) {
          if (attSaved) attSaved.textContent = 'Saved record cleared for ' + currentProgram + ' on ' + currentDate + '. ' + syncNote(synced);
        });
        renderAttendance();
      });
    });
  }

// ---- Phase 4: Fees record (demo only, localStorage) ----
  var FEES_KEY = 'ggdc-fees-v1';
  // Fee table (shared seed, must match the mobile app): FSc Rs. 4,000 /
  // FA Rs. 2,500 / ADS Rs. 3,500 / BS CS Rs. 5,000 / BSc Rs. 3,000 /
  // B.Com Rs. 2,000. Every record's programme, year/part and amount match
  // its student's programme (M1). Every record has a unique receipt
  // RCP-001..RCP-014, fee #n gets RCP-00n (M2).
  // Seed totals: 7 Paid / 7 Pending, Rs. 24,000 collected / Rs. 24,000 pending.
  var SEED_FEES = [
    { id: 1, name: 'Amina', studentId: 'GGDC-2026-001', program: 'FSc Pre-Medical', year: 'XI', amount: 4000, status: 'Paid', receiptId: 'RCP-001' },
    { id: 2, name: 'Fatima', studentId: 'GGDC-2026-002', program: 'FSc Pre-Medical', year: 'XII', amount: 4000, status: 'Pending', receiptId: 'RCP-002' },
    { id: 3, name: 'Sana', studentId: 'GGDC-2026-005', program: 'ADS Science', year: 'Part I', amount: 3500, status: 'Pending', receiptId: 'RCP-003' },
    { id: 4, name: 'Hina', studentId: 'GGDC-2026-006', program: 'ADS Science', year: 'Part II', amount: 3500, status: 'Paid', receiptId: 'RCP-004' },
    { id: 5, name: 'Maryam', studentId: 'GGDC-2026-004', program: 'ADS Science', year: 'Part I', amount: 3500, status: 'Pending', receiptId: 'RCP-005' },
    { id: 6, name: 'Zainab', studentId: 'GGDC-2026-003', program: 'FSc Pre-Engineering', year: 'XI', amount: 4000, status: 'Paid', receiptId: 'RCP-006' },
    { id: 7, name: 'Iqra', studentId: null, program: 'ADS Science', year: 'Part I', amount: 3500, status: 'Paid', receiptId: 'RCP-007' },
    { id: 8, name: 'Noor', studentId: 'GGDC-2026-007', program: 'BS Computer Science', year: 'Year 1', amount: 5000, status: 'Pending', receiptId: 'RCP-008' },
    { id: 9, name: 'Ayesha', studentId: null, program: 'BS Computer Science', year: 'Year 2', amount: 5000, status: 'Pending', receiptId: 'RCP-009' },
    { id: 10, name: 'Rabia', studentId: null, program: 'BS Computer Science', year: 'Year 1', amount: 5000, status: 'Paid', receiptId: 'RCP-010' },
    { id: 11, name: 'Sara', studentId: 'GGDC-2026-008', program: 'BSc Science', year: 'Year 1', amount: 3000, status: 'Pending', receiptId: 'RCP-011' },
    { id: 12, name: 'Mahnoor', studentId: 'GGDC-2026-009', program: 'B.Com Commerce', year: 'Year 1', amount: 2000, status: 'Paid', receiptId: 'RCP-012' },
    { id: 13, name: 'Kiran', studentId: null, program: 'B.Com Commerce', year: 'Year 1', amount: 2000, status: 'Pending', receiptId: 'RCP-013' },
    { id: 14, name: 'Saba', studentId: null, program: 'B.Com Commerce', year: 'Year 2', amount: 2000, status: 'Paid', receiptId: 'RCP-014' }
  ];

  // One fee object, used by both the local cache and Firebase:
  // { id (string), studentId, studentName/name, program, programmeId,
  //   programmeName, year, yearPart, amount, status, receiptId, updatedAt }
  function enrichFee(f) {
    var program = f.program || f.programmeName || PROGRAMME_NAMES[f.programmeId] || '';
    return {
      id: String(f.id), studentId: f.studentId || null,
      studentName: f.studentName || f.name || '', name: f.studentName || f.name || '',
      program: program, programmeId: f.programmeId || PROGRAMME_IDS[program] || '',
      programmeName: program,
      year: f.year || f.yearPart || '', yearPart: f.yearPart || f.year || '',
      amount: f.amount, status: f.status,
      receiptId: f.receiptId || null, updatedAt: f.updatedAt || todayString()
    };
  }

  function loadFees() {
    try {
      var raw = window.localStorage.getItem(FEES_KEY);
      if (!raw) return SEED_FEES.map(enrichFee);
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return SEED_FEES.map(enrichFee);
      return parsed.map(enrichFee);
    } catch (e) {
      return SEED_FEES.map(enrichFee);
    }
  }
  // localStorage is only the offline cache — Firebase is the source of truth.
  function saveFees(fees) {
    try { window.localStorage.setItem(FEES_KEY, JSON.stringify(fees)); } catch (e) { /* storage unavailable — demo still works in memory */ }
  }
  function syncFeesFromFirebase(obj) {
    if (!obj) return;
    var list = fbObjectToArray(obj).map(enrichFee);
    list.sort(function (a, b) { return parseInt(a.id, 10) - parseInt(b.id, 10); });
    if (!list.length) return;
    fees = list;
    saveFees(fees);
    renderFees();
  }
  function formatPKR(n) { return 'Rs. ' + n.toLocaleString('en-US'); }

  // Next unique receipt: 'RCP-' + (highest numeric receipt suffix among all
  // current fees + 1). Never derived from the fee id, so marking a fee paid
  // can never collide with an existing receipt (M2).
  function nextReceiptId() {
    var max = 0;
    fees.forEach(function (f) {
      var m = f.receiptId ? String(f.receiptId).match(/RCP-(\d+)/) : null;
      if (m) { var n = parseInt(m[1], 10); if (!isNaN(n) && n > max) max = n; }
    });
    return 'RCP-' + String(max + 1).padStart(3, '0');
  }

  var fees = loadFees();
  var feesList = document.getElementById('feesList');
  var feeProgram = document.getElementById('feeProgram');
  var feeStatus = document.getElementById('feeStatus');
  var feeCount = document.getElementById('feeCount');
  var feeNoResults = document.getElementById('feeNoResults');

  function renderFees() {
    if (!feesList) return;
    var program = feeProgram ? feeProgram.value : '';
    var status = feeStatus ? feeStatus.value : '';
    // Fees summary follows the programme/status filter (m13): it totals only
    // the records actually shown, and the scope is labelled below it.
    var visibleFees = fees.filter(function (f) {
      return (!program || f.program === program) && (!status || f.status === status);
    });
    var collected = 0, pending = 0, paidCount = 0, pendingCount = 0;
    visibleFees.forEach(function (f) {
      if (f.status === 'Paid') { collected += f.amount; paidCount += 1; }
      else { pending += f.amount; pendingCount += 1; }
    });
    var scopeEl = document.getElementById('feesScopeLabel');
    if (scopeEl) scopeEl.textContent = (program || 'All programmes') + (status ? ' · ' + status + ' only' : '') + ' · sample demo data';
    var collectedEl = document.getElementById('feesCollected');
    var pendingEl = document.getElementById('feesPending');
    var paidCountEl = document.getElementById('feesPaidCount');
    var pendingCountEl = document.getElementById('feesPendingCount');
    var totalEl = document.getElementById('feesTotal');
    if (collectedEl) collectedEl.textContent = formatPKR(collected);
    if (pendingEl) pendingEl.textContent = formatPKR(pending);
    if (paidCountEl) paidCountEl.textContent = paidCount + (paidCount === 1 ? ' paid' : ' paid');
    if (pendingCountEl) pendingCountEl.textContent = pendingCount + (pendingCount === 1 ? ' pending' : ' pending');
    if (totalEl) totalEl.textContent = visibleFees.length;

    feesList.innerHTML = '';
    var shown = 0;
    fees.forEach(function (f) {
      if (program && f.program !== program) return;
      if (status && f.status !== status) return;
      shown += 1;
      var card = document.createElement('article');
      card.className = 'fee-card';
      var info = document.createElement('div');
      var nameEl = document.createElement('p');
      nameEl.className = 'fee-name';
      nameEl.textContent = f.name;
      var progEl = document.createElement('p');
      progEl.className = 'muted';
      progEl.textContent = f.program + ' — ' + f.year + ' (per term)';
      var demoEl = document.createElement('p');
      demoEl.className = 'muted';
      demoEl.textContent = (f.receiptId ? 'Receipt ' + f.receiptId + ' · ' : '') + 'Demo data';
      info.appendChild(nameEl);
      info.appendChild(progEl);
      info.appendChild(demoEl);
      var actions = document.createElement('div');
      actions.className = 'fee-actions';
      var amountEl = document.createElement('p');
      amountEl.className = 'fee-amount';
      amountEl.textContent = formatPKR(f.amount);
      var badge = document.createElement('span');
      badge.className = 'fee-status ' + (f.status === 'Paid' ? 'fee-status-paid' : 'fee-status-pending');
      badge.textContent = f.status;
      actions.appendChild(amountEl);
      actions.appendChild(badge);
      if (f.status === 'Pending' && currentUser && currentUser.role === 'admin') {
        var btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.type = 'button';
        btn.textContent = 'Mark as Paid';
        btn.addEventListener('click', function () {
          if (!currentUser || currentUser.role !== 'admin') return; // Admin only
          f.status = 'Paid';
          // Unique receipt from the highest existing receipt number (M2).
          f.receiptId = f.receiptId || nextReceiptId();
          f.updatedAt = todayString();
          saveFees(fees);
          fbUpdate(FB_ROOT + '/fees/' + f.id, { status: 'Paid', receiptId: f.receiptId, updatedAt: f.updatedAt }).then(function (ok) {
            var fn = document.getElementById('feeNote');
            if (fn) fn.textContent = f.name + ' marked Paid — Receipt ' + f.receiptId + '. ' + syncNote(ok);
          });
          renderFees();
        });
        actions.appendChild(btn);
      }
      card.appendChild(info);
      card.appendChild(actions);
      feesList.appendChild(card);
    });
    var fRate = (collected + pending) ? Math.round(collected / (collected + pending) * 100) : 0;
    var ffl2 = document.getElementById('feesCollectionFill');
    if (ffl2) ffl2.style.width = fRate + '%';
    var fcl2 = document.getElementById('feesCollectionLabel');
    if (fcl2) fcl2.textContent = fRate + '% collected';
    if (feeCount) feeCount.textContent = 'Showing ' + shown + (shown === 1 ? ' fee record' : ' fee records');
    if (feeNoResults) feeNoResults.hidden = shown !== 0;
    if (typeof renderDashboard === 'function' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'principal')) renderDashboard();
  }

  if (feesList) {
    renderFees();
    if (feeProgram) feeProgram.addEventListener('change', renderFees);
    if (feeStatus) feeStatus.addEventListener('change', renderFees);
    var resetFees = document.getElementById('resetFees');
    if (resetFees) {
      resetFees.addEventListener('click', function () {
        if (!currentUser || currentUser.role !== 'admin') {
          var fn2 = document.getElementById('feeNote');
          if (fn2) fn2.textContent = 'Sirf Admin demo fees reset kar sakta hai — aapka account view only hai.';
          return;
        }
        showConfirm('Reset demo fees? Saare Paid marks wapas original seed par aa jayenge (Rs. 24,000 collected / Rs. 24,000 pending).').then(function (ok) {
          if (!ok) return;
          fees = SEED_FEES.map(enrichFee);
          saveFees(fees);
          fbSet(FB_ROOT + '/fees', fbArrayToObject(fees, function (f) { return f.id; })).then(function (synced) {
            var fn3 = document.getElementById('feeNote');
            if (fn3) fn3.textContent = 'Demo fees reset — Rs. 24,000 collected / Rs. 24,000 pending. ' + syncNote(synced);
          });
          if (feeProgram) feeProgram.value = '';
          if (feeStatus) feeStatus.value = '';
          renderFees();
        });
      });
    }
  }

// ---- Phase 5: Result report ----
  // Marks are out of 100 per subject (4 subjects per program, total out of 400).
  // All marks are SAMPLE DEMO DATA. ADS subjects are the real ADS subjects
  // (English, Bio-Chemistry, Zoology, Botany) but the marks are invented samples.
  // Every row links to a real seed student (name + programme match);
  // the 21 orphan rows that used synthetic IDs GGDC-2026-101..121 were
  // dropped — no marks invented. Remaining rows per programme:
  // FSc Pre-Medical 1 (Fatima), FSc Pre-Engineering 1 (Zainab),
  // ADS Science 1 (Maryam); FA Humanities, BS CS, BSc Science and
  // B.Com Commerce have 0 rows (no seed student of that programme has
  // result marks in the demo). Averages are computed from these rows only:
  // FSc Pre-Medical 85.3%, FSc Pre-Engineering 86.8%, ADS Science 85.0%.
  var RESULTS_SEED = {
    'FSc Pre-Medical': {
      subjects: ['Biology', 'Chemistry', 'Physics', 'English'],
      students: [
        { studentId: 'GGDC-2026-002', name: 'Fatima', year: 'XII', marks: [88, 84, 79, 90] }
      ]
    },
    'FSc Pre-Engineering': {
      subjects: ['Mathematics', 'Chemistry', 'Physics', 'English'],
      students: [
        { studentId: 'GGDC-2026-003', name: 'Zainab', year: 'XI', marks: [91, 86, 88, 82] }
      ]
    },
    'FA Humanities': {
      subjects: ['Civics', 'Economics', 'Education', 'English'],
      students: []
    },
    'ADS Science': {
      subjects: ['English', 'Bio-Chemistry', 'Zoology', 'Botany'],
      students: [
        { studentId: 'GGDC-2026-004', name: 'Maryam', year: 'Part I', marks: [85, 88, 81, 86] }
      ]
    },
    'BS Computer Science': {
      subjects: ['Programming', 'Data Structures', 'Databases', 'Web Development'],
      students: []
    },
    'BSc Science': {
      subjects: ['Botany', 'Zoology', 'Chemistry', 'English'],
      students: []
    },
    'B.Com Commerce': {
      subjects: ['Accounting', 'Business Maths', 'Economics', 'English'],
      students: []
    }
  };

  function totalMarks(marks) {
    var t = 0;
    for (var i = 0; i < marks.length; i++) { if (marks[i] != null) t += marks[i]; }
    return t;
  }
  function presentMarks(marks) { return marks.filter(function (m) { return m != null; }); }
  function pctOf(total, max) { return total / max * 100; }
  function gradeFor(pct) {
    if (pct >= 85) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    if (pct >= 40) return 'E';
    return 'Fail';
  }
  function isPass(pct) { return pct >= 40; }

  // Live results come from Firebase; the static table above is the seed
  // (and the offline fallback) — same marks, reshaped for the shared store.
  var RESULTS = RESULTS_SEED;

  // Called by the Firebase listener: rebuild the results table from the
  // shared data ({ programmeId: { subjects, students: { id: {...} } } }).
  function syncResultsFromFirebase(obj) {
    if (!obj) return;
    var next = {};
    Object.keys(obj).forEach(function (pid) {
      var prog = obj[pid] || {};
      var display = PROGRAMME_NAMES[pid] || pid;
      var subjects = prog.subjects || [];
      var studentsObj = prog.students || {};
      var list = Object.keys(studentsObj).map(function (sid) {
        var r = studentsObj[sid] || {};
        var marks = subjects.map(function (sub) {
          return (r.subjectMarks && r.subjectMarks[sub] != null) ? r.subjectMarks[sub] : null;
        });
        // Rows with a missing subject mark are KEPT — the table shows a dash
        // for the missing mark instead of silently dropping the row (m11).
        return { studentId: r.studentId || sid, name: r.studentName || '', year: r.yearPart || r.year || '', marks: marks };
      });
      next[display] = { subjects: subjects, students: list };
    });
    if (Object.keys(next).length) {
      // Fill in any programme the shared store does not have yet from the seed.
      Object.keys(RESULTS_SEED).forEach(function (prog) { if (!next[prog]) next[prog] = RESULTS_SEED[prog]; });
      RESULTS = next;
      renderResults();
      if (currentUser && (currentUser.role === 'student' || currentUser.role === 'parent')) renderMyRecord();
    }
  }

  // Build the one-time seed payload for /ggdc-sms/ from the local seeds.
  // Every result row links to a real seed student (name + programme match);
  // a row with no matching seed student is skipped, never given a
  // synthetic ID.
  function buildSeedPayload() {
    var studentsObj = fbArrayToObject(SEED_STUDENTS.map(enrichStudent), function (s) { return s.id; });
    var feesObj = fbArrayToObject(SEED_FEES.map(enrichFee), function (f) { return f.id; });
    var resultsObj = {};
    Object.keys(RESULTS_SEED).forEach(function (program) {
      var pid = PROGRAMME_IDS[program];
      var data = RESULTS_SEED[program];
      var recs = {};
      data.students.forEach(function (s) {
        var match = null;
        SEED_STUDENTS.forEach(function (st) { if (st.name === s.name && st.program === program) match = st; });
        if (!match) return; // no seed student — drop, never invent an ID
        var sid = s.studentId || match.id;
        var total = totalMarks(s.marks);
        var pct = pctOf(total, data.subjects.length * 100);
        var sm = {};
        data.subjects.forEach(function (sub, i) { sm[sub] = s.marks[i]; });
        recs[sid] = {
          studentId: sid, studentName: s.name, programmeId: pid,
          yearPart: s.year, year: s.year,
          subjectMarks: sm, overallPercentage: Math.round(pct * 100) / 100,
          grade: gradeFor(pct), isPass: isPass(pct)
        };
      });
      resultsObj[pid] = { subjects: data.subjects.slice(), students: recs };
    });
    return { students: studentsObj, attendance: {}, fees: feesObj, results: resultsObj };
  }

  var resultProgram = document.getElementById('resultProgram');
  var resultHead = document.getElementById('resultHead');
  var resultBody = document.getElementById('resultBody');
  var resultSummary = document.getElementById('resultSummary');
  var resultCount = document.getElementById('resultCount');

  function renderResults() {
    if (!resultProgram || !resultHead || !resultBody) return;
    var program = resultProgram.value;
    var data = RESULTS[program];
    if (!data) return;
    var max = data.subjects.length * 100;

    // Table header
    resultHead.innerHTML = '';
    var headRow = document.createElement('tr');
    ['Student', 'Year / Part'].concat(data.subjects, ['Total', '%', 'Grade']).forEach(function (label) {
      var th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    resultHead.appendChild(headRow);

    // Table body + summary. A missing subject mark shows as a dash (m11);
    // totals/%/grade are computed over the marks that exist, and a row with
    // no marks at all is shown but left out of the class summary.
    resultBody.innerHTML = '';
    var sumPct = 0;
    var counted = 0;
    var passCount = 0;
    var top = null;
    data.students.forEach(function (s) {
      var present = presentMarks(s.marks);
      var hasMarks = present.length > 0;
      var total = totalMarks(s.marks);
      var maxPresent = present.length * 100;
      var pct = hasMarks ? pctOf(total, maxPresent) : null;
      var grade = hasMarks ? gradeFor(pct) : null;
      if (hasMarks) {
        sumPct += pct;
        counted += 1;
        if (isPass(pct)) passCount += 1;
        if (!top || pct > top.pct) top = { name: s.name, pct: pct };
      }
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      nameCell.textContent = s.name;
      row.appendChild(nameCell);
      var yearCell = document.createElement('td');
      yearCell.textContent = s.year;
      row.appendChild(yearCell);
      s.marks.forEach(function (m) {
        var cell = document.createElement('td');
        cell.textContent = (m == null ? '—' : m);
        row.appendChild(cell);
      });
      var totalCell = document.createElement('td');
      totalCell.textContent = hasMarks ? total + ' / ' + maxPresent : '—';
      row.appendChild(totalCell);
      var pctCell = document.createElement('td');
      pctCell.textContent = hasMarks ? pct.toFixed(1) + '%' : '—';
      row.appendChild(pctCell);
      var gradeCell = document.createElement('td');
      if (grade) {
        var badge = document.createElement('span');
        badge.className = 'grade grade-' + grade.toLowerCase();
        badge.textContent = grade;
        gradeCell.appendChild(badge);
      } else {
        gradeCell.textContent = '—';
      }
      row.appendChild(gradeCell);
      resultBody.appendChild(row);
    });

    var n = data.students.length;
    var avg = counted ? sumPct / counted : null;
    if (resultCount) resultCount.textContent = 'Showing ' + n + (n === 1 ? ' student' : ' students') + ' — ' + program +
      (n === 0 ? ' (no result rows for this programme in the demo)' : '');
    if (resultSummary) {
      resultSummary.innerHTML = '';
      var items = [
        { label: 'Class average', value: avg === null ? '—' : avg.toFixed(1) + '%' },
        { label: 'Top student', value: top ? top.name + ' (' + top.pct.toFixed(1) + '%)' : '—' },
        { label: 'Pass', value: counted ? passCount + ' of ' + counted + ' (' + Math.round(passCount / counted * 100) + '%)' : '—' }
      ];
      items.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'result-summary-card';
        var labelEl = document.createElement('p');
        labelEl.className = 'result-summary-label';
        labelEl.textContent = item.label;
        var valueEl = document.createElement('p');
        valueEl.className = 'result-summary-value';
        valueEl.textContent = item.value;
        card.appendChild(labelEl);
        card.appendChild(valueEl);
        resultSummary.appendChild(card);
      });
    }
  }

  if (resultProgram) {
    resultProgram.addEventListener('change', renderResults);
    renderResults();
  }


// ---- Principal / Admin Dashboard — visual reports (Chart.js) ----
// Numbers are computed live from the same records the Fees / Students /
// Results pages use — no separate copy, so dashboard and pages agree.
// College-wide SAMPLE totals shown on the programme cards and dashboard
// charts (labelled as such on the page) — NOT the demo roster. The demo
// roster itself has 9 students; the hero counts are computed from it (m2/m3).
var PROGRAM_COUNTS = {
  'FSc Pre-Medical': 96, 'FSc Pre-Engineering': 84, 'FA Humanities': 62,
  'ADS Science': 74, 'BS Computer Science': 58, 'BSc Science': 45,
  'B.Com Commerce': 41
};
var dashboardCharts = [];
function destroyDashboardCharts() {
  dashboardCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
  dashboardCharts = [];
}
function renderDashboard() {
  var dash = document.getElementById('dashboard');
  if (!dash || dash.hidden) return;
  // KPI: students
  var totalStudents = 0;
  Object.keys(PROGRAM_COUNTS).forEach(function (p) { totalStudents += PROGRAM_COUNTS[p]; });
  var kpiStudents = document.getElementById('kpiStudents');
  if (kpiStudents) kpiStudents.textContent = totalStudents;
  // KPI: fees
  var collected = 0, pending = 0, paidCount = 0, pendingCount = 0;
  fees.forEach(function (f) {
    if (f.status === 'Paid') { collected += f.amount; paidCount += 1; }
    else { pending += f.amount; pendingCount += 1; }
  });
  var kc = document.getElementById('kpiCollected');
  if (kc) kc.textContent = formatPKR(collected);
  var kcs = document.getElementById('kpiCollectedSub');
  if (kcs) kcs.textContent = paidCount + ' paid · ' + fees.length + ' records';
  var kp = document.getElementById('kpiPending');
  if (kp) kp.textContent = formatPKR(pending);
  var kps = document.getElementById('kpiPendingSub');
  if (kps) kps.textContent = pendingCount + ' pending';
  var rate = (collected + pending) ? Math.round(collected / (collected + pending) * 100) : 0;
  var fill = document.getElementById('collectionFill');
  if (fill) fill.style.width = rate + '%';
  var rl = document.getElementById('collectionRateLabel');
  if (rl) rl.textContent = rate + '% collected';
  var cn = document.getElementById('collectionNote');
  if (cn) cn.textContent = 'Collected ' + formatPKR(collected) + ' of ' + formatPKR(collected + pending) + ' total (demo amounts, per term).';
  var ffl = document.getElementById('feesCollectionFill');
  if (ffl) ffl.style.width = rate + '%';
  var fcl = document.getElementById('feesCollectionLabel');
  if (fcl) fcl.textContent = rate + '% collected';
  // KPI: overall result average
  var sumAvg = 0, progCount = 0;
  Object.keys(RESULTS).forEach(function (prog) {
    var d = RESULTS[prog];
    if (!d || !d.students.length) return;
    var max = d.subjects.length * 100, s = 0;
    d.students.forEach(function (st) { s += pctOf(totalMarks(st.marks), max); });
    sumAvg += s / d.students.length; progCount += 1;
  });
  var overall = progCount ? sumAvg / progCount : 0;
  var kr = document.getElementById('kpiResult');
  if (kr) kr.textContent = overall ? overall.toFixed(1) + '%' : '—';
  var krs = document.getElementById('kpiResultSub');
  if (krs) krs.textContent = 'Class average across ' + progCount + ' programs · demo marks';
  // Charts — need Chart.js; if CDN blocked, KPIs + bars above still work
  if (!window.Chart) return;
  destroyDashboardCharts();
  var labels = Object.keys(PROGRAM_COUNTS);
  // 1. Fees donut
  var c1 = document.getElementById('chartFeesDonut');
  if (c1) dashboardCharts.push(new Chart(c1, { type: 'doughnut',
    data: { labels: ['Collected', 'Pending'], datasets: [{ data: [collected, pending], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }));
  // 2. Students per program
  var c2 = document.getElementById('chartStudents');
  if (c2) dashboardCharts.push(new Chart(c2, { type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Students', data: labels.map(function (p) { return PROGRAM_COUNTS[p]; }), backgroundColor: '#4f46e5', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } }));
  // 3. Average % per program
  var avgData = labels.map(function (prog) {
    var d = RESULTS[prog];
    if (!d || !d.students.length) return 0;
    var max = d.subjects.length * 100, s = 0;
    d.students.forEach(function (st) { s += pctOf(totalMarks(st.marks), max); });
    return Math.round(s / d.students.length * 10) / 10;
  });
  var c3 = document.getElementById('chartResults');
  if (c3) dashboardCharts.push(new Chart(c3, { type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Average %', data: avgData, backgroundColor: '#8b5cf6', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } } }));
  // 4. Fees per program — paid vs pending (stacked)
  var paidBy = labels.map(function (prog) { var t = 0; fees.forEach(function (f) { if (f.program === prog && f.status === 'Paid') t += f.amount; }); return t; });
  var pendBy = labels.map(function (prog) { var t = 0; fees.forEach(function (f) { if (f.program === prog && f.status !== 'Paid') t += f.amount; }); return t; });
  var c4 = document.getElementById('chartFeesProgram');
  if (c4) dashboardCharts.push(new Chart(c4, { type: 'bar',
    data: { labels: labels, datasets: [
      { label: 'Paid (Rs.)', data: paidBy, backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Pending (Rs.)', data: pendBy, backgroundColor: '#f59e0b', borderRadius: 4 } ] },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } } }));
}

// ---- Login — 4 demo roles (no real accounts, no backend) ----
  // Demo accounts are shown on the login page so anyone can try them.
  // The username decides the role; the password is the same for all four.
  var SESSION_KEY = 'ggdc-sms-session-v1';
  var DEMO_USERS = {
    principal: { password: 'demo123', role: 'principal', label: 'Principal', displayName: 'Principal (GGDC Sukkur)' },
    admin:   { password: 'demo123', role: 'admin',   label: 'Admin',   displayName: 'Admin' },
    teacher: { password: 'demo123', role: 'teacher', label: 'Teacher', displayName: 'Teacher' },
    student: { password: 'demo123', role: 'student', label: 'Student', displayName: 'Maryam (Student)' },
    parent:  { password: 'demo123', role: 'parent',  label: 'Parent',  displayName: 'Parent of Maryam' }
  };
  // Demo student for the Student / Parent "My Record" view. Everything
  // about her is read from her own student record by ID (m10) — never by
  // first-name match, and her programme/year are never hardcoded.
  var MY_STUDENT_ID = 'GGDC-2026-004';
  function myStudentRecord() {
    var found = null;
    students.forEach(function (st) { if (st.id === MY_STUDENT_ID) found = st; });
    if (!found) SEED_STUDENTS.forEach(function (st) { if (st.id === MY_STUDENT_ID) found = enrichStudent(st); });
    return found;
  }

  var loginForm = document.getElementById('loginForm');
  var loginUser = document.getElementById('loginUser');
  var loginPass = document.getElementById('loginPass');
  var loginError = document.getElementById('loginError');
  var logoutBtn = document.getElementById('logoutBtn');
  var userArea = document.getElementById('userArea');
  var userChip = document.getElementById('userChip');
  var myRecord = document.getElementById('myRecord');
  var myRecordNote = document.getElementById('myRecordNote');
  var myRecordBody = document.getElementById('myRecordBody');
  var studentsViewNote = document.getElementById('studentsViewNote');
  var feesViewNote = document.getElementById('feesViewNote');

  function renderMyRecord() {
    if (!myRecordBody) return;
    var me = myStudentRecord();
    if (!me) { myRecordBody.innerHTML = '<p>No record found for the demo student (demo).</p>'; return; }
    var progData = RESULTS[me.program];
    var maryam = null;
    if (progData) {
      progData.students.forEach(function (s) { if (s.studentId === MY_STUDENT_ID || (s.name === me.name && !s.studentId)) maryam = s; });
    }
    // Fee by student ID, never by first-name match (m10).
    var fee = null;
    fees.forEach(function (f) { if (f.studentId === MY_STUDENT_ID) fee = f; });

    // Attendance: count this student's saved marks across her programme's records.
    var att = loadAttendance();
    var myPid = me.programmeId || PROGRAMME_IDS[me.program] || '';
    var presentDays = 0, absentDays = 0;
    var myAtt = (att && att[myPid]) || {};
    Object.keys(myAtt).forEach(function (date) {
      var rec = myAtt[date] || {};
      if (rec[MY_STUDENT_ID] === true) presentDays += 1;
      else if (rec[MY_STUDENT_ID] === false) absentDays += 1;
    });
    var attDays = presentDays + absentDays;
    var attPct = attDays ? Math.round(presentDays / attDays * 100) : null;

    var html = '<div class="my-record-grid">';
    html += '<article class="my-record-card"><h3>Student</h3>' +
      '<p><strong>Name:</strong> ' + escapeHtml(me.name) + '</p>' +
      '<p><strong>Student ID:</strong> ' + escapeHtml(me.id) + '</p>' +
      '<p><strong>Program:</strong> ' + escapeHtml(me.program) + ' — ' + escapeHtml(me.year) + '</p>' +
      '<p class="muted">Demo data</p></article>';

    html += '<article class="my-record-card"><h3>Attendance</h3>';
    if (attPct === null) {
      html += '<p>No attendance record saved yet.</p>' +
        '<p class="muted">Teacher ya Admin jab ADS Science ki attendance save karein ge to yahan dikhegi.</p>';
    } else {
      html += '<p><strong>' + attPct + '% present</strong> — ' + presentDays + ' of ' + attDays +
        ' saved day' + (attDays === 1 ? '' : 's') + ' present, ' + absentDays + ' absent.</p>';
    }
    html += '<p class="muted">Demo data</p></article>';

    html += '<article class="my-record-card"><h3>Fees</h3>';
    if (fee) {
      html += '<p><strong>' + formatPKR(fee.amount) + '</strong> per term</p>' +
        '<p>Status: <strong>' + escapeHtml(fee.status) + '</strong></p>' +
        '<p class="muted">Fee record #' + fee.id + ' — demo data (sample amount, not the real college fee)</p>';
    } else {
      html += '<p>No fee record found (demo).</p>';
    }
    html += '</article>';

    html += '<article class="my-record-card"><h3>Result — ' + escapeHtml(me.program) + '</h3>';
    if (maryam && progData) {
      var present = presentMarks(maryam.marks);
      var max = present.length * 100;
      var total = totalMarks(maryam.marks);
      var pct = present.length ? pctOf(total, max) : null;
      var grade = pct === null ? null : gradeFor(pct);
      var sumPct = 0, counted = 0, passCount = 0;
      progData.students.forEach(function (s) {
        var pr = presentMarks(s.marks);
        if (!pr.length) return;
        var p = pctOf(totalMarks(s.marks), pr.length * 100);
        sumPct += p; counted += 1;
        if (isPass(p)) passCount += 1;
      });
      var avg = counted ? sumPct / counted : null;
      if (pct === null) {
        html += '<p>No marks recorded yet (demo).</p>';
      } else {
        html += '<p><strong>Total:</strong> ' + total + ' / ' + max + ' — <strong>' + pct.toFixed(1) +
          '%</strong> — Grade <strong>' + grade + '</strong></p>';
        html += '<div class="table-wrap"><table class="result-table"><thead><tr>';
        progData.subjects.forEach(function (sub) { html += '<th>' + escapeHtml(sub) + '</th>'; });
        html += '</tr></thead><tbody><tr>';
        maryam.marks.forEach(function (m) { html += '<td>' + (m == null ? '—' : m) + '</td>'; });
        html += '</tr></tbody></table></div>';
        html += '<p class="muted">Class average ' + (avg === null ? '—' : avg.toFixed(1) + '%') + ', ' + passCount + ' of ' +
          counted + ' passed — demo data.</p>';
      }
    } else {
      html += '<p>No result found (demo).</p>';
    }
    html += '</article></div>';
    myRecordBody.innerHTML = html;
  }

  // Clear status messages that belong to a previous role/session, so a
  // student/parent never sees the admin's stale messages (and vice versa).
  function clearStatusMessages() {
    [studentNote, attNote, attSaved].forEach(function (el) { if (el) el.textContent = ''; });
    var fn = document.getElementById('feeNote');
    if (fn) fn.textContent = '';
    var en = document.getElementById('enquiryNote');
    if (en) en.textContent = '';
    if (loginError) loginError.hidden = true;
  }

  function applyRole() {
    var role = currentUser ? currentUser.role : null;
    var isAdmin = role === 'admin';
    var isPrincipal = role === 'principal';
    var isTeacher = role === 'teacher';
    var isStudentParent = role === 'student' || role === 'parent';
    var loggedOut = !currentUser;
    var canMark = isAdmin || isTeacher;
    var canSeeDashboard = isAdmin || isPrincipal;

    clearStatusMessages();
    document.body.classList.toggle('logged-out', loggedOut);
    if (userArea) userArea.hidden = loggedOut;
    if (userChip && currentUser) userChip.textContent = currentUser.displayName + ' · ' + currentUser.label;

    // Login gating (C2) + Tasleem's rule: each section shows only its own
    // relevant content. Logged out, the page is a public landing page —
    // hero, programmes, About, Contact and the login card only. No data
    // section (dashboard, students, attendance, fees, results, My Record)
    // is visible until login.
    var dashSec = document.getElementById('dashboard');
    if (dashSec) dashSec.hidden = !canSeeDashboard;
    var dataSections = ['students', 'attendance', 'fees', 'results'];
    dataSections.forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) sec.hidden = loggedOut || isStudentParent;
    });
    if (myRecord) myRecord.hidden = !isStudentParent;
    // Public landing sections are always visible.
    ['home', 'classes', 'about', 'contact'].forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) sec.hidden = false;
    });

    if (navLinks) {
      var links = navLinks.querySelectorAll('a');
      links.forEach(function (a) {
        var target = (a.getAttribute('href') || '').replace('#', '');
        var li = a.parentElement;
        if (!li) return;
        if (loggedOut) li.hidden = ['dashboard', 'students', 'attendance', 'fees', 'results'].indexOf(target) !== -1;
        else if (target === 'dashboard') li.hidden = !canSeeDashboard;
        else if (isStudentParent) li.hidden = dataSections.indexOf(target) !== -1;
        else li.hidden = false;
      });
    }

    // Hero buttons: "Student Records" / "Result Report" open data sections,
    // so they are hidden for student/parent (who get My Record instead).
    // Logged out they stay visible but scroll to the login card (see the
    // click handler below) instead of being dead links.
    var heroStudentsBtn = document.getElementById('heroStudentsBtn');
    var heroResultsBtn = document.getElementById('heroResultsBtn');
    if (heroStudentsBtn) heroStudentsBtn.hidden = isStudentParent;
    if (heroResultsBtn) heroResultsBtn.hidden = isStudentParent;

    // Students section: add form + reset are Admin only; Teacher/Principal
    // get a view-only note instead of silent no-ops.
    if (studentForm) studentForm.hidden = !isAdmin;
    if (resetBtn) resetBtn.hidden = !isAdmin;
    if (studentsViewNote) {
      studentsViewNote.hidden = isAdmin;
      studentsViewNote.textContent = isTeacher
        ? 'View only — Teacher account: students dekh sakte hain, add ya remove nahi kar sakte. Sirf Admin add ya remove kar sakta hai.'
        : 'View only — Principal account: students dekh sakte hain, add ya remove nahi kar sakte. Sirf Admin add ya remove kar sakta hai.';
    }
    // Fees section: reset is Admin only; Teacher/Principal get a note.
    var resetFeesBtn = document.getElementById('resetFees');
    if (resetFeesBtn) resetFeesBtn.hidden = !isAdmin;
    if (feesViewNote) {
      feesViewNote.hidden = isAdmin;
      feesViewNote.textContent = isTeacher
        ? 'View only — Teacher account: fees dekh sakte hain, Paid mark nahi kar sakte. Sirf Admin fees change kar sakta hai.'
        : 'View only — Principal account: fees dekh sakte hain, Paid mark nahi kar sakte. Sirf Admin fees change kar sakta hai.';
    }
    // Attendance edit buttons are Admin / Teacher only.
    ['markAllPresent', 'markAllAbsent', 'clearAttendance', 'saveAttendance'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.hidden = !canMark;
    });
    // Principal: attendance form is view-only — hide the load form, keep the
    // section visible so saved summaries can be read from the dashboard.
    if (attForm) attForm.hidden = isPrincipal;
    if (isPrincipal) {
      var dn = document.getElementById('dashboardNote');
      if (dn) dn.textContent = 'Principal dashboard — view only. Saare numbers neeche wale Fees, Students aur Results records se live bante hain. Fees Paid mark karna ya student add karna sirf Admin kar sakta hai.';
    }
    if (canSeeDashboard) renderDashboard();

    if (myRecordNote) {
      if (role === 'student') myRecordNote.textContent = 'View only — Student account: aap sirf apna record dekh sakti hain, kuch change nahi kar sakti.';
      else if (role === 'parent') myRecordNote.textContent = 'View only — Parent account: aap sirf apni beti ka record dekh sakte hain, kuch change nahi kar sakte.';
      else myRecordNote.textContent = '';
    }

    if (isStudentParent) renderMyRecord();
    renderStudents();
    renderFees();
    renderResults();
    if (canSeeDashboard) renderDashboard();
  }

  // Hero data buttons when logged out: go to the login card, never a dead link.
  ['heroStudentsBtn', 'heroResultsBtn'].forEach(function (id) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('click', function (event) {
      if (!currentUser) {
        event.preventDefault();
        var ls = document.getElementById('loginScreen');
        if (ls && ls.scrollIntoView) ls.scrollIntoView();
        var hint = document.getElementById('loginHint');
        if (hint) { hint.hidden = false; hint.textContent = 'Is section ko dekhne ke liye pehle demo login karein (admin / teacher / student / parent, password demo123).'; }
        if (loginUser) loginUser.focus();
      }
    });
  });

  function showLoginError(msg) {
    if (loginError) {
      loginError.textContent = msg;
      loginError.hidden = false;
    }
  }

  function doLogin(username, password) {
    var key = String(username || '').trim().toLowerCase();
    var user = DEMO_USERS[key];
    if (!user || password !== user.password) {
      showLoginError('Galat username ya password hai — demo account likhain: principal, admin, teacher, student ya parent, password demo123. Dobara try karein.');
      return false;
    }
    currentUser = { username: key, role: user.role, label: user.label, displayName: user.displayName };
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch (e) { /* session storage unavailable */ }
    if (loginError) loginError.hidden = true;
    if (loginForm) loginForm.reset();
    applyRole();
    return true;
  }

  function doLogout() {
    currentUser = null;
    try { window.sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    applyRole();
    if (loginUser) loginUser.value = '';
    if (loginPass) loginPass.value = '';
    // Back to the top of the login page (stale messages are cleared in applyRole).
    try { if (window.scrollTo) window.scrollTo(0, 0); } catch (e) { /* jsdom / no scroll */ }
    try { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (e) { /* ignore */ }
    if (loginUser) loginUser.focus();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      doLogin(loginUser.value, loginPass.value);
    });
  }
  document.querySelectorAll('.login-pick').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var u = btn.getAttribute('data-user');
      if (loginUser) loginUser.value = u;
      if (loginPass) loginPass.value = 'demo123';
      doLogin(u, 'demo123');
    });
  });
  if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

  // Restore the session after a refresh (sessionStorage, demo only).
  try {
    var savedSession = window.sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
      var parsedSession = JSON.parse(savedSession);
      if (parsedSession && DEMO_USERS[parsedSession.username] && DEMO_USERS[parsedSession.username].role === parsedSession.role) {
        currentUser = parsedSession;
      }
    }
  } catch (e) { /* ignore — start logged out */ }
  applyRole();

  // ---------- Firebase init: anonymous sign-in, seed if empty, live listeners ----------
  function firebaseInit() {
    if (!window.firebase || !window.firebase.database || !window.firebase.auth) return; // CDN blocked / offline — localStorage mode
    try {
      if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
      FB.db = window.firebase.database();
      FB.ready = true;
      // Attempt anonymous sign-in up front (C1); writes re-attempt it via ensureAuth.
      try {
        window.firebase.auth().signInAnonymously().then(function () { FB.authOk = true; FB.authAttempted = true; }).catch(function (e) { FB.lastError = e; FB.authAttempted = true; });
      } catch (e) { /* ignore */ }
      var rootRef = FB.db.ref(FB_ROOT);
      rootRef.once('value').then(function (snap) {
        var seed = buildSeedPayload();
        if (!snap.exists()) {
          try { rootRef.set(seed); } catch (e) { /* ignore */ }
          return;
        }
        // Per-child repair (m12): if any child node is missing, seed/repair
        // just that child instead of overwriting the whole shared root.
        var val = snap.val() || {};
        if (val.students == null) { try { rootRef.child('students').set(seed.students); } catch (e) { /* ignore */ } }
        if (val.fees == null) { try { rootRef.child('fees').set(seed.fees); } catch (e) { /* ignore */ } }
        if (val.results == null) { try { rootRef.child('results').set(seed.results); } catch (e) { /* ignore */ } }
        if (val.attendance == null) { try { rootRef.child('attendance').set({}); } catch (e) { /* ignore */ } }
      }).catch(function () { /* offline — the cache keeps the app working */ });
      FB.db.ref(FB_ROOT + '/students').on('value', function (snap) { try { syncStudentsFromFirebase(snap.val()); } catch (e) { /* ignore */ } });
      FB.db.ref(FB_ROOT + '/attendance').on('value', function (snap) { try { syncAttendanceFromFirebase(snap.val()); } catch (e) { /* ignore */ } });
      FB.db.ref(FB_ROOT + '/fees').on('value', function (snap) { try { syncFeesFromFirebase(snap.val()); } catch (e) { /* ignore */ } });
      FB.db.ref(FB_ROOT + '/results').on('value', function (snap) { try { syncResultsFromFirebase(snap.val()); } catch (e) { /* ignore */ } });
    } catch (e) {
      FB.ready = false;
    }
  }
  firebaseInit();

})();
