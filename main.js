// ============================================================
// DATA — 在这里修改分类名称和对应图片
// ============================================================
const CATEGORIES = [
  { label: 'jojo7',    src: 'images/01.jpg' },
  { label: '老七老八',  src: 'images/02.jpg' },
  { label: '几何炸弹王', src: 'images/03.jpg' },
];

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
  scale = 1; ox = 0; oy = 0;
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

// double-click / double-tap to reset
container.addEventListener('dblclick', resetTransform);

// ============================================================
// NAV
// ============================================================
const nav = document.getElementById('nav');

function activate(index) {
  img.src = CATEGORIES[index].src;
  resetTransform();
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
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
