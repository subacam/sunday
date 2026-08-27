import { useRef, useState } from "react";
import { MOOD_BG, MOOD_COLOR } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

const SWIPE_MAX = 76;
// 이 거리(px)를 넘기 전엔 세로/가로 중 어느 쪽 제스처인지 판단을 보류한다 —
// 너무 작으면 손떨림에도 스와이프가 잘못 시작되고, 너무 크면 반응이 둔해 보인다.
const AXIS_LOCK_THRESHOLD = 8;
// 최대치를 넘어가도 뚝 막히지 않고 고무줄처럼 저항하며 조금 더 따라오게 하는 완충 거리.
const OVERDRAG_RANGE = 48;
// 손을 뗄 때의 위치가 아니라 "이 속도로 계속 움직였다면 도달했을 위치"로 스냅 대상을
// 고르기 위한 투사 시간 — 짧게 툭 튕겨도(플릭) 절반 이상 끌지 않아도 활짝 열리게 한다.
const FLICK_PROJECTION_MS = 120;
const SNAP_TRANSITION = "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)";

type Gesture = {
  id: number;
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  axis: "x" | "y" | null;
  current: number;
  lastX: number;
  lastT: number;
  velocity: number;
};

function applyResistance(raw: number) {
  if (raw > SWIPE_MAX) {
    const over = raw - SWIPE_MAX;
    return SWIPE_MAX + over / (1 + over / OVERDRAG_RANGE);
  }
  if (raw < -SWIPE_MAX) {
    const over = -raw - SWIPE_MAX;
    return -(SWIPE_MAX + over / (1 + over / OVERDRAG_RANGE));
  }
  return raw;
}

