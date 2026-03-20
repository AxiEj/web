// 导航栏滚动效果
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    nav.style.borderBottomColor = '#e5e5e5';
  } else {
    nav.style.borderBottomColor = 'transparent';
  }
});

// 导航平滑滚动 + 激活状态
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav ul a');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === `#${entry.target.id}` ? '#111' : '';
      });
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => observer.observe(s));

// 项目卡片入场动画
const cards = document.querySelectorAll('.project-card, .skill-item');
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

cards.forEach((card, i) => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(16px)';
  card.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`;
  cardObserver.observe(card);
});
