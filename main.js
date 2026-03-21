// ============================================================
// DATA
// ============================================================
const CATEGORIES = [
  { label: 'jojo7',    dir: 'images/jojo7/' },
  { label: '老七老八',  dir: 'images/laoqilaobi/' },
  { label: '几何炸弹王', dir: 'images/geometrydashbombing/' },
  { label: 'KON',      dir: 'images/kon/',      kuromi: true },
  { label: 'CLANNAD',  dir: 'images/clannad/',  kuromi: true },
  { label: '性情',      dir: 'images/loyalty/' },
  { label: '猫·2015',  dir: 'images/cat2015/',  kuromi: true },
];

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i;

// ============================================================
// IMAGE CACHE — 启动时预加载所有分类
// ============================================================
const imageCache = CATEGORIES.map(() => null);

async function fetchImages(dir) {
  try {
    const res = await fetch(dir);
    const html = await res.text();
    return [...html.matchAll(/href="([^"]+)"/g)]
      .map(m => m[1])
      .filter(n => IMAGE_EXTS.test(n))
      .map(n => dir + n);
  } catch {
    return [];
  }
}

// 预加载：后台静默加载所有分类，缓存命中后激活当前分类
(async () => {
  await Promise.all(CATEGORIES.map(async (cat, i) => {
    imageCache[i] = await fetchImages(cat.dir);
  }));
  // 预加载完成后刷新当前显示（若图片列表已变化）
  const imgs = imageCache[currentCat];
  if (imgs && imgs.length) showImage(imgs, 0);
})();

// ============================================================
// IMAGE VIEWER — pan & zoom
// ============================================================
const container = document.getElementById('full');
const img = document.createElement('img');
img.id = 'viewer-img';
container.appendChild(img);

let scale = 1, ox = 0, oy = 0;
let dragging = false, startX = 0, startY = 0, baseOx = 0, baseOy = 0;

function applyTransform() {
  img.style.transform = `translate(${ox}px,${oy}px) scale(${scale})`;
}

function resetTransform() {
  ox = 0; oy = 0;
  const fitW = container.clientWidth / img.naturalWidth;
  const fitH = container.clientHeight / img.naturalHeight;
  scale = (img.naturalWidth && img.naturalHeight) ? Math.min(fitW, fitH, 1) : 1;
  applyTransform();
}

container.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const cx = e.clientX - rect.left - rect.width / 2;
  const cy = e.clientY - rect.top - rect.height / 2;
  const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  ox = cx + (ox - cx) * delta;
  oy = cy + (oy - cy) * delta;
  scale = Math.min(Math.max(scale * delta, 0.2), 20);
  applyTransform();
}, { passive: false });

container.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  e.preventDefault();
  dragging = true;
  startX = e.clientX; startY = e.clientY;
  baseOx = ox; baseOy = oy;
  container.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  ox = baseOx + e.clientX - startX;
  oy = baseOy + e.clientY - startY;
  applyTransform();
});
function stopDrag() { dragging = false; container.style.cursor = 'grab'; }
window.addEventListener('mouseup', stopDrag);

// touch pinch & pan
let touches = {}, lastDist = null, lastMid = null, baseTouchOx, baseTouchOy;
const touchDist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
const touchMid  = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

container.addEventListener('touchstart', e => {
  e.preventDefault();
  [...e.changedTouches].forEach(t => { touches[t.identifier] = t; });
  const ids = Object.keys(touches);
  if (ids.length === 2) {
    const [a, b] = ids.map(id => touches[id]);
    lastDist = touchDist(a, b); lastMid = touchMid(a, b);
    baseTouchOx = ox; baseTouchOy = oy;
  } else if (ids.length === 1) {
    const t = touches[ids[0]];
    startX = t.clientX; startY = t.clientY;
    baseOx = ox; baseOy = oy; lastDist = null;
  }
}, { passive: false });

container.addEventListener('touchmove', e => {
  e.preventDefault();
  [...e.changedTouches].forEach(t => { touches[t.identifier] = t; });
  const ids = Object.keys(touches);
  if (ids.length === 2) {
    const [a, b] = ids.map(id => touches[id]);
    const dist = touchDist(a, b), mid = touchMid(a, b);
    const rect = container.getBoundingClientRect();
    const cx = mid.x - rect.left - rect.width / 2;
    const cy = mid.y - rect.top - rect.height / 2;
    if (lastDist) {
      const delta = dist / lastDist;
      ox = cx + (baseTouchOx - cx) * delta + (mid.x - lastMid.x);
      oy = cy + (baseTouchOy - cy) * delta + (mid.y - lastMid.y);
      scale = Math.min(Math.max(scale * delta, 0.2), 20);
      baseTouchOx = ox; baseTouchOy = oy;
    }
    lastDist = dist; lastMid = mid;
    baseTouchOx = ox; baseTouchOy = oy;
    applyTransform();
  } else if (ids.length === 1 && !lastDist) {
    const t = touches[ids[0]];
    ox = baseOx + t.clientX - startX;
    oy = baseOy + t.clientY - startY;
    applyTransform();
  }
}, { passive: false });

