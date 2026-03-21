/* ============================================================
   MAPLE Documentation — Interactive Components
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ----- 1. Sidebar Tree Toggle -----
  document.querySelectorAll('.sidebar-tree .tree-section, .sidebar-tree .tree-label').forEach(function (el) {
    el.addEventListener('click', function (e) {
      // Don't toggle when clicking a link inside tree-label
      if (e.target.tagName === 'A') return;
      var li = el.closest('li');
      if (li) li.classList.toggle('open');
    });
  });

  // ----- 2. Copy Code Button -----
  document.querySelectorAll('pre').forEach(function (pre) {
    // Skip if already wrapped
    if (pre.parentElement.classList.contains('code-wrapper')) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'Copy code');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';

    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.classList.add('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        }, 2000);
      });
    });

    wrapper.appendChild(btn);
  });

  // ----- 3. TOC Scroll Spy -----
  var tocLinks = document.querySelectorAll('.toc a');
  if (tocLinks.length > 0) {
    var headings = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href');
      if (id && id.startsWith('#')) {
        var heading = document.querySelector(id);
        if (heading) headings.push({ el: heading, link: link });
      }
    });

    function updateTocActive() {
      var scrollY = window.scrollY + 100;
      var current = null;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].el.offsetTop <= scrollY) {
          current = headings[i];
        }
      }
      tocLinks.forEach(function (l) { l.classList.remove('active'); });
      if (current) current.link.classList.add('active');
    }

    window.addEventListener('scroll', updateTocActive, { passive: true });
    updateTocActive();
  }

  // ----- 4. Mobile Hamburger Menu -----
  var mobileToggle = document.querySelector('.mobile-toggle');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.querySelector('.sidebar-overlay');
  var topNavUl = document.querySelector('.top-nav ul');

  if (mobileToggle) {
    mobileToggle.addEventListener('click', function () {
      // Toggle sidebar on doc pages
      if (sidebar) {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      }
      // Toggle nav menu on landing pages
      if (topNavUl) {
        topNavUl.classList.toggle('open');
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      if (sidebar) sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // ----- 5. Auto-generate TOC -----
  var tocContainer = document.querySelector('.toc ul');
  if (tocContainer && tocContainer.children.length === 0) {
    var article = document.querySelector('article');
    if (article) {
      var tocHeadings = article.querySelectorAll('h2, h3');
      tocHeadings.forEach(function (h) {
        if (!h.id) {
          h.id = h.textContent.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        }
        var li = document.createElement('li');
        if (h.tagName === 'H3') li.className = 'toc-h3';
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        tocContainer.appendChild(li);
      });

      // Re-init scroll spy with new links
      tocLinks = document.querySelectorAll('.toc a');
      if (tocLinks.length > 0) {
        headings = [];
        tocLinks.forEach(function (link) {
          var id = link.getAttribute('href');
          if (id && id.startsWith('#')) {
            var heading = document.querySelector(id);
            if (heading) headings.push({ el: heading, link: link });
          }
        });
      }
    }
  }

  // ----- 6. Smooth Scroll for Anchor Links -----
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href && href.length > 1) {
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', href);
        }
      }
    });
  });

});
