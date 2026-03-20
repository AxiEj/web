// ============================================================
// DATA — 只需填写分类名称和对应的图片文件夹路径
// ============================================================
const CATEGORIES = [
  { label: 'jojo7',    dir: 'images/jojo7/' },
  { label: '老七老八',  dir: 'images/laoqilaobi/' },
  { label: '几何炸弹王', dir: 'images/geometrydashbombing/' },
  { label: 'KON',      dir: 'images/kon/' },
  { label: 'CLANNAD',  dir: 'images/clannad/' },
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

// 每个分类缓存已加载的图片列表
const imageCache = new Array(CATEGORIES.length).fill(null);

async function activate(index) {
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  if (!imageCache[index]) {
    imageCache[index] = await fetchImages(CATEGORIES[index].dir);
  }

  const imgs = imageCache[index];
  if (imgs.length === 0) {
    img.src = '';
    return;
  }

  img.onload = resetTransform;
  img.src = imgs[0];
  resetTransform();
}

CATEGORIES.forEach(({ label }, i) => {
  const btn = document.createElement('button');
  btn.className = 'nav-item';
  btn.textContent = label;
  btn.addEventListener('click', () => activate(i));
  nav.appendChild(btn);
});

activate(0);

// 进入页面短暂显示导航栏后淡出
nav.style.opacity = '1';
setTimeout(() => { nav.style.opacity = ''; }, 2000);
