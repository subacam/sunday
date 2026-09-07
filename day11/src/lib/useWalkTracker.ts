"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { nextTrackPoint, trackDistanceMeters } from "@/lib/track";
import type { TrackPoint, WalkTrack } from "@/types/walk";

// 진행 중인 산책을 localStorage에도 계속 써둔다. PWA는 탭이 백그라운드로 밀리거나
// 새로고침되면 메모리 상태가 통째로 날아가는데, 걷는 도중 그 일이 일어나도
// 지금까지의 경로를 잃지 않도록 하기 위한 것.
const ACTIVE_WALK_KEY = "walk_active_track";

interface ActiveWalk {
  startedAt: number;
  points: TrackPoint[];
}

function readActiveWalk(): ActiveWalk | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_WALK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWalk;
    if (!parsed || !Array.isArray(parsed.points) || typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeActiveWalk(walk: ActiveWalk | null) {
  if (typeof window === "undefined") return;
  try {
    if (walk) window.localStorage.setItem(ACTIVE_WALK_KEY, JSON.stringify(walk));
    else window.localStorage.removeItem(ACTIVE_WALK_KEY);
  } catch {
    // 사파리 프라이빗 모드 등 저장이 막힌 환경 — 복구 기능만 못 쓸 뿐 추적 자체는 계속된다
  }
}

export interface WalkTracker {
  tracking: boolean;
  points: TrackPoint[];
  distance: number;
  startedAt: number | null;
  error: string | null;
  start: () => void;
  stop: () => Promise<WalkTrack | null>;
  discard: () => void;
}

export function useWalkTracker(userId: string | undefined, onSaved: (track: WalkTrack) => void): WalkTracker {
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  // 저장 시점에 최신 points를 읽어야 하는데 stop()이 setState 반영 전에 실행될 수
  // 있어, state와 별개로 ref에도 같은 배열을 들고 다닌다.
  const pointsRef = useRef<TrackPoint[]>([]);

  const setBoth = useCallback((next: TrackPoint[]) => {
    pointsRef.current = next;
    setPoints(next);
  }, []);

  // 새로고침으로 끊긴 산책이 있으면 복구한다(추적은 사용자가 다시 시작 버튼을 눌러야 재개).
  useEffect(() => {
    const saved = readActiveWalk();
    if (saved && saved.points.length > 0) {
      // localStorage는 React 밖의 외부 상태다 — 마운트 시 한 번 읽어 state로 옮기는
      // 것이 이 훅의 목적이라 set-state-in-effect 규칙을 여기서만 끈다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBoth(saved.points);
      setStartedAt(saved.startedAt);
    }
  }, [setBoth]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => stopWatch, [stopWatch]);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("이 브라우저에서는 위치 기록을 쓸 수 없어요");
      return;
    }
    setError(null);
    const resumed = pointsRef.current.length > 0;
    const begin = resumed && startedAt ? startedAt : Date.now();
    if (!resumed) setBoth([]);
    setStartedAt(begin);
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = nextTrackPoint(pointsRef.current, position);
        if (!point) return;
        const next = [...pointsRef.current, point];
        setBoth(next);
        writeActiveWalk({ startedAt: begin, points: next });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 필요해요. 브라우저 설정에서 허용해주세요"
            : "위치를 받아오지 못했어요"
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [setBoth, startedAt]);

  const discard = useCallback(() => {
    stopWatch();
    setTracking(false);
    setBoth([]);
    setStartedAt(null);
    writeActiveWalk(null);
  }, [setBoth, stopWatch]);

  const stop = useCallback(async (): Promise<WalkTrack | null> => {
    stopWatch();
    setTracking(false);
    const finalPoints = pointsRef.current;
    const begin = startedAt;

    // 점이 2개 미만이면 선이 되지 않는다 — 저장하지 않고 그냥 버린다.
    if (!userId || !begin || finalPoints.length < 2) {
      discard();
      return null;
    }

    const { data, error: insertError } = await supabase
      .from("walk_tracks")
      .insert({
        user_id: userId,
        started_at: new Date(begin).toISOString(),
        ended_at: new Date().toISOString(),
        distance_m: trackDistanceMeters(finalPoints),
        points: finalPoints,
      })
      .select()
      .single();

    if (insertError || !data) {
      // 저장 실패 시 경로를 지우지 않는다 — localStorage에 남겨두고 다시 시도할 수 있게.
      setError("산책 기록을 저장하지 못했어요. 다시 종료를 눌러주세요");
      return null;
    }

    setBoth([]);
    setStartedAt(null);
    writeActiveWalk(null);
    const track = data as WalkTrack;
    onSaved(track);
    return track;
  }, [discard, onSaved, setBoth, startedAt, stopWatch, userId]);

  return {
    tracking,
    points,
    distance: trackDistanceMeters(points),
    startedAt,
    error,
    start,
    stop,
    discard,
  };
}
