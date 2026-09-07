import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "마이플",
  description: "오늘의 걸음을 기록해요 — AI가 감성을 붙이고, 지도와 대시보드가 나의 산책을 기억한다.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8927c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <head>
        {/* localStorage 읽기가 React 하이드레이션보다 먼저 끝나야 라이트→다크 깜빡임이 없다. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('walk_theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}",
          }}
        />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