container.addEventListener('touchend', e => {
  [...e.changedTouches].forEach(t => { delete touches[t.identifier]; });
  lastDist = null;
  const ids = Object.keys(touches);
  if (ids.length === 1) {
    const t = touches[ids[0]];
    startX = t.clientX; startY = t.clientY;
    baseOx = ox; baseOy = oy;
  }
}, { passive: false });

container.addEventListener('dblclick', resetTransform);

// ============================================================
// NAV — gallery
// ============================================================
const nav      = document.getElementById('nav');
const arrPrev  = document.getElementById('arr-prev');
const arrNext  = document.getElementById('arr-next');
const counter  = document.getElementById('counter');
const fullEl   = document.getElementById('full');

let currentCat = 0;
let currentImg = 0;

function updateCounter(imgs) {
  if (imgs.length <= 1) {
    counter.textContent = '';
    counter.classList.remove('visible');
    arrPrev.classList.remove('visible');
    arrNext.classList.remove('visible');
  } else {
    counter.textContent = `${currentImg + 1} / ${imgs.length}`;
    counter.classList.add('visible');
    arrPrev.classList.add('visible');
    arrNext.classList.add('visible');
  }
}

function showImage(imgs, index) {
  currentImg = (index + imgs.length) % imgs.length;
  img.onload = resetTransform;
  img.src = imgs[currentImg];
  resetTransform();
  updateCounter(imgs);
}

function activate(index) {
  if (aboutPanel.classList.contains('open')) toggleAbout();
  if (mapleFrame.classList.contains('open')) toggleMaple();

  currentCat = index;
  currentImg = 0;
  navBtns.forEach((btn, i) => btn.classList.toggle('active', i === index));
  document.body.classList.toggle('kuromi-bg', !!CATEGORIES[index].kuromi);

  const imgs = imageCache[index];
  if (!imgs || imgs.length === 0) {
    img.src = '';
    updateCounter([]);
    return;
  }
  showImage(imgs, 0);
}

arrPrev.addEventListener('click', () => {
  const imgs = imageCache[currentCat];
  if (imgs && imgs.length > 1) showImage(imgs, currentImg - 1);
});
arrNext.addEventListener('click', () => {
  const imgs = imageCache[currentCat];
  if (imgs && imgs.length > 1) showImage(imgs, currentImg + 1);
});

window.addEventListener('keydown', e => {
  const imgs = imageCache[currentCat];
  if (e.key === 'ArrowLeft'  && imgs?.length > 1) showImage(imgs, currentImg - 1);
  if (e.key === 'ArrowRight' && imgs?.length > 1) showImage(imgs, currentImg + 1);
  if (e.key === 'Escape' && aboutPanel.classList.contains('open')) toggleAbout();
});

// Build nav buttons
const navBtns = CATEGORIES.map(({ label }, i) => {
  const btn = document.createElement('button');
  btn.className = 'nav-item';
  btn.textContent = label;
  btn.addEventListener('click', () => activate(i));
  nav.appendChild(btn);
  return btn;
});

// ============================================================
// NAV — MAPLE iframe
// ============================================================
const mapleFrame = document.getElementById('maple-frame');

const btnMaple = document.createElement('button');
btnMaple.className = 'nav-item';
btnMaple.textContent = 'MAPLE';
btnMaple.addEventListener('click', toggleMaple);
nav.appendChild(btnMaple);

function toggleMaple() {
  if (mapleFrame.classList.contains('open')) {
    mapleFrame.classList.remove('open');
    document.body.classList.remove('maple-open');
    fullEl.style.visibility = '';
    btnMaple.classList.remove('active');
    arrPrev.classList.remove('hidden');
    arrNext.classList.remove('hidden');
    counter.classList.remove('hidden');
  } else {
    if (aboutPanel.classList.contains('open')) toggleAbout();
    if (!mapleFrame.src.includes('maple/')) mapleFrame.src = 'maple/index.html';
    mapleFrame.classList.add('open');
    document.body.classList.add('maple-open');
    fullEl.style.visibility = 'hidden';
    btnMaple.classList.add('active');
    arrPrev.classList.add('hidden');
    arrNext.classList.add('hidden');
    counter.classList.add('hidden');
  }
}

mapleFrame.addEventListener('load', () => {
  try {
    mapleFrame.contentDocument.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
      e.preventDefault();
      mapleFrame.src = new URL(href, mapleFrame.contentWindow.location.href).href;
    });
  } catch(e) {}
});

// ============================================================
// NAV — about panel
// ============================================================
const aboutPanel = document.getElementById('about-panel');

const btnAbout = document.createElement('button');
btnAbout.className = 'nav-item nav-about';
btnAbout.textContent = '关于我';
btnAbout.addEventListener('click', toggleAbout);
nav.appendChild(btnAbout);

document.getElementById('about-close').addEventListener('click', toggleAbout);

function toggleAbout() {
  const isOpen = aboutPanel.classList.toggle('open');
  btnAbout.classList.toggle('active', isOpen);
  arrPrev.classList.toggle('hidden', isOpen);
  arrNext.classList.toggle('hidden', isOpen);
  counter.classList.toggle('hidden', isOpen);
}

// ============================================================
// INIT
// ============================================================
activate(0);

nav.style.opacity = '1';
setTimeout(() => { nav.style.opacity = ''; }, 2000);
