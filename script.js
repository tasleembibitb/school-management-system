// School Management System — Phase 1
// Mobile menu, program search, demo enquiry form, footer year.
// No data is sent anywhere; everything runs in the browser.

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
})();
