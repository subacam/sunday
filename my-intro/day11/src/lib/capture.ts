import exifr from "exifr";

export interface ExifPhotoMeta {
  lat: number | null;
  lng: number | null;
  takenAt: Date | null;
}

// 갤러리에서 고른 사진(특히 예전 사진)은 "지금 여기"가 아니라 "그때 그곳"을
// 기록해야 하므로, 실시간 GPS/현재시각 대신 사진 자체의 EXIF(GPS·촬영일시)를
// 우선 쓴다. 카카오톡 등을 거쳐 저장돼 EXIF가 지워졌거나 위치 서비스를 꺼두고
// 찍은 사진은 값이 없을 수 있어 호출부가 실시간 GPS/현재시각으로 폴백해야 한다.
export async function readExifPhotoMeta(file: File): Promise<ExifPhotoMeta> {
  const [gps, tags] = await Promise.all([
    exifr.gps(file).catch(() => null),
    exifr.parse(file, ["DateTimeOriginal"]).catch(() => null),
  ]);
  return {
    lat: gps && typeof gps.latitude === "number" ? gps.latitude : null,
    lng: gps && typeof gps.longitude === "number" ? gps.longitude : null,
    takenAt: tags?.DateTimeOriginal instanceof Date ? tags.DateTimeOriginal : null,
  };
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation_unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });
  });
}

// 카메라 원본(수 MB)을 업로드/AI 전송 전에 줄인다 — Storage 용량과 이후 피드 로딩 바이트를
// 동시에 줄이기 위해 긴 변 기준 리사이즈 + JPEG 재인코딩한다. 이미 작은 이미지는 확대하지 않는다.
export function resizeImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas_unsupported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("resize_failed"));
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_load_failed"));
    };
    img.src = url;
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,AAAA..." -> "AAAA..."
      const base64 = result.slice(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
