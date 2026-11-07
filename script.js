// School Management System — Phase 2
// Mobile menu, program search, student records (localStorage, demo only),
// demo enquiry form, footer year. No data is sent anywhere; everything runs in the browser.

(function () {
  'use strict';

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
    { id: 'GGDC-2026-004', name: 'Maryam', program: 'FA Humanities', year: 'XII' },
    { id: 'GGDC-2026-005', name: 'Sana', program: 'ADS Science', year: 'Part I' },
    { id: 'GGDC-2026-006', name: 'Hina', program: 'ADS Science', year: 'Part II' },
    { id: 'GGDC-2026-007', name: 'Noor', program: 'BS Computer Science', year: 'Year 1' },
    { id: 'GGDC-2026-008', name: 'Sara', program: 'BSc Science', year: 'Year 2' },
    { id: 'GGDC-2026-009', name: 'Mahnoor', program: 'B.Com Commerce', year: 'Year 1' }
  ];

  function loadStudents() {
    try {
      var raw = window.localStorage.getItem(STUDENT_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) { /* localStorage unavailable — use in-memory seed */ }
    return SEED_STUDENTS.slice();
  }

  function saveStudents(list) {
    try { window.localStorage.setItem(STUDENT_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
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
        '<button class="btn btn-outline btn-small" type="button" data-delete="' + escapeHtml(s.id) + '">Remove (demo)</button>' +
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
      var btn = event.target && event.target.closest ? event.target.closest('[data-delete]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-delete');
      students = students.filter(function (s) { return s.id !== id; });
      saveStudents(students);
      renderStudents();
    });
  }

  var studentForm = document.getElementById('studentForm');
  var studentNote = document.getElementById('studentNote');
  if (studentForm) {
    studentForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('studentName').value.trim();
      var program = document.getElementById('studentProgram').value;
      var year = document.getElementById('studentYear').value;
      if (!name || !program || !year) {
        if (studentNote) studentNote.textContent = 'Please fill in the name, program and year / part.';
        return;
      }
      var student = { id: nextStudentId(), name: name, program: program, year: year };
      students.push(student);
      saveStudents(students);
      renderStudents();
      if (studentNote) studentNote.textContent = 'Added ' + name + ' (' + program + ', ' + year + ') — ID ' + student.id + '. Saved in this browser only (demo).';
      studentForm.reset();
    });
  }

  var resetBtn = document.getElementById('resetStudents');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      students = SEED_STUDENTS.slice();
      saveStudents(students);
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
  // Sample demo rosters — generic names only, no real college students.
  var ROSTER = {
    'FSc Pre-Medical': ['Amina', 'Fatima', 'Sana', 'Hina', 'Maryam', 'Zainab'],
    'FSc Pre-Engineering': ['Ayesha', 'Iqra', 'Noor', 'Sana', 'Fatima', 'Maryam'],
    'FA Humanities': ['Hina', 'Zainab', 'Amina', 'Noor', 'Iqra', 'Fatima'],
    'ADS Science': ['Maryam', 'Zainab', 'Amina', 'Ayesha', 'Sana', 'Hina'],
    'BS Computer Science': ['Ayesha', 'Iqra', 'Noor', 'Amina', 'Fatima', 'Sana'],
    'BSc Science': ['Zainab', 'Maryam', 'Hina', 'Ayesha', 'Iqra', 'Noor'],
    'B.Com Commerce': ['Noor', 'Fatima', 'Amina', 'Zainab', 'Sana', 'Maryam']
  };
  var ATTENDANCE_KEY = 'ggdc-attendance-v1';

  function loadAttendance() {
    try {
      var raw = localStorage.getItem(ATTENDANCE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through */ }
    return {};
  }
  function saveAttendance(all) {
    try { localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(all)); } catch (e) { /* storage unavailable */ }
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

  function recordKey() { return currentProgram + '|' + currentDate; }

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
    var names = ROSTER[currentProgram] || [];
    var all = loadAttendance();
    var saved = all[recordKey()] || {};
    attList.innerHTML = '';
    names.forEach(function (name, i) {
      var status = saved[name] || 'present';
      var row = document.createElement('div');
      row.className = 'attendance-row';
      row.innerHTML =
        '<div><div class="student-name"></div>' +
        '<div class="student-program"></div></div>' +
        '<div class="attendance-choices">' +
        '<label><input type="radio" name="att-' + i + '" value="present"> Present</label>' +
        '<label><input type="radio" name="att-' + i + '" value="absent"> Absent</label>' +
        '</div>';
      row.querySelector('.student-name').textContent = name;
      row.querySelector('.student-program').textContent = currentProgram + ' · Demo data';
      row.dataset.student = name;
      var radios = row.querySelectorAll('input[type="radio"]');
      radios.forEach(function (r) {
        if (r.value === status) r.checked = true;
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
      var all = loadAttendance();
      var exists = !!all[recordKey()];
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
      if (!currentProgram || !currentDate) return;
      var all = loadAttendance();
      var record = {};
      attList.querySelectorAll('.attendance-row').forEach(function (row) {
        var checked = row.querySelector('input[type="radio"]:checked');
        record[row.dataset.student] = checked ? checked.value : 'present';
      });
      all[recordKey()] = record;
      saveAttendance(all);
      updateSummary();
      if (attSaved) attSaved.textContent = 'Attendance saved for ' + currentProgram + ' on ' + currentDate + '. Demo only — saved in this browser.';
    });
  }

  var markPresentBtn = document.getElementById('markAllPresent');
  if (markPresentBtn) {
    markPresentBtn.addEventListener('click', function () {
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
      if (!currentProgram || !currentDate) return;
      var all = loadAttendance();
      delete all[recordKey()];
      saveAttendance(all);
      renderAttendance();
      if (attSaved) attSaved.textContent = 'Saved record cleared for ' + currentProgram + ' on ' + currentDate + '.';
    });
  }

// ---- Phase 4: Fees record (demo only, localStorage) ----
  var FEES_KEY = 'ggdc-fees-v1';
  var SEED_FEES = [
    { id: 1, name: 'Amina', program: 'FSc Pre-Medical', year: 'XI', amount: 4000, status: 'Paid' },
    { id: 2, name: 'Fatima', program: 'FSc Pre-Medical', year: 'XII', amount: 4000, status: 'Pending' },
    { id: 3, name: 'Sana', program: 'FSc Pre-Engineering', year: 'XI', amount: 4000, status: 'Pending' },
    { id: 4, name: 'Hina', program: 'FSc Pre-Engineering', year: 'XII', amount: 4000, status: 'Paid' },
    { id: 5, name: 'Maryam', program: 'FA Humanities', year: 'XI', amount: 2500, status: 'Pending' },
    { id: 6, name: 'Zainab', program: 'FA Humanities', year: 'XII', amount: 2500, status: 'Paid' },
    { id: 7, name: 'Iqra', program: 'ADS Science', year: 'Part I', amount: 3500, status: 'Paid' },
    { id: 8, name: 'Noor', program: 'ADS Science', year: 'Part II', amount: 3500, status: 'Pending' },
    { id: 9, name: 'Ayesha', program: 'BS Computer Science', year: 'Year 2', amount: 5000, status: 'Pending' },
    { id: 10, name: 'Rabia', program: 'BS Computer Science', year: 'Year 1', amount: 5000, status: 'Paid' },
    { id: 11, name: 'Sara', program: 'BSc Science', year: 'Year 1', amount: 3000, status: 'Pending' },
    { id: 12, name: 'Mahnoor', program: 'BSc Science', year: 'Year 2', amount: 3000, status: 'Paid' },
    { id: 13, name: 'Kiran', program: 'B.Com Commerce', year: 'Year 1', amount: 2000, status: 'Pending' },
    { id: 14, name: 'Saba', program: 'B.Com Commerce', year: 'Year 2', amount: 2000, status: 'Paid' }
  ];

  function loadFees() {
    try {
      var raw = window.localStorage.getItem(FEES_KEY);
      if (!raw) return SEED_FEES.map(function (f) { return Object.assign({}, f); });
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return SEED_FEES.map(function (f) { return Object.assign({}, f); });
      return parsed;
    } catch (e) {
      return SEED_FEES.map(function (f) { return Object.assign({}, f); });
    }
  }
  function saveFees(fees) {
    try { window.localStorage.setItem(FEES_KEY, JSON.stringify(fees)); } catch (e) { /* storage unavailable — demo still works in memory */ }
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
      if (f.status === 'Pending') {
        var btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.type = 'button';
        btn.textContent = 'Mark as Paid';
        btn.addEventListener('click', function () {
          f.status = 'Paid';
          saveFees(fees);
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
        fees = SEED_FEES.map(function (f) { return Object.assign({}, f); });
        saveFees(fees);
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
  var RESULTS = {
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

})();
