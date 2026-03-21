// ============================================================
// DATA — 只需填写分类名称和对应的图片文件夹路径
// ============================================================
const CATEGORIES = [
  { label: 'jojo7',    dir: 'images/jojo7/' },
  { label: '老七老八',  dir: 'images/laoqilaobi/' },
  { label: '几何炸弹王', dir: 'images/geometrydashbombing/' },
  { label: 'KON',      dir: 'images/kon/' },
  { label: 'CLANNAD',  dir: 'images/clannad/' },
  { label: '性情',  dir: 'images/loyalty/' },
  { label: '猫·2015', dir: 'images/cat2015/' },
];

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i;

// 通过 Nginx autoindex 的 HTML 响应解析出图片文件名
async function fetchImages(dir) {
  try {
    const res = await fetch(dir);
    const html = await res.text();
    const matches = [...html.matchAll(/href="([^"]+)"/g)]
      .map(m => m[1])
      .filter(name => IMAGE_EXTS.test(name));
    return matches.map(name => dir + name);
  } catch {
    return [];
  }
}

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
  img.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
}

function resetTransform() {
  ox = 0; oy = 0;
  const fitW = container.clientWidth / img.naturalWidth;
  const fitH = container.clientHeight / img.naturalHeight;
  scale = (img.naturalWidth && img.naturalHeight) ? Math.min(fitW, fitH, 1) : 1;
  applyTransform();
}

// wheel zoom — zoom toward cursor
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

// mouse drag
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
function stopDrag() {
  dragging = false;
  container.style.cursor = 'grab';
}
window.addEventListener('mouseup', stopDrag);

// touch pinch & pan
let touches = {};
let lastDist = null, lastMid = null, baseTouchOx, baseTouchOy;

function touchDist(a, b) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}
function touchMid(a, b) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

container.addEventListener('touchstart', e => {
  e.preventDefault();
  [...e.changedTouches].forEach(t => { touches[t.identifier] = t; });
  const ids = Object.keys(touches);
  if (ids.length === 2) {
    const [a, b] = ids.map(id => touches[id]);
    lastDist = touchDist(a, b);
    lastMid = touchMid(a, b);
    baseTouchOx = ox; baseTouchOy = oy;
  } else if (ids.length === 1) {
    const t = touches[ids[0]];
    startX = t.clientX; startY = t.clientY;
    baseOx = ox; baseOy = oy;
    lastDist = null;
  }
}, { passive: false });

container.addEventListener('touchmove', e => {
  e.preventDefault();
  [...e.changedTouches].forEach(t => { touches[t.identifier] = t; });
  const ids = Object.keys(touches);
  if (ids.length === 2) {
    const [a, b] = ids.map(id => touches[id]);
    const dist = touchDist(a, b);
    const mid = touchMid(a, b);
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
// NAV
// ============================================================
const nav = document.getElementById('nav');
const arrPrev = document.getElementById('arr-prev');
const arrNext = document.getElementById('arr-next');
const counter = document.getElementById('counter');
const mapleFrame = document.getElementById('maple-frame');

// 每个分类缓存已加载的图片列表
const imageCache = new Array(CATEGORIES.length).fill(null);
let currentCat = 0;
let currentImg = 0;

const isMobile = () => window.innerWidth <= 768;

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

async function activate(index) {
  const panel = document.getElementById('about-panel');
  if (panel.classList.contains('open')) toggleAbout();
  if (mapleFrame.classList.contains('open')) closeMaple();
  currentCat = index;
  currentImg = 0;
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  if (!imageCache[index]) {
    imageCache[index] = await fetchImages(CATEGORIES[index].dir);
  }

  const KUROMI_CATS = ['KON', 'CLANNAD', '猫·2015'];
  document.body.classList.toggle('kuromi-bg', KUROMI_CATS.includes(CATEGORIES[index].label));

  const imgs = imageCache[index];
  if (imgs.length === 0) {
    img.src = '';
    counter.textContent = '';
    counter.classList.remove('visible');
    arrPrev.classList.remove('visible');
    arrNext.classList.remove('visible');
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

// 键盘左右键切换，Escape 关闭关于面板
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') {
    const imgs = imageCache[currentCat];
    if (imgs && imgs.length > 1) showImage(imgs, currentImg - 1);
  } else if (e.key === 'ArrowRight') {
    const imgs = imageCache[currentCat];
    if (imgs && imgs.length > 1) showImage(imgs, currentImg + 1);
  } else if (e.key === 'Escape') {
    const panel = document.getElementById('about-panel');
    if (panel.classList.contains('open')) toggleAbout();
  }
});


function toggleAbout() {
  const panel = document.getElementById('about-panel');
  const isOpen = panel.classList.toggle('open');
  document.querySelector('.nav-about')?.classList.toggle('active', isOpen);
  arrPrev.classList.toggle('hidden', isOpen);
  arrNext.classList.toggle('hidden', isOpen);
  counter.classList.toggle('hidden', isOpen);
}
document.getElementById('about-close').addEventListener('click', toggleAbout);

CATEGORIES.forEach(({ label }, i) => {
  const btn = document.createElement('button');
  btn.className = 'nav-item';
  btn.textContent = label;
  btn.addEventListener('click', () => activate(i));
  nav.appendChild(btn);
});

function openMaple() {
  const panel = document.getElementById('about-panel');
  if (panel.classList.contains('open')) toggleAbout();
  if (mapleFrame.src !== location.origin + '/maple/index.html' &&
      !mapleFrame.src.endsWith('maple/index.html')) {
    mapleFrame.src = 'maple/index.html';
  }
  mapleFrame.classList.add('open');
  btnMaple.classList.add('active');
  arrPrev.classList.add('hidden');
  arrNext.classList.add('hidden');
  counter.classList.add('hidden');
}

function closeMaple() {
  mapleFrame.classList.remove('open');
  btnMaple.classList.remove('active');
  const imgs = imageCache[currentCat];
  if (imgs && imgs.length > 1) {
    arrPrev.classList.remove('hidden');
    arrNext.classList.remove('hidden');
    counter.classList.remove('hidden');
  }
}

const btnMaple = document.createElement('button');
btnMaple.className = 'nav-item nav-maple';
btnMaple.textContent = 'MAPLE';
btnMaple.addEventListener('click', () => {
  if (mapleFrame.classList.contains('open')) closeMaple();
  else openMaple();
});
nav.appendChild(btnMaple);

const btnAbout = document.createElement('button');
btnAbout.className = 'nav-item nav-about';
btnAbout.textContent = '关于我';
btnAbout.addEventListener('click', toggleAbout);
nav.appendChild(btnAbout);

activate(0);

// 进入页面短暂显示导航栏后淡出
nav.style.opacity = '1';
setTimeout(() => { nav.style.opacity = ''; }, 2000);
