// Hero 视差效果
const heroImg = document.querySelector('.hero-img');
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  if (heroImg && scrolled < window.innerHeight) {
    heroImg.style.transform = `scale(1.03) translateY(${scrolled * 0.3}px)`;
  }
});

// 图片帧入场动画
const frames = document.querySelectorAll('.frame');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

frames.forEach(frame => {
  frame.style.opacity = '0';
  frame.style.transition = 'opacity 0.8s ease';
  observer.observe(frame);
});

document.addEventListener('DOMContentLoaded', () => {
  frames.forEach(frame => {
    frame.addEventListener('transitionend', () => {}, { once: true });
  });
});

// 添加 visible 类时显示
const style = document.createElement('style');
style.textContent = '.frame.visible { opacity: 1 !important; }';
document.head.appendChild(style);
