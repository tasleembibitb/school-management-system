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
  var FB = { ready: false, db: null };

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

  function fbSet(path, value) {
    if (!FB.ready) return;
    try { FB.db.ref(path).set(value); } catch (e) { /* offline — the local cache keeps the app working */ }
  }
  function fbUpdate(path, value) {
    if (!FB.ready) return;
    try { FB.db.ref(path).update(value); } catch (e) { /* ignore */ }
  }
  function fbRemove(path) {
    if (!FB.ready) return;
    try { FB.db.ref(path).remove(); } catch (e) { /* ignore */ }
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
      enrollmentDate: s.enrollmentDate || '2026-11-08'
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
    return 'GGDC-2026-' + ('00' + next).slice(-3);
  }

  if (studentsGrid) renderStudents();
  if (studentSearch) studentSearch.addEventListener('input', renderStudents);
  if (studentFilter) studentFilter.addEventListener('change', renderStudents);

  if (studentsGrid) {
    studentsGrid.addEventListener('click', function (event) {
      if (!currentUser || currentUser.role !== 'admin') return; // Admin only
      var btn = event.target && event.target.closest ? event.target.closest('[data-delete]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-delete');
      students = students.filter(function (s) { return s.id !== id; });
      saveStudents(students);
      fbRemove(FB_ROOT + '/students/' + id);
      renderStudents();
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
      var student = enrichStudent({ id: nextStudentId(), name: name, program: program, year: year });
      students.push(student);
      saveStudents(students);
      fbSet(FB_ROOT + '/students/' + student.id, student);
      renderStudents();
      if (studentNote) studentNote.textContent = 'Added ' + name + ' (' + program + ', ' + year + ') — ID ' + student.id + '. Synced to the mobile app too (Firebase, demo).';
      studentForm.reset();
    });
  }

  var resetBtn = document.getElementById('resetStudents');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!currentUser || currentUser.role !== 'admin') return; // Admin only
      students = SEED_STUDENTS.map(enrichStudent);
      saveStudents(students);
      fbSet(FB_ROOT + '/students', fbArrayToObject(students, function (s) { return s.id; }));
      renderStudents();
      if (studentNote) studentNote.textContent = 'Demo students reset to the original 9 sample students.';
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

  function updateSummary() {
    if (!attSummary || !attList) return;
    var rows = attList.querySelectorAll('.attendance-row');
    var total = rows.length;
    var present = 0;
    rows.forEach(function (row) {
      var checked = row.querySelector('input[type="radio"]:checked');
      if (checked && checked.value === 'present') present += 1;
    });
    var absent = total - present;
    var pct = total ? Math.round((present / total) * 100) : 0;
    attSummary.innerHTML =
      '<div class="summary-box"><strong>' + total + '</strong><span>Total students</span></div>' +
      '<div class="summary-box"><strong>' + present + '</strong><span>Present</span></div>' +
      '<div class="summary-box"><strong>' + absent + '</strong><span>Absent</span></div>' +
      '<div class="summary-box"><strong>' + pct + '%</strong><span>Present</span></div>';
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
      var status = saved[st.id] === false ? 'absent' : 'present';
      var row = document.createElement('div');
      row.className = 'attendance-row';
      row.innerHTML =
        '<div><div class="student-name"></div>' +
        '<div class="student-program"></div></div>' +
        '<div class="attendance-choices">' +
        '<label><input type="radio" name="att-' + i + '" value="present"> Present</label>' +
        '<label><input type="radio" name="att-' + i + '" value="absent"> Absent</label>' +
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
  }

  if (attForm) {
    attForm.addEventListener('submit', function (event) {
      event.preventDefault();
      currentProgram = attProgram.value;
      currentDate = attDate.value;
      if (!currentProgram || !currentDate) return;
      var exists = !!attRecord();
      if (attPanel) attPanel.hidden = false;
      renderAttendance();
      if (attSaved) attSaved.textContent = '';
      if (attNote) {
        attNote.textContent = exists
          ? 'Saved record found for ' + currentProgram + ' on ' + currentDate + ' — loaded below. Change any mark and save again to update it.'
          : 'Attendance list loaded for ' + currentProgram + ' on ' + currentDate + '. Everyone starts as Present — change any student to Absent, then save.';
      }
    });
  }

  var saveBtn = document.getElementById('saveAttendance');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) return; // Admin / Teacher only
      if (!currentProgram || !currentDate) return;
      var pid = PROGRAMME_IDS[currentProgram] || '';
      var record = {};
      attList.querySelectorAll('.attendance-row').forEach(function (row) {
        var checked = row.querySelector('input[type="radio"]:checked');
        record[row.dataset.student] = !checked || checked.value === 'present';
      });
      if (!attendanceData[pid]) attendanceData[pid] = {};
      attendanceData[pid][currentDate] = record;
      saveAttendance(attendanceData);
      fbSet(FB_ROOT + '/attendance/' + pid + '/' + currentDate, record);
      updateSummary();
      if (attSaved) attSaved.textContent = 'Attendance saved for ' + currentProgram + ' on ' + currentDate + '. Demo only — synced to the mobile app too (Firebase).';
    });
  }

  var markPresentBtn = document.getElementById('markAllPresent');
  if (markPresentBtn) {
    markPresentBtn.addEventListener('click', function () {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) return; // Admin / Teacher only
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
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) return; // Admin / Teacher only
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
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) return; // Admin / Teacher only
      if (!currentProgram || !currentDate) return;
      var pid = PROGRAMME_IDS[currentProgram] || '';
      if (attendanceData[pid]) delete attendanceData[pid][currentDate];
      saveAttendance(attendanceData);
      fbRemove(FB_ROOT + '/attendance/' + pid + '/' + currentDate);
      renderAttendance();
      if (attSaved) attSaved.textContent = 'Saved record cleared for ' + currentProgram + ' on ' + currentDate + '.';
    });
  }

