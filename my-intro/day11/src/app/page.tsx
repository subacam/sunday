"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { GEMINI_VISION_FUNCTION_URL, WALK_PHOTOS_BUCKET, supabase } from "@/lib/supabase";
import { fileToBase64, getCurrentPosition } from "@/lib/capture";
import { isMood, type Mood } from "@/lib/mood";
import type { PendingAnalysis, WalkRecord } from "@/types/walk";

import Splash from "@/components/Splash";
import Onboarding from "@/components/Onboarding";
import AuthScreen from "@/components/AuthScreen";
import TabBar, { type TabKey } from "@/components/TabBar";
import FeedTab from "@/components/FeedTab";
import MapTab from "@/components/MapTab";
import DashboardTab from "@/components/DashboardTab";
import ProfileTab from "@/components/ProfileTab";
import PinSheet from "@/components/PinSheet";
import CaptureSheet, { type CaptureStep } from "@/components/CaptureSheet";
import Toast from "@/components/Toast";

type Stage = "splash" | "onboarding" | "auth" | "app";

const ONBOARDING_KEY = "walk_onboarding_seen";

export default function Page() {
  const [stage, setStage] = useState<Stage>("splash");
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [records, setRecords] = useState<WalkRecord[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [selectedPin, setSelectedPin] = useState<WalkRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [captureStep, setCaptureStep] = useState<CaptureStep | null>(null);
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | undefined>(undefined);
  const [capturePending, setCapturePending] = useState<PendingAnalysis | undefined>(undefined);
  const [captureLatLng, setCaptureLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

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
        const { data: profile } = await supabase
          .from("walk_profiles")
          .select("onboarding_seen")
          .eq("id", currentSession.user.id)
          .maybeSingle();
        seenOnboarding = !!profile?.onboarding_seen;
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
        loadRecords();
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    }
    setStage("app");
    loadRecords();
  }

  function handleReopenOnboarding() {
    setStage("onboarding");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setRecords([]);
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
  }

  async function handleFileSelected(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setCaptureFile(file);
    setCapturePreviewUrl(previewUrl);
    setCaptureStep("loading");

    try {
      const [position, base64] = await Promise.all([getCurrentPosition(), fileToBase64(file)]);
      const mimeType = file.type || "image/jpeg";

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
      setCaptureLatLng({ lat: position.coords.latitude, lng: position.coords.longitude });
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
          <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ height: "max(20px, env(safe-area-inset-top))" }} />
            {activeTab === "feed" && <FeedTab records={records} imageUrls={imageUrls} />}
            {activeTab === "map" && <MapTab records={records} onSelectPin={setSelectedPin} />}
            {activeTab === "dashboard" && <DashboardTab records={records} />}
            {activeTab === "profile" && (
              <ProfileTab
                records={records}
                joinedAt={session?.user.created_at}
                onReopenOnboarding={handleReopenOnboarding}
                onLogout={handleLogout}
              />
            )}
          </div>

          <TabBar
            active={activeTab}
            onSelect={(tab) => {
              setActiveTab(tab);
              setSelectedPin(null);
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

          {toast && <Toast message={toast} />}
        </div>
      )}
    </div>
  );
}
