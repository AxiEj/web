// ============================================================
// DATA — 只需编辑这里来增删改图片
// layout: "full" | "half" | "wide" | "portrait"
// ============================================================
const HERO = 'images/01.png';

const FRAMES = [
  { src: 'images/02.png', layout: 'full'     },
  { src: 'images/03.png', layout: 'half'     },
  { src: 'images/04.png', layout: 'half'     },
  { src: 'images/05.png', layout: 'wide'     },
  { src: 'images/06.png', layout: 'portrait' },
  { src: 'images/07.png', layout: 'full'     },
];

// ============================================================
// RENDER
// ============================================================
function renderHero() {
  document.getElementById('hero-img').style.backgroundImage = `url('${HERO}')`;
}

function renderGallery() {
  const frag = document.createDocumentFragment();
  FRAMES.forEach(({ src, layout }) => {
    const article = document.createElement('article');
    article.className = `frame frame-${layout}`;
    const div = document.createElement('div');
    div.className = 'frame-img';
    // 懒加载：图片进入视口才设置背景
    div.dataset.src = src;
    article.appendChild(div);
    frag.appendChild(article);
  });
  document.getElementById('gallery').appendChild(frag);
}

// ============================================================
// EFFECTS
// ============================================================
function bindParallax() {
  const heroImg = document.getElementById('hero-img');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight) {
          heroImg.style.transform = `scale(1.03) translateY(${y * 0.3}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

function bindLazyLoad() {
  // 图片进入视口时才加载（省内存）
  const imgObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const div = entry.target.querySelector('.frame-img');
      if (div?.dataset.src) {
        div.style.backgroundImage = `url('${div.dataset.src}')`;
        delete div.dataset.src;
      }
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '100px' });

  document.querySelectorAll('.frame').forEach(f => imgObserver.observe(f));
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderHero();
  renderGallery();
  bindParallax();
  bindLazyLoad();
});
