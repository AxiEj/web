// ============================================================
// DATA — 在这里修改分类名称和对应图片
// ============================================================
const CATEGORIES = [
  { label: 'jojo7',    src: 'images/01.png' },
  { label: '老七老八',  src: 'images/02.png' },
  { label: '几何炸弹王', src: 'images/03.png' },
];

// ============================================================
// RENDER
// ============================================================
const bg = document.getElementById('full');
const nav = document.getElementById('nav');

function activate(index) {
  bg.style.backgroundImage = `url('${CATEGORIES[index].src}')`;
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
