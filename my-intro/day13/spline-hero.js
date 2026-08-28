// 히어로 배경: Spline 3D 씬 ("Moon · Parallax")
// https://my.spline.design/moonparallax-eUNpt3bst1yas9Orld6oDi6z/
import { Application } from 'https://cdn.jsdelivr.net/npm/@splinetool/runtime@2.0.9/build/runtime.js';

const SCENE_URL = 'https://prod.spline.design/HAalR51tkB1nM8N6/scene.splinecode';

const canvas = document.getElementById('spline-canvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && !reduceMotion) {
  const app = new Application(canvas);

  // 템플릿과 동일한 형태의 spline API를 노출 (spline.ready / spline.updateObject)
  window.spline = {
    ready: app.load(SCENE_URL),
    updateObject(name, props = {}) {
      const obj = app.findObjectByName(name);
      if (!obj) return;
      if (props.position) Object.assign(obj.position, props.position);
      if (props.rotation) Object.assign(obj.rotation, props.rotation);
      if (props.scale) Object.assign(obj.scale, props.scale);
    },
  };

  window.spline.ready
    .then(() => canvas.classList.add('is-loaded'))
    .catch(() => {
      // 씬 로드 실패 시 캔버스를 감춰서 기존 다크 배경(별빛 레이어)이 그대로 보이게 둔다
      canvas.style.display = 'none';
    });
} else if (canvas) {
  // 모션 최소화 환경에서는 3D 씬 대신 정적 배경만 유지
  canvas.style.display = 'none';
}