// ---- Phase 4: Fees record (demo only, localStorage) ----
  var FEES_KEY = 'ggdc-fees-v1';
  var SEED_FEES = [
    { id: 1, name: 'Amina', studentId: 'GGDC-2026-001', program: 'FSc Pre-Medical', year: 'XI', amount: 4000, status: 'Paid', receiptId: 'RCP-001', updatedAt: '2026-11-08' },
    { id: 2, name: 'Fatima', studentId: 'GGDC-2026-002', program: 'FSc Pre-Medical', year: 'XII', amount: 4000, status: 'Pending', updatedAt: '2026-11-08' },
    { id: 3, name: 'Sana', studentId: 'GGDC-2026-005', program: 'FSc Pre-Engineering', year: 'XI', amount: 4000, status: 'Pending', updatedAt: '2026-11-08' },
    { id: 4, name: 'Hina', studentId: 'GGDC-2026-006', program: 'FSc Pre-Engineering', year: 'XII', amount: 4000, status: 'Paid', receiptId: 'RCP-002', updatedAt: '2026-11-08' },
    { id: 5, name: 'Maryam', studentId: 'GGDC-2026-004', program: 'FA Humanities', year: 'XI', amount: 2500, status: 'Pending', updatedAt: '2026-11-08' },
    { id: 6, name: 'Zainab', studentId: 'GGDC-2026-003', program: 'FA Humanities', year: 'XII', amount: 2500, status: 'Paid', receiptId: 'RCP-003', updatedAt: '2026-11-08' },
    { id: 7, name: 'Iqra', studentId: null, program: 'ADS Science', year: 'Part I', amount: 3500, status: 'Paid', receiptId: 'RCP-004', updatedAt: '2026-11-08' },
    { id: 8, name: 'Noor', studentId: 'GGDC-2026-007', program: 'ADS Science', year: 'Part II', amount: 3500, status: 'Pending', updatedAt: '2026-11-08' },
    { id: 9, name: 'Ayesha', studentId: null, program: 'BS Computer Science', year: 'Year 2', amount: 5000, status: 'Pending', updatedAt: '2026-11-08' },
    { id: 10, name: 'Rabia', studentId: null, program: 'BS Computer Science', year: 'Year 1', amount: 5000, status: 'Paid', receiptId: 'RCP-005', updatedAt: '2026-11-08' },
    { id: 11, name: 'Sara', studentId: 'GGDC-2026-008', program: 'BSc Science', year: 'Year 1', amount: 3000, status: 'Pending', updatedAt: '2026-11-08' },
    { id: 12, name: 'Mahnoor', studentId: 'GGDC-2026-009', program: 'BSc Science', year: 'Year 2', amount: 3000, status: 'Paid', receiptId: 'RCP-006', updatedAt: '2026-11-08' },
    { id: 13, name: 'Kiran', studentId: null, program: 'B.Com Commerce', year: 'Year 1', amount: 2000, status: 'Pending', updatedAt: '2026-11-08' },
    { id: 14, name: 'Saba', studentId: null, program: 'B.Com Commerce', year: 'Year 2', amount: 2000, status: 'Paid', receiptId: 'RCP-007', updatedAt: '2026-11-08' }
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
      receiptId: f.receiptId || null, updatedAt: f.updatedAt || '2026-11-08'
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
    var collected = 0, pending = 0, paidCount = 0, pendingCount = 0;
    fees.forEach(function (f) {
      if (f.status === 'Paid') { collected += f.amount; paidCount += 1; }
      else { pending += f.amount; pendingCount += 1; }
    });
    var collectedEl = document.getElementById('feesCollected');
    var pendingEl = document.getElementById('feesPending');
    var paidCountEl = document.getElementById('feesPaidCount');
    var pendingCountEl = document.getElementById('feesPendingCount');
    var totalEl = document.getElementById('feesTotal');
    if (collectedEl) collectedEl.textContent = formatPKR(collected);
    if (pendingEl) pendingEl.textContent = formatPKR(pending);
    if (paidCountEl) paidCountEl.textContent = paidCount + (paidCount === 1 ? ' paid' : ' paid');
    if (pendingCountEl) pendingCountEl.textContent = pendingCount + (pendingCount === 1 ? ' pending' : ' pending');
    if (totalEl) totalEl.textContent = fees.length;

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
      demoEl.textContent = 'Demo data';
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
          f.receiptId = f.receiptId || ('RCP-' + String(f.id).padStart(3, '0'));
          f.updatedAt = todayString();
          saveFees(fees);
          fbUpdate(FB_ROOT + '/fees/' + f.id, { status: 'Paid', receiptId: f.receiptId, updatedAt: f.updatedAt });
          renderFees();
        });
        actions.appendChild(btn);
      }
      card.appendChild(info);
      card.appendChild(actions);
      feesList.appendChild(card);
    });
    if (feeCount) feeCount.textContent = 'Showing ' + shown + (shown === 1 ? ' fee record' : ' fee records');
    if (feeNoResults) feeNoResults.hidden = shown !== 0;
  }

  if (feesList) {
    renderFees();
    if (feeProgram) feeProgram.addEventListener('change', renderFees);
    if (feeStatus) feeStatus.addEventListener('change', renderFees);
    var resetFees = document.getElementById('resetFees');
    if (resetFees) {
      resetFees.addEventListener('click', function () {
        if (!currentUser || currentUser.role !== 'admin') return; // Admin only
        fees = SEED_FEES.map(enrichFee);
        saveFees(fees);
        fbSet(FB_ROOT + '/fees', fbArrayToObject(fees, function (f) { return f.id; }));
        if (feeProgram) feeProgram.value = '';
        if (feeStatus) feeStatus.value = '';
        renderFees();
      });
    }
  }

