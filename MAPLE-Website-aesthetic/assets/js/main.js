/* ============================================================
   MAPLE Documentation — Interactive Components
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ----- 1. Sidebar Tree Toggle -----
  document.querySelectorAll('.sidebar-tree .tree-section').forEach(function (el) {
    el.addEventListener('click', function () {
      var li = el.closest('li');
      if (li) li.classList.toggle('open');
    });
  });

  document.querySelectorAll('.sidebar-tree .tree-label').forEach(function (el) {
    el.addEventListener('click', function (e) {
      var li = el.closest('li');
      var link = el.querySelector('a');
      var clickedLink = e.target.closest('a');
      var clickedChevron = e.target.closest('.chevron');

      if (clickedLink) return;

      if (clickedChevron) {
        e.preventDefault();
        if (li) li.classList.toggle('open');
        return;
      }

      if (link && link.getAttribute('href')) {
        window.location.href = link.getAttribute('href');
        return;
      }

      if (li) li.classList.toggle('open');
    });
  });

  // ----- 2. MAPLE Input Syntax Highlighting -----
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isMapleInput(text) {
    return /(^|\n)\s*#(?:model|device|charge|mult|sp|opt|ts|scan|irc|freq|md|solvent|constraint|constraints)\b/i.test(text) ||
      /(^|\n)\s*(?:XYZ|PDB|MOL2)\s+\S+/i.test(text);
  }

  function highlightDirectiveTail(tail) {
    var directValue = tail.match(/^(\s*=\s*)("[^"]*"|'[^']*'|[^,\)\s]+)(.*)$/);
    if (directValue) {
      return escapeHtml(directValue[1]) +
        '<span class="value">' + escapeHtml(directValue[2]) + '</span>' +
        escapeHtml(directValue[3]);
    }

    var out = '';
    var last = 0;
    var paramRe = /([A-Za-z_][\w-]*)(\s*=\s*)("[^"]*"|'[^']*'|[^,\)\s]+)/g;
    var match;
    while ((match = paramRe.exec(tail)) !== null) {
      out += escapeHtml(tail.slice(last, match.index));
      out += '<span class="param">' + escapeHtml(match[1]) + '</span>';
      out += escapeHtml(match[2]);
      out += '<span class="value">' + escapeHtml(match[3]) + '</span>';
      last = match.index + match[0].length;
    }
    out += escapeHtml(tail.slice(last));
    return out;
  }

  function highlightCoordinateLine(line) {
    var match = line.match(/^(\s*)([A-Z][a-z]?)(\s+[-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?(?:\s+[-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?){2,})(.*)$/);
    if (!match) return null;
    return escapeHtml(match[1]) +
      '<span class="atom">' + escapeHtml(match[2]) + '</span>' +
      escapeHtml(match[3]).replace(/([-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?)/g, '<span class="number">$1</span>') +
      escapeHtml(match[4]);
  }

  function highlightMapleLine(line) {
    if (/^\s*$/.test(line)) return '';

    if (/^\s*#\s/.test(line)) {
      return '<span class="comment">' + escapeHtml(line) + '</span>';
    }

    var directive = line.match(/^(\s*)#([A-Za-z_][\w-]*)(.*)$/);
    if (directive) {
      return escapeHtml(directive[1]) +
        '<span class="hash">#</span><span class="directive">' + escapeHtml(directive[2]) + '</span>' +
        highlightDirectiveTail(directive[3]);
    }

    var fileRef = line.match(/^(\s*)(XYZ|PDB|MOL2)(\s+)(.*)$/i);
    if (fileRef) {
      return escapeHtml(fileRef[1]) +
        '<span class="directive">' + escapeHtml(fileRef[2]) + '</span>' +
        escapeHtml(fileRef[3]) +
        '<span class="filename">' + escapeHtml(fileRef[4]) + '</span>';
    }

    return highlightCoordinateLine(line) || escapeHtml(line);
  }

  document.querySelectorAll('pre code').forEach(function (code) {
    var text = code.textContent;
    if (!isMapleInput(text)) return;

    var pre = code.closest('pre');
    if (pre) pre.classList.add('maple-code');
    code.classList.add('maple-input-code');
    code.innerHTML = text.split('\n').map(highlightMapleLine).join('\n');
  });

  // ----- 3. Copy Code Button -----
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

  // ----- 4. TOC Scroll Spy -----
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

  // ----- 5. Mobile Hamburger Menu -----
  var mobileToggle = document.querySelector('.mobile-toggle');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.querySelector('.sidebar-overlay');
  var topNavUl = document.querySelector('.top-nav ul');
  var narrowNavQuery = window.matchMedia('(max-width: 52em)');
  var sidebarFab = null;

  function setTopNavOpen(open) {
    if (topNavUl) topNavUl.classList.toggle('open', open);
    if (mobileToggle) mobileToggle.setAttribute('aria-expanded', String(open));
  }

  function setSidebarOpen(open) {
    if (sidebar) sidebar.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('active', open);
    if (sidebarFab) {
      sidebarFab.classList.toggle('active', open);
      sidebarFab.setAttribute('aria-expanded', String(open));
    }
  }

  if (sidebar) {
    sidebarFab = document.createElement('button');
    sidebarFab.type = 'button';
    sidebarFab.className = 'sidebar-fab';
    sidebarFab.setAttribute('aria-label', 'Toggle documentation sidebar');
    sidebarFab.setAttribute('aria-expanded', 'false');
    sidebarFab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h14"/><path d="M4 12h10"/><path d="M4 18h14"/><path d="M20 8l-3 4 3 4"/></svg>';
    document.body.appendChild(sidebarFab);
    sidebarFab.addEventListener('click', function () {
      setTopNavOpen(false);
      setSidebarOpen(!sidebar.classList.contains('open'));
    });
  }

  if (mobileToggle) {
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.addEventListener('click', function () {
      if (narrowNavQuery.matches && topNavUl) {
        setSidebarOpen(false);
        setTopNavOpen(!topNavUl.classList.contains('open'));
        return;
      }

      if (sidebar) setSidebarOpen(!sidebar.classList.contains('open'));
    });
  }

  if (topNavUl) {
    topNavUl.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setTopNavOpen(false); });
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      setSidebarOpen(false);
    });
  }

  if (narrowNavQuery.addEventListener) {
    narrowNavQuery.addEventListener('change', function () {
      setTopNavOpen(false);
      setSidebarOpen(false);
    });
  }

  // ----- 6. Auto-generate TOC -----
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

  // ----- 7. Smooth Scroll for Anchor Links -----
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
