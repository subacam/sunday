"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { GEMINI_VISION_FUNCTION_URL, WALK_PHOTOS_BUCKET, supabase } from "@/lib/supabase";
import { fileToBase64, getCurrentPosition, readExifPhotoMeta, resizeImage } from "@/lib/capture";
import { isMood, type Mood } from "@/lib/mood";
import { useWalkTracker } from "@/lib/useWalkTracker";
import { useTheme } from "@/lib/theme";
import type { PendingAnalysis, WalkRecord, WalkTrack } from "@/types/walk";

import Splash from "@/components/Splash";
import Onboarding from "@/components/Onboarding";
import AuthScreen from "@/components/AuthScreen";
import TabBar, { type TabKey } from "@/components/TabBar";
import FeedTab from "@/components/FeedTab";
import MapTab from "@/components/MapTab";
import DashboardTab from "@/components/DashboardTab";
import ProfileTab from "@/components/ProfileTab";
import PinSheet from "@/components/PinSheet";
import FeedDetailModal from "@/components/FeedDetailModal";
import CaptureSheet, { type CaptureStep, type PhotoSource } from "@/components/CaptureSheet";
import Toast from "@/components/Toast";

type Stage = "splash" | "onboarding" | "auth" | "app";

const ONBOARDING_KEY = "walk_onboarding_seen";

