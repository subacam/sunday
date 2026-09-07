// Claude Design 프로젝트 "Cat Paw Icon"(a131953b-7ff7-467c-9049-3a5dc93643bc)의
// 1a "기본형 — 균형 잡힌 젤리" 좌표를 그대로 옮긴 것. 디자인 문서가 이 변형의
// SVG 소스를 "그대로 복사해서 쓰세요"로 넘겨줬고, PWA 아이콘 미리보기도 1a 기준이다.
// 발가락 4개는 안쪽 2개가 높고 바깥 2개가 낮은 아치, 발바닥은 위가 좁고 아래가 넓은
// 라운드 삼각형이다. 탭바·로딩 발자국·PWA 아이콘이 전부 이 한 컴포넌트를 공유한다.
export default function PawIcon({
  size = 24,
  color = "currentColor",
  style,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} style={style} aria-hidden="true">
      <ellipse cx="18" cy="42" rx="10" ry="12.5" transform="rotate(-22 18 42)" />
      <ellipse cx="38.5" cy="27" rx="10.5" ry="13" transform="rotate(-8 38.5 27)" />
      <ellipse cx="61.5" cy="27" rx="10.5" ry="13" transform="rotate(8 61.5 27)" />
      <ellipse cx="82" cy="42" rx="10" ry="12.5" transform="rotate(22 82 42)" />
      <path d="M50 46C62 46 78 60 82 72C85 82 76 89 66 88C58 87.2 42 87.2 34 88C24 89 15 82 18 72C22 60 38 46 50 46Z" />
    </svg>
  );
}
