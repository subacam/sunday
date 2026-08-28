(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 그룹별 스크롤 리빌 스태거
  const staggerGroups = ['.stat-grid', '.step-track', '.voice-grid'];
  staggerGroups.forEach((selector) => {
    const group = document.querySelector(selector);
    if (!group) return;
    const items = group.querySelectorAll(':scope > .reveal');
    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 90, 270)}ms`;
    });
  });

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  // 참여 폼 (데모: 실제 백엔드 없이 접수 확인 문구만 표시)
  const form = document.getElementById('joinForm');
  const hint = document.getElementById('joinHint');
  if (form && hint) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      if (!email) return;
      hint.textContent = `${email} 주소로 인증 메일을 보냈습니다. 받은 편지함을 확인해주세요.`;
      form.querySelector('input').value = '';
    });
  }
})();