function nearestSnapTarget(projected: number) {
  const candidates = [-SWIPE_MAX, 0, SWIPE_MAX];
  return candidates.reduce((best, c) => (Math.abs(c - projected) < Math.abs(best - projected) ? c : best));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function FeedTab({
  records,
  imageUrls,
  onOpenDetail,
  onDeleteRecord,
  onShareRecord,
}: {
  records: WalkRecord[];
  imageUrls: Record<string, string>;
  onOpenDetail: (record: WalkRecord) => void;
  onDeleteRecord: (record: WalkRecord) => void;
  onShareRecord: (record: WalkRecord) => void;
}) {
  const [swipeOffsets, setSwipeOffsets] = useState<Record<number, number>>({});
  const [activeSwipeId, setActiveSwipeId] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const gestureRef = useRef<Gesture | null>(null);

  // 드래그 중엔 손가락 1px 움직일 때마다 setState로 리렌더하지 않고, DOM에
  // 직접 transform을 써서 프레임을 놓치지 않게 한다 — 최종 스냅 값만 커밋한다.
  function setCardTransform(id: number, x: number, withTransition: boolean) {
    const el = cardRefs.current.get(id);
    if (!el) return;
    el.style.transition = withTransition ? SNAP_TRANSITION : "none";
    el.style.transform = `translateX(${x}px)`;
  }

  function closeOtherCards(exceptId: number) {
    setSwipeOffsets((s) => {
      let changed = false;
      const next = { ...s };
      for (const key in next) {
        const id = Number(key);
        if (id !== exceptId && next[id]) {
          next[id] = 0;
          setCardTransform(id, 0, true);
          changed = true;
        }
      }
      return changed ? next : s;
    });
  }

  function handlePointerDown(rec: WalkRecord) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const startOffset = swipeOffsets[rec.id] || 0;
      gestureRef.current = {
        id: rec.id,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startOffset,
        axis: null,
        current: startOffset,
        lastX: e.clientX,
        lastT: performance.now(),
        velocity: 0,
      };
      setActiveSwipeId(rec.id);
      closeOtherCards(rec.id);
    };
  }
  function handlePointerMove(rec: WalkRecord) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      if (!g || g.id !== rec.id || e.pointerId !== g.pointerId) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;

      if (g.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          // 세로 방향이 더 크면 스크롤 의도로 보고 스와이프를 포기 — 목록 스크롤을 가로채지 않는다.
          gestureRef.current = null;
          setActiveSwipeId(null);
          return;
        }
        g.axis = "x";
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // 캡처 미지원 브라우저 — 없어도 대부분의 경우 정상 동작하므로 무시
        }
      }

      const now = performance.now();
      const dt = now - g.lastT;
      if (dt > 0) g.velocity = (e.clientX - g.lastX) / dt;
      g.lastX = e.clientX;
      g.lastT = now;

      g.current = applyResistance(g.startOffset + dx);
      setCardTransform(rec.id, g.current, false);
    };
  }
  function finishGesture(rec: WalkRecord) {
    const g = gestureRef.current;
    if (!g || g.id !== rec.id) return;
    gestureRef.current = null;
    setActiveSwipeId(null);
    if (g.axis !== "x") return;

    const projected = g.current + g.velocity * FLICK_PROJECTION_MS;
    const snapped = nearestSnapTarget(projected);
    setCardTransform(rec.id, snapped, true);
    setSwipeOffsets((s) => ({ ...s, [rec.id]: snapped }));
  }
  function handlePointerUp(rec: WalkRecord) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // 캡처하지 않은 상태(세로 스크롤로 판정됨 등)에서는 해제할 것이 없어 무시
      }
      finishGesture(rec);
    };
  }
  function handlePointerCancel(rec: WalkRecord) {
    return () => finishGesture(rec);
  }
  function handleCardClick(rec: WalkRecord) {
    const offset = swipeOffsets[rec.id] || 0;
    if (offset !== 0) {
      setSwipeOffsets((s) => ({ ...s, [rec.id]: 0 }));
      return;
    }
    onOpenDetail(rec);
  }
  function handleDeleteClick(rec: WalkRecord, e: React.MouseEvent) {
    e.stopPropagation();
    onDeleteRecord(rec);
  }
  function handleShareClick(rec: WalkRecord, e: React.MouseEvent) {
    e.stopPropagation();
    setSwipeOffsets((s) => ({ ...s, [rec.id]: 0 }));
    onShareRecord(rec);
  }

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 8,
          background:
            "radial-gradient(120% 100% at 10% 0%, #FDE7E0 0%, transparent 55%), radial-gradient(100% 90% at 100% 10%, #E7F2E4 0%, transparent 50%), #FAF6EC",
          padding: "2px 20px 12px",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 0" }}>피드</div>
        <div style={{ fontSize: 13, color: "#8B8578", fontWeight: 500, padding: "4px 0 0" }}>
          {records.length}개의 기록
        </div>
      </div>
      <div style={{ padding: "6px 20px 24px" }}>
      {records.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "40px 20px",
          }}
        >
          <svg width="130" height="130" viewBox="0 0 160 160">
            <circle cx="80" cy="82" r="70" fill="#F3EFE4" />
            <rect x="40" y="60" width="70" height="52" rx="14" fill="#fff" stroke="#2E2B24" strokeWidth="3" />
            <rect x="60" y="50" width="22" height="14" rx="5" fill="#fff" stroke="#2E2B24" strokeWidth="3" />
            <circle cx="75" cy="86" r="17" fill="#EAF2E6" stroke="#2E2B24" strokeWidth="3" />
            <circle cx="75" cy="86" r="7" fill="#9DBE9A" />
            <circle cx="118" cy="112" r="16" fill="#E8927C" />
            <line x1="118" y1="105" x2="118" y2="119" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <line x1="111" y1="112" x2="125" y2="112" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#2E2B24", textAlign: "center" }}>
            지금 첫 기록을 남겨주세요
          </div>
          <div style={{ fontSize: 13, color: "#8B8578", textAlign: "center" }}>
            아래 카메라 버튼을 눌러 산책을 기록해보세요
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {records.map((rec, i) => {
            const photoUrl = imageUrls[rec.image_url];
            const offset = swipeOffsets[rec.id] || 0;
            const swiping = activeSwipeId === rec.id;
            return (
              <div
                key={rec.id}
                className="wr-fade-up-item"
                style={{
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(46,43,36,0.07)",
                  animationDelay: `${Math.min(i * 60, 480)}ms`,
                }}
              >
                <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                  <div
                    onClick={(e) => handleDeleteClick(rec, e)}
                    style={{
                      width: 76,
                      height: "100%",
                      background: "linear-gradient(135deg,#F0A28C,#E37F6A)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7h12z"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>삭제</span>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div
                    onClick={(e) => handleShareClick(rec, e)}
                    style={{
                      width: 76,
                      height: "100%",
                      background: "linear-gradient(135deg,#B9D9AE,#8FAE8C)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="18" cy="5" r="3" stroke="#fff" strokeWidth="2" />
                      <circle cx="6" cy="12" r="3" stroke="#fff" strokeWidth="2" />
                      <circle cx="18" cy="19" r="3" stroke="#fff" strokeWidth="2" />
                      <path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4" stroke="#fff" strokeWidth="2" />
                    </svg>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>공유</span>
                  </div>
                </div>
                <div
                  ref={(el) => {
                    if (el) cardRefs.current.set(rec.id, el);
                    else cardRefs.current.delete(rec.id);
                  }}
                  onClick={() => handleCardClick(rec)}
                  onPointerDown={handlePointerDown(rec)}
                  onPointerMove={handlePointerMove(rec)}
                  onPointerUp={handlePointerUp(rec)}
                  onPointerCancel={handlePointerCancel(rec)}
                  onPointerLeave={handlePointerUp(rec)}
                  style={{
                    position: "relative",
                    background: "#fff",
                    touchAction: "pan-y",
                    cursor: swiping ? "grabbing" : "pointer",
                    userSelect: swiping ? "none" : undefined,
                    WebkitUserSelect: swiping ? "none" : undefined,
                    transform: `translateX(${offset}px)`,
                    transition: swiping ? "none" : SNAP_TRANSITION,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      height: 150,
                      background: photoUrl ? `${MOOD_BG[rec.ai_mood]} center/cover` : MOOD_BG[rec.ai_mood],
                    }}
                  >
                    {photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={rec.ai_caption}
                        loading="lazy"
                        decoding="async"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        padding: "5px 11px",
                        borderRadius: 20,
                        background: "rgba(255,255,255,0.88)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: MOOD_COLOR[rec.ai_mood],
                      }}
                    >
                      {rec.ai_mood}
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 14.5, color: "#2E2B24", fontWeight: 500, lineHeight: 1.5 }}>
                      {rec.ai_caption}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                      {rec.ai_tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 12,
                            color: "#6B6656",
                            background: "#F3F0E6",
                            padding: "4px 10px",
                            borderRadius: 14,
                            fontWeight: 500,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#B0AA98", fontWeight: 500, marginTop: 12, textAlign: "right" }}
                    >
                      {formatDate(rec.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