// ---- Phase 5: Result report ----
  // Marks are out of 100 per subject (4 subjects per program, total out of 400).
  // All marks are SAMPLE DEMO DATA. ADS subjects are the real ADS subjects
  // (English, Bio-Chemistry, Zoology, Botany) but the marks are invented samples.
  var RESULTS_SEED = {
    'FSc Pre-Medical': {
      subjects: ['Biology', 'Chemistry', 'Physics', 'English'],
      students: [
        { name: 'Fatima', year: 'XII', marks: [88, 84, 79, 90] },
        { name: 'Ayesha', year: 'XI', marks: [72, 68, 75, 70] },
        { name: 'Hira', year: 'XII', marks: [55, 61, 58, 64] },
        { name: 'Mahnoor', year: 'XI', marks: [38, 42, 35, 40] }
      ]
    },
    'FSc Pre-Engineering': {
      subjects: ['Mathematics', 'Chemistry', 'Physics', 'English'],
      students: [
        { name: 'Zainab', year: 'XII', marks: [91, 86, 88, 82] },
        { name: 'Saba', year: 'XI', marks: [76, 70, 72, 78] },
        { name: 'Rabia', year: 'XII', marks: [64, 59, 66, 61] },
        { name: 'Khadija', year: 'XI', marks: [48, 52, 45, 50] }
      ]
    },
    'FA Humanities': {
      subjects: ['Civics', 'Economics', 'Education', 'English'],
      students: [
        { name: 'Noor', year: 'XII', marks: [82, 79, 85, 88] },
        { name: 'Iqra', year: 'XI', marks: [68, 71, 65, 72] },
        { name: 'Saba', year: 'XII', marks: [58, 54, 60, 57] }
      ]
    },
    'ADS Science': {
      subjects: ['English', 'Bio-Chemistry', 'Zoology', 'Botany'],
      students: [
        { name: 'Amina', year: 'Part II', marks: [78, 82, 74, 80] },
        { name: 'Maryam', year: 'Part I', marks: [85, 88, 81, 86] },
        { name: 'Hira', year: 'Part II', marks: [62, 58, 65, 60] },
        { name: 'Zara', year: 'Part I', marks: [44, 47, 41, 46] }
      ]
    },
    'BS Computer Science': {
      subjects: ['Programming', 'Data Structures', 'Databases', 'Web Development'],
      students: [
        { name: 'Fatima', year: 'Year 2', marks: [90, 87, 84, 92] },
        { name: 'Zainab', year: 'Year 1', marks: [73, 77, 70, 75] },
        { name: 'Iqra', year: 'Year 3', marks: [60, 63, 58, 66] }
      ]
    },
    'BSc Science': {
      subjects: ['Botany', 'Zoology', 'Chemistry', 'English'],
      students: [
        { name: 'Sana', year: 'Year 2', marks: [80, 76, 82, 78] },
        { name: 'Hina', year: 'Year 1', marks: [66, 62, 69, 64] },
        { name: 'Mahnoor', year: 'Year 2', marks: [42, 39, 45, 41] }
      ]
    },
    'B.Com Commerce': {
      subjects: ['Accounting', 'Business Maths', 'Economics', 'English'],
      students: [
        { name: 'Noor', year: 'Year 1', marks: [84, 81, 78, 86] },
        { name: 'Ayesha', year: 'Year 2', marks: [70, 67, 72, 69] },
        { name: 'Rabia', year: 'Year 1', marks: [52, 48, 55, 50] }
      ]
    }
  };

  function totalMarks(marks) {
    var t = 0;
    for (var i = 0; i < marks.length; i++) t += marks[i];
    return t;
  }
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
        return { name: r.studentName || '', year: r.yearPart || r.year || '', marks: marks };
      });
      list = list.filter(function (s) { return s.marks.every(function (m) { return m !== null; }); });
      if (list.length) next[display] = { subjects: subjects, students: list };
    });
    if (Object.keys(next).length) {
      RESULTS = next;
      renderResults();
      if (currentUser && (currentUser.role === 'student' || currentUser.role === 'parent')) renderMyRecord();
    }
  }

  // Build the one-time seed payload for /ggdc-sms/ from the local seeds.
  // Student IDs match by (name, programme); other result rows get a
  // deterministic GGDC-2026-1xx ID, in table order.
  function buildSeedPayload() {
    var studentsObj = fbArrayToObject(SEED_STUDENTS.map(enrichStudent), function (s) { return s.id; });
    var feesObj = fbArrayToObject(SEED_FEES.map(enrichFee), function (f) { return f.id; });
    var resultsObj = {};
    var synth = 100;
    Object.keys(RESULTS_SEED).forEach(function (program) {
      var pid = PROGRAMME_IDS[program];
      var data = RESULTS_SEED[program];
      var recs = {};
      data.students.forEach(function (s) {
        var match = null;
        SEED_STUDENTS.forEach(function (st) { if (st.name === s.name && st.program === program) match = st; });
        var sid = match ? match.id : 'GGDC-2026-' + (++synth);
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

    // Table body + summary
    resultBody.innerHTML = '';
    var sumPct = 0;
    var passCount = 0;
    var top = null;
    data.students.forEach(function (s) {
      var total = totalMarks(s.marks);
      var pct = pctOf(total, max);
      var grade = gradeFor(pct);
      sumPct += pct;
      if (isPass(pct)) passCount += 1;
      if (!top || pct > top.pct) top = { name: s.name, pct: pct };
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      nameCell.textContent = s.name;
      row.appendChild(nameCell);
      var yearCell = document.createElement('td');
      yearCell.textContent = s.year;
      row.appendChild(yearCell);
      s.marks.forEach(function (m) {
        var cell = document.createElement('td');
        cell.textContent = m;
        row.appendChild(cell);
      });
      var totalCell = document.createElement('td');
      totalCell.textContent = total + ' / ' + max;
      row.appendChild(totalCell);
      var pctCell = document.createElement('td');
      pctCell.textContent = pct.toFixed(1) + '%';
      row.appendChild(pctCell);
      var gradeCell = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'grade grade-' + grade.toLowerCase();
      badge.textContent = grade;
      gradeCell.appendChild(badge);
      row.appendChild(gradeCell);
      resultBody.appendChild(row);
    });

    var n = data.students.length;
    var avg = n ? sumPct / n : 0;
    if (resultCount) resultCount.textContent = 'Showing ' + n + (n === 1 ? ' student' : ' students') + ' — ' + program;
    if (resultSummary) {
      resultSummary.innerHTML = '';
      var items = [
        { label: 'Class average', value: avg.toFixed(1) + '%' },
        { label: 'Top student', value: top ? top.name + ' (' + top.pct.toFixed(1) + '%)' : '—' },
        { label: 'Pass', value: passCount + ' of ' + n + ' (' + (n ? Math.round(passCount / n * 100) : 0) + '%)' }
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

// ---- Login — 4 demo roles (no real accounts, no backend) ----
  // Demo accounts are shown on the login page so anyone can try them.
  // The username decides the role; the password is the same for all four.
  var SESSION_KEY = 'ggdc-sms-session-v1';
  var DEMO_USERS = {
    admin:   { password: 'demo123', role: 'admin',   label: 'Admin',   displayName: 'Admin (Principal)' },
    teacher: { password: 'demo123', role: 'teacher', label: 'Teacher', displayName: 'Teacher' },
    student: { password: 'demo123', role: 'student', label: 'Student', displayName: 'Maryam (Student)' },
    parent:  { password: 'demo123', role: 'parent',  label: 'Parent',  displayName: 'Parent of Maryam' }
  };
  // Demo student for the Student / Parent "My Record" view. Program and
  // result come from the Phase 5 RESULTS table (ADS Science, Maryam 85.0%
  // Grade A); the fee record comes from the Phase 4 fee records.
  var MY_STUDENT_ID = 'GGDC-2026-004';
  var MY_STUDENT_NAME = 'Maryam';
  var MY_STUDENT_PROGRAM = 'ADS Science';

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
    var ads = RESULTS[MY_STUDENT_PROGRAM];
    var maryam = null;
    if (ads) {
      ads.students.forEach(function (s) { if (s.name === MY_STUDENT_NAME) maryam = s; });
    }
    var fee = null;
    fees.forEach(function (f) { if (f.name === MY_STUDENT_NAME) fee = f; });

    // Attendance: count Maryam's saved marks across ADS Science records.
    var att = loadAttendance();
    var myPid = PROGRAMME_IDS[MY_STUDENT_PROGRAM] || '';
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
      '<p><strong>Name:</strong> ' + escapeHtml(MY_STUDENT_NAME) + '</p>' +
      '<p><strong>Student ID:</strong> ' + escapeHtml(MY_STUDENT_ID) + '</p>' +
      '<p><strong>Program:</strong> ' + escapeHtml(MY_STUDENT_PROGRAM) + ' — Part I</p>' +
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

    html += '<article class="my-record-card"><h3>Result — ADS Science</h3>';
    if (maryam && ads) {
      var max = ads.subjects.length * 100;
      var total = totalMarks(maryam.marks);
      var pct = pctOf(total, max);
      var grade = gradeFor(pct);
      var sumPct = 0, passCount = 0;
      ads.students.forEach(function (s) {
        var p = pctOf(totalMarks(s.marks), max);
        sumPct += p;
        if (isPass(p)) passCount += 1;
      });
      var avg = ads.students.length ? sumPct / ads.students.length : 0;
      html += '<p><strong>Total:</strong> ' + total + ' / ' + max + ' — <strong>' + pct.toFixed(1) +
        '%</strong> — Grade <strong>' + grade + '</strong></p>';
      html += '<div class="table-wrap"><table class="result-table"><thead><tr>';
      ads.subjects.forEach(function (sub) { html += '<th>' + escapeHtml(sub) + '</th>'; });
      html += '</tr></thead><tbody><tr>';
      maryam.marks.forEach(function (m) { html += '<td>' + m + '</td>'; });
      html += '</tr></tbody></table></div>';
      html += '<p class="muted">Class average ' + avg.toFixed(1) + '%, ' + passCount + ' of ' +
        ads.students.length + ' passed — demo data.</p>';
    } else {
      html += '<p>No result found (demo).</p>';
    }
    html += '</article></div>';
    myRecordBody.innerHTML = html;
  }

  function applyRole() {
    var role = currentUser ? currentUser.role : null;
    var isAdmin = role === 'admin';
    var isTeacher = role === 'teacher';
    var isStudentParent = role === 'student' || role === 'parent';
    var canMark = isAdmin || isTeacher;

    document.body.classList.toggle('logged-out', !currentUser);
    if (userArea) userArea.hidden = !currentUser;
    if (userChip && currentUser) userChip.textContent = currentUser.displayName + ' · ' + currentUser.label;

    // Student / Parent see only My Record — the data sections are hidden.
    var dataSections = ['students', 'attendance', 'fees', 'results'];
    dataSections.forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) sec.hidden = isStudentParent;
    });
    if (myRecord) myRecord.hidden = !isStudentParent;

    if (navLinks) {
      var links = navLinks.querySelectorAll('a');
      links.forEach(function (a) {
        var target = (a.getAttribute('href') || '').replace('#', '');
        var li = a.parentElement;
        if (li) li.hidden = isStudentParent && dataSections.indexOf(target) !== -1;
      });
    }

    // Students section: add form + reset are Admin only; Teacher gets a note.
    if (studentForm) studentForm.hidden = !isAdmin;
    if (resetBtn) resetBtn.hidden = !isAdmin;
    if (studentsViewNote) studentsViewNote.hidden = !isTeacher;
    // Fees section: reset is Admin only; Teacher gets a note.
    var resetFeesBtn = document.getElementById('resetFees');
    if (resetFeesBtn) resetFeesBtn.hidden = !isAdmin;
    if (feesViewNote) feesViewNote.hidden = !isTeacher;
    // Attendance edit buttons are Admin / Teacher only.
    ['markAllPresent', 'markAllAbsent', 'clearAttendance', 'saveAttendance'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.hidden = !canMark;
    });

    if (myRecordNote) {
      if (role === 'student') myRecordNote.textContent = 'View only — Student account: aap sirf apna record dekh sakti hain, kuch change nahi kar sakti.';
      else if (role === 'parent') myRecordNote.textContent = 'View only — Parent account: aap sirf apni beti ka record dekh sakte hain, kuch change nahi kar sakte.';
      else myRecordNote.textContent = '';
    }

    if (isStudentParent) renderMyRecord();
    renderStudents();
    renderFees();
    renderResults();
  }

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
      showLoginError('Galat username ya password hai — demo account likhain: admin, teacher, student ya parent, password demo123. Dobara try karein.');
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
      try { window.firebase.auth().signInAnonymously().catch(function () { /* writes still work in test mode */ }); } catch (e) { /* ignore */ }
      var rootRef = FB.db.ref(FB_ROOT);
      rootRef.once('value').then(function (snap) {
        if (!snap.exists()) {
          try { rootRef.set(buildSeedPayload()); } catch (e) { /* ignore */ }
        }
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