export default function Page() {
  const [stage, setStage] = useState<Stage>("splash");
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [records, setRecords] = useState<WalkRecord[]>([]);
  const [tracks, setTracks] = useState<WalkTrack[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [selectedPin, setSelectedPin] = useState<WalkRecord | null>(null);
  const [selectedFeedRecord, setSelectedFeedRecord] = useState<WalkRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ nickname: string | null; avatarPath: string | null; avatarUrl: string | null }>({
    nickname: null,
    avatarPath: null,
    avatarUrl: null,
  });

  const [captureStep, setCaptureStep] = useState<CaptureStep | null>(null);
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | undefined>(undefined);
  const [capturePending, setCapturePending] = useState<PendingAnalysis | undefined>(undefined);
  const [captureLatLng, setCaptureLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [captureTakenAt, setCaptureTakenAt] = useState<Date | null>(null);
  const [captureLocationSource, setCaptureLocationSource] = useState<"device" | "photo">("device");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const thumbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbOpacity, setThumbOpacity] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumbHeight(0);
      return;
    }
    const height = Math.max(32, (clientHeight / scrollHeight) * clientHeight);
    const maxTop = clientHeight - height;
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop || 0;
    setThumbTop(top);
    setThumbHeight(height);
  }, []);

  const handleScroll = useCallback(() => {
    updateThumb();
    setThumbOpacity(1);
    if (thumbTimer.current) clearTimeout(thumbTimer.current);
    thumbTimer.current = setTimeout(() => setThumbOpacity(0), 650);
    // 한 화면 넘게 내려갔을 때만 "맨 위로"를 띄운다 — 살짝 스크롤한 정도로 뜨면 거슬린다.
    setShowScrollTop((scrollRef.current?.scrollTop ?? 0) > 500);
  }, [updateThumb]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShowScrollTop(false);
  }, []);

  // 탭 전환/기록 로딩으로 스크롤 영역 높이가 바뀔 때마다 썸 크기를 다시 계산한다(깜빡임 없이 opacity는 그대로 둠).
  useEffect(() => {
    updateThumb();
  }, [activeTab, records, updateThumb]);

  const loadRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from("walk_records")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      showToast("기록을 불러오지 못했어요");
      return;
    }
    const list = (data || []) as WalkRecord[];
    setRecords(list);

    const paths = [...new Set(list.map((r) => r.image_url))];
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from(WALK_PHOTOS_BUCKET).createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      (signed || []).forEach((s) => {
        if (s.signedUrl && s.path) map[s.path] = s.signedUrl;
      });
      setImageUrls(map);
    }
  }, [showToast]);

  const loadTracks = useCallback(async () => {
    const { data, error } = await supabase
      .from("walk_tracks")
      .select("*")
      .order("started_at", { ascending: false });
    // 트랙은 사진 기록과 달리 없어도 앱이 정상 동작하므로, 실패해도 토스트로
    // 방해하지 않고 조용히 빈 목록을 유지한다.
    if (!error) setTracks((data || []) as WalkTrack[]);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("walk_profiles")
      .select("nickname, avatar_path")
      .eq("id", userId)
      .maybeSingle();
    const nickname = (data?.nickname as string | null) ?? null;
    const avatarPath = (data?.avatar_path as string | null) ?? null;
    let avatarUrl: string | null = null;
    if (avatarPath) {
      const { data: signed } = await supabase.storage.from(WALK_PHOTOS_BUCKET).createSignedUrl(avatarPath, 3600);
      avatarUrl = signed?.signedUrl ?? null;
    }
    setProfile({ nickname, avatarPath, avatarUrl });
  }, []);

  const handleUpdateNickname = useCallback(
    async (nickname: string) => {
      if (!session) return;
      const { error } = await supabase.from("walk_profiles").upsert({ id: session.user.id, nickname });
      if (error) {
        showToast("닉네임 저장에 실패했어요");
        return;
      }
      setProfile((prev) => ({ ...prev, nickname }));
      showToast("닉네임이 변경되었어요");
    },
    [session, showToast]
  );

  const handleUpdateAvatar = useCallback(
    async (file: File) => {
      if (!session) return;
      try {
        // 원본(수 MB일 수 있는 카메라/갤러리 사진)을 그대로 올리지 않는다 — 아바타는
        // 76px 원형 썸네일로만 쓰이므로 400px면 충분하고, 사진 기록(1600px)보다
        // 훨씬 작게 잡아 Storage 용량과 로딩 바이트를 더 아낀다.
        const resized = await resizeImage(file, 400, 0.85);
        const path = `${session.user.id}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from(WALK_PHOTOS_BUCKET).upload(path, resized);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("walk_profiles").upsert({ id: session.user.id, avatar_path: path });
        if (dbError) throw dbError;

        // 이전 아바타 파일은 곧바로 정리한다 — 실패해도(예: 처음 설정이라 이전 파일이
        // 없음) 새 아바타 반영 자체를 막을 이유는 아니라 결과를 기다리지 않는다.
        if (profile.avatarPath) {
          supabase.storage.from(WALK_PHOTOS_BUCKET).remove([profile.avatarPath]).then(() => {});
        }

        const { data: signed } = await supabase.storage.from(WALK_PHOTOS_BUCKET).createSignedUrl(path, 3600);
        setProfile({ nickname: profile.nickname, avatarPath: path, avatarUrl: signed?.signedUrl ?? null });
        showToast("프로필 사진이 변경되었어요");
      } catch {
        showToast("프로필 사진 변경에 실패했어요");
      }
    },
    [session, profile.avatarPath, profile.nickname, showToast]
  );

  const handleTrackSaved = useCallback(
    (track: WalkTrack) => {
      setTracks((prev) => [track, ...prev]);
      showToast("산책 경로가 저장되었어요");
    },
    [showToast]
  );

  const tracker = useWalkTracker(session?.user.id, handleTrackSaved);
  const { theme, toggleTheme } = useTheme();

  // 스플래시(최소 1500ms) + 세션/온보딩 여부 확인을 동시에 진행한 뒤 다음 화면 결정.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const minSplash = new Promise((r) => setTimeout(r, 1500));
      const sessionPromise = supabase.auth.getSession();
      const [, { data: sessionData }] = await Promise.all([minSplash, sessionPromise]);
      if (cancelled) return;

      const currentSession = sessionData.session;
      setSession(currentSession);

      let seenOnboarding = false;
      if (currentSession) {
        // 온보딩 조회와 겹쳐서 미리 시작 — 두 요청을 순차로 기다리지 않아 피드 체감 로딩이 줄어든다.
        loadRecords();
        loadTracks();
        loadProfile(currentSession.user.id);
        const { data: profileRow } = await supabase
          .from("walk_profiles")
          .select("onboarding_seen")
          .eq("id", currentSession.user.id)
          .maybeSingle();
        seenOnboarding = !!profileRow?.onboarding_seen;
      } else {
        seenOnboarding = typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_KEY) === "1";
      }

      if (cancelled) return;

      if (!seenOnboarding) {
        setStage("onboarding");
      } else if (!currentSession) {
        setStage("auth");
      } else {
        setStage("app");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // 구글 로그인은 리다이렉트로 돌아오기 때문에 AuthScreen의 onAuthed 콜백이
      // 실행될 기회가 없다 — 세션이 붙는 이 시점에 직접 앱 화면으로 넘긴다.
      // (이메일 로그인도 여기로 들어오지만 handleAuthed가 하는 일과 같아 문제없다.)
      if (event === "SIGNED_IN" && next) {
        window.localStorage.removeItem(ONBOARDING_KEY);
        setStage((prev) => (prev === "onboarding" ? prev : "app"));
        // supabase-js는 이 콜백 안에서 다른 supabase 호출을 곧바로 하면 내부 락이
        // 풀리지 않아 멈출 수 있다고 경고한다 — 한 틱 미뤄서 콜백 밖에서 실행한다.
        setTimeout(() => {
          supabase.from("walk_profiles").upsert({ id: next.user.id, onboarding_seen: true }).then(() => {});
          loadRecords();
          loadTracks();
          loadProfile(next.user.id);
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadRecords, loadTracks, loadProfile]);

  async function handleOnboardingDone() {
    if (session) {
      await supabase.from("walk_profiles").upsert({ id: session.user.id, onboarding_seen: true });
      setStage("app");
      loadRecords();
    } else {
      window.localStorage.setItem(ONBOARDING_KEY, "1");
      setStage("auth");
    }
  }

  async function handleAuthed() {
    const { data } = await supabase.auth.getSession();
    const current = data.session;
    setSession(current);
    if (current) {
      await supabase.from("walk_profiles").upsert({ id: current.user.id, onboarding_seen: true });
      window.localStorage.removeItem(ONBOARDING_KEY);
      loadProfile(current.user.id);
    }
    setStage("app");
    loadRecords();
  }

  async function handleDeleteRecord(record: WalkRecord) {
    const { error } = await supabase.from("walk_records").delete().eq("id", record.id);
    if (error) {
      showToast("삭제에 실패했어요");
      return;
    }
    await supabase.storage.from(WALK_PHOTOS_BUCKET).remove([record.image_url]);
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setImageUrls((prev) => {
      const next = { ...prev };
      delete next[record.image_url];
      return next;
    });
    setSelectedPin((prev) => (prev?.id === record.id ? null : prev));
    setSelectedFeedRecord((prev) => (prev?.id === record.id ? null : prev));
    showToast("기록이 삭제되었어요");
  }

  async function handleShareRecord(record: WalkRecord) {
    const url = imageUrls[record.image_url];
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "마이플", text: record.ai_caption, url });
      } catch {
        // 사용자가 공유를 취소한 경우 — 별도 처리 없음
      }
      return;
    }
    if (url && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("공유 링크가 복사되었어요");
    }
  }

  function handleReopenOnboarding() {
    setStage("onboarding");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setRecords([]);
    setTracks([]);
    setImageUrls({});
    setActiveTab("feed");
    setStage("auth");
  }

  function resetCapture() {
    if (capturePreviewUrl) URL.revokeObjectURL(capturePreviewUrl);
    setCaptureStep(null);
    setCaptureFile(null);
    setCapturePreviewUrl(undefined);
    setCapturePending(undefined);
    setCaptureLatLng(null);
    setCaptureTakenAt(null);
    setCaptureLocationSource("device");
  }

  async function handleFileSelected(file: File, source: PhotoSource) {
    const previewUrl = URL.createObjectURL(file);
    setCapturePreviewUrl(previewUrl);
    setCaptureStep("loading");

    try {
      // 갤러리 사진(특히 예전 사진)은 "지금 여기"가 아니라 "그때 그곳"을 기록해야
      // 하므로 EXIF의 GPS·촬영일시를 우선 읽는다 — 리사이즈는 EXIF를 지우므로
      // 반드시 원본 file에서 먼저 읽는다. EXIF에 GPS가 없으면(카톡 등을 거쳐
      // 저장됐거나 위치 서비스가 꺼져 있던 사진) 실시간 GPS로 폴백한다.
      const exifMeta =
        source === "gallery" ? await readExifPhotoMeta(file) : { lat: null, lng: null, takenAt: null };
      const hasExifLocation = exifMeta.lat !== null && exifMeta.lng !== null;

      // 원본(수 MB) 대신 리사이즈본을 AI 분석과 업로드 양쪽에 쓴다 — Storage 용량과
      // 이후 피드가 내려받는 바이트를 동시에 줄인다. GPS 획득과 겹쳐서 지연을 숨긴다.
      const [position, resized] = await Promise.all([
        hasExifLocation ? Promise.resolve(null) : getCurrentPosition(),
        resizeImage(file),
      ]);
      setCaptureFile(resized);
      const base64 = await fileToBase64(resized);
      const mimeType = resized.type || "image/jpeg";

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const res = await fetch(GEMINI_VISION_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!res.ok) throw new Error("analysis_failed");
      const result = await res.json();
      const mood: Mood = isMood(result.mood) ? result.mood : "평온";

      setCapturePending({
        caption: String(result.caption || ""),
        tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
        mood,
      });
      if (hasExifLocation) {
        setCaptureLatLng({ lat: exifMeta.lat as number, lng: exifMeta.lng as number });
        setCaptureLocationSource("photo");
      } else {
        if (!position) throw new Error("no_position");
        setCaptureLatLng({ lat: position.coords.latitude, lng: position.coords.longitude });
        setCaptureLocationSource("device");
      }
      setCaptureTakenAt(exifMeta.takenAt);
      setCaptureStep("result");
    } catch {
      showToast("위치 확인 또는 AI 분석에 실패했어요. 다시 시도해주세요");
      setCaptureStep("choose");
    }
  }

  async function handleSaveRecord() {
    if (!session || !captureFile || !capturePending || !captureLatLng) return;

    const ext = captureFile.name.includes(".") ? captureFile.name.split(".").pop() : "jpg";
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(WALK_PHOTOS_BUCKET)
      .upload(path, captureFile, { contentType: captureFile.type || "image/jpeg" });

    if (uploadError) {
      showToast("사진 업로드에 실패했어요");
      return;
    }

    const { error: insertError } = await supabase.from("walk_records").insert({
      user_id: session.user.id,
      image_url: path,
      latitude: captureLatLng.lat,
      longitude: captureLatLng.lng,
      ai_caption: capturePending.caption,
      ai_tags: capturePending.tags,
      ai_mood: capturePending.mood,
      // 갤러리 사진에 촬영일시 EXIF가 있으면 그 시각으로 기록한다(없으면 DB
      // 기본값 now()가 적용되도록 필드 자체를 생략).
      ...(captureTakenAt ? { created_at: captureTakenAt.toISOString() } : {}),
    });

    if (insertError) {
      showToast("기록 저장에 실패했어요");
      return;
    }

    resetCapture();
    setActiveTab("feed");
    showToast("산책 기록이 저장되었어요");
    loadRecords();
  }

  return (
    <div className="wr-app-root">
      {stage === "splash" && <Splash />}

      {stage === "onboarding" && <Onboarding onDone={handleOnboardingDone} />}

      {stage === "auth" && <AuthScreen onAuthed={handleAuthed} />}

      {stage === "app" && (
        <div style={{ height: "100dvh", display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <main
              ref={scrollRef}
              onScroll={handleScroll}
              className="no-scrollbar"
              style={{ height: "100%", overflow: "auto", WebkitOverflowScrolling: "touch" }}
            >
              <div style={{ height: "max(20px, env(safe-area-inset-top))" }} />
              {activeTab === "feed" && (
                <FeedTab
                  records={records}
                  imageUrls={imageUrls}
                  onOpenDetail={setSelectedFeedRecord}
                  onDeleteRecord={handleDeleteRecord}
                  onShareRecord={handleShareRecord}
                />
              )}
              {activeTab === "map" && (
                <MapTab
                  records={records}
                  tracks={tracks}
                  tracker={tracker}
                  imageUrls={imageUrls}
                  onSelectPin={setSelectedPin}
                  theme={theme}
                />
              )}
              {activeTab === "dashboard" && <DashboardTab records={records} tracks={tracks} />}
              {activeTab === "profile" && (
                <ProfileTab
                  records={records}
                  joinedAt={session?.user.created_at}
                  nickname={profile.nickname}
                  avatarUrl={profile.avatarUrl}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onReopenOnboarding={handleReopenOnboarding}
                  onLogout={handleLogout}
                  onToast={showToast}
                  onUpdateNickname={handleUpdateNickname}
                  onUpdateAvatar={handleUpdateAvatar}
                />
              )}
            </main>
            <div
              style={{
                position: "absolute",
                right: 3,
                top: 0,
                width: 3.5,
                borderRadius: 3,
                background: "var(--wr-scroll-thumb)",
                height: thumbHeight,
                transform: `translateY(${thumbTop}px)`,
                opacity: thumbHeight ? thumbOpacity : 0,
                transition: "opacity 0.3s",
                pointerEvents: "none",
                zIndex: 6,
              }}
            />

            {/* 맨 위로 — 피드는 카드가 세로로 길게 쌓여서 아래까지 내려가면 되돌아오기 번거롭다.
                탭바 FAB이 가운데를 차지하므로 오른쪽 아래에 둔다. 숨을 때도 DOM에 남겨두고
                opacity/transform만 바꿔 나타나고 사라지는 게 부드럽게 보이도록 한다. */}
            <button
              type="button"
              aria-label="피드 맨 위로"
              onClick={scrollToTop}
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "1px solid var(--wr-border)",
                background: "var(--wr-glass)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 14px rgba(46,43,36,0.16)",
                display: activeTab === "feed" ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                zIndex: 7,
                opacity: showScrollTop ? 1 : 0,
                transform: showScrollTop ? "translateY(0) scale(1)" : "translateY(8px) scale(0.9)",
                pointerEvents: showScrollTop ? "auto" : "none",
                transition: "opacity 0.22s ease, transform 0.22s ease",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 19V6M12 6l-6 6M12 6l6 6"
                  stroke="var(--wr-accent)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <TabBar
            active={activeTab}
            onSelect={(tab) => {
              setActiveTab(tab);
              setSelectedPin(null);
              // 탭이 바뀌면 스크롤 컨테이너는 그대로고 안의 내용만 갈리므로, 위치를 리셋하지
              // 않으면 짧은 탭에서 브라우저가 scrollTop을 임의로 잘라버려 "맨 위로" 표시가
              // 실제 위치와 어긋난다. 새 탭은 항상 맨 위에서 시작하는 게 자연스럽기도 하다.
              scrollRef.current?.scrollTo({ top: 0 });
              setShowScrollTop(false);
            }}
            onOpenCapture={() => setCaptureStep("choose")}
          />

          {activeTab === "map" && selectedPin && (
            <PinSheet
              record={selectedPin}
              photoUrl={imageUrls[selectedPin.image_url]}
              onClose={() => setSelectedPin(null)}
            />
          )}

          {captureStep && (
            <CaptureSheet
              step={captureStep}
              previewUrl={capturePreviewUrl}
              pending={capturePending}
              locationSource={captureLocationSource}
              onFileSelected={handleFileSelected}
              onCancel={resetCapture}
              onRetake={() => {
                if (capturePreviewUrl) URL.revokeObjectURL(capturePreviewUrl);
                setCapturePreviewUrl(undefined);
                setCapturePending(undefined);
                setCaptureStep("choose");
              }}
              onSave={handleSaveRecord}
            />
          )}

          {selectedFeedRecord && (
            <FeedDetailModal
              record={selectedFeedRecord}
              photoUrl={imageUrls[selectedFeedRecord.image_url]}
              onClose={() => setSelectedFeedRecord(null)}
            />
          )}

          {toast && <Toast message={toast} />}
        </div>
      )}
    </div>
  );
}
