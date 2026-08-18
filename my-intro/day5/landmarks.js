// day5 랜드마크 정적 데이터 (PRD §6 스키마, silhouette/thumbnail 대신 emoji 사용)
window.WW = window.WW || {};

(function () {
  "use strict";

  /**
   * @typedef {Object} Landmark
   * @property {string} id
   * @property {string} name
   * @property {string} nameEn
   * @property {string} city
   * @property {string} country
   * @property {string} countryCode
   * @property {'asia'|'europe'|'north-america'|'south-america'|'africa'|'oceania'} continent
   * @property {number} latitude
   * @property {number} longitude
   * @property {string} emoji
   * @property {string} description
   */

  /** @type {Landmark[]} */
  const LANDMARKS = [
    // ── 아시아 ──────────────────────────────────────────────
    {
      id: "tokyo-tower",
      name: "도쿄 타워",
      nameEn: "Tokyo Tower",
      city: "도쿄",
      country: "일본",
      countryCode: "JP",
      continent: "asia",
      latitude: 35.6586,
      longitude: 139.7454,
      emoji: "🗼",
      description: "1958년 완공된 붉은 전파탑, 도쿄의 상징 중 하나",
    },
    {
      id: "burj-khalifa",
      name: "부르즈 할리파",
      nameEn: "Burj Khalifa",
      city: "두바이",
      country: "아랍에미리트",
      countryCode: "AE",
      continent: "asia",
      latitude: 25.1972,
      longitude: 55.2744,
      emoji: "🏙️",
      description: "828m, 현존 세계 최고층 빌딩",
    },

    // ── 유럽 ────────────────────────────────────────────────
    {
      id: "eiffel-tower",
      name: "에펠탑",
      nameEn: "Eiffel Tower",
      city: "파리",
      country: "프랑스",
      countryCode: "FR",
      continent: "europe",
      latitude: 48.8584,
      longitude: 2.2945,
      emoji: "🗼",
      description: "1889년 만국박람회를 위해 세워진 파리의 상징",
    },
    {
      id: "big-ben",
      name: "빅벤",
      nameEn: "Big Ben",
      city: "런던",
      country: "영국",
      countryCode: "GB",
      continent: "europe",
      latitude: 51.5007,
      longitude: -0.1246,
      emoji: "🕰️",
      description: "웨스트민스터 궁 시계탑의 별칭",
    },

    // ── 북미 ────────────────────────────────────────────────
    {
      id: "statue-of-liberty",
      name: "자유의 여신상",
      nameEn: "Statue of Liberty",
      city: "뉴욕",
      country: "미국",
      countryCode: "US",
      continent: "north-america",
      latitude: 40.6892,
      longitude: -74.0445,
      emoji: "🗽",
      description: "1886년 프랑스가 미국에 선물한 자유의 상징",
    },
    {
      id: "chichen-itza",
      name: "치첸이트사",
      nameEn: "Chichen Itza",
      city: "유카탄",
      country: "멕시코",
      countryCode: "MX",
      continent: "north-america",
      latitude: 20.6843,
      longitude: -88.5678,
      emoji: "🛕",
      description: "마야 문명의 대표 유적, 쿠쿨칸 피라미드",
    },

    // ── 남미 ────────────────────────────────────────────────
    {
      id: "christ-the-redeemer",
      name: "거대한 예수상",
      nameEn: "Christ the Redeemer",
      city: "리우데자네이루",
      country: "브라질",
      countryCode: "BR",
      continent: "south-america",
      latitude: -22.9519,
      longitude: -43.2105,
      emoji: "✝️",
      description: "코르코바두 언덕 위에 선 거대한 예수상",
    },
    {
      id: "machu-picchu",
      name: "마추픽추",
      nameEn: "Machu Picchu",
      city: "쿠스코",
      country: "페루",
      countryCode: "PE",
      continent: "south-america",
      latitude: -13.1631,
      longitude: -72.545,
      emoji: "⛰️",
      description: "안데스 산맥 고지대의 잉카 유적 도시",
    },

    // ── 아프리카 ────────────────────────────────────────────
    {
      id: "pyramids-of-giza",
      name: "기자의 피라미드",
      nameEn: "Pyramids of Giza",
      city: "카이로",
      country: "이집트",
      countryCode: "EG",
      continent: "africa",
      latitude: 29.9792,
      longitude: 31.1342,
      emoji: "🔺",
      description: "고대 이집트 왕조가 남긴 거대한 석조 무덤군",
    },
    {
      id: "table-mountain",
      name: "테이블 마운틴",
      nameEn: "Table Mountain",
      city: "케이프타운",
      country: "남아프리카공화국",
      countryCode: "ZA",
      continent: "africa",
      latitude: -33.9628,
      longitude: 18.4098,
      emoji: "⛰️",
      description: "정상이 평평한 사암 산, 케이프타운의 랜드마크",
    },

    // ── 오세아니아 ──────────────────────────────────────────
    {
      id: "sydney-opera-house",
      name: "시드니 오페라 하우스",
      nameEn: "Sydney Opera House",
      city: "시드니",
      country: "호주",
      countryCode: "AU",
      continent: "oceania",
      latitude: -33.8568,
      longitude: 151.2153,
      emoji: "🎭",
      description: "조개껍질 모양 지붕으로 유명한 공연예술 건축물",
    },
    {
      id: "uluru",
      name: "울룰루",
      nameEn: "Uluru",
      city: "노던 준주",
      country: "호주",
      countryCode: "AU",
      continent: "oceania",
      latitude: -25.3444,
      longitude: 131.0369,
      emoji: "🪨",
      description: "호주 사막 한가운데 우뚝 솟은 거대한 붉은 바위",
    },
  ];

  // Tab 순회가 "대륙 → 랜드마크명" 순서를 따르도록 정렬해 둔다 (F-01 키보드 요건).
  const CONTINENT_ORDER = [
    "asia",
    "europe",
    "north-america",
    "south-america",
    "africa",
    "oceania",
  ];
  LANDMARKS.sort((a, b) => {
    const ca = CONTINENT_ORDER.indexOf(a.continent);
    const cb = CONTINENT_ORDER.indexOf(b.continent);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name, "ko");
  });

  const CONTINENT_LABELS = {
    asia: "아시아",
    europe: "유럽",
    "north-america": "북미",
    "south-america": "남미",
    africa: "아프리카",
    oceania: "오세아니아",
  };

  // 대륙 자동 줌을 위한 대략적인 위경도 바운딩 박스 (자체 상수 관리, PRD §5 F-01)
  const CONTINENT_BOUNDS = {
    asia: { lonMin: 60, lonMax: 150, latMin: 0, latMax: 55 },
    europe: { lonMin: -25, lonMax: 45, latMin: 35, latMax: 70 },
    "north-america": { lonMin: -170, lonMax: -50, latMin: 10, latMax: 75 },
    "south-america": { lonMin: -82, lonMax: -34, latMin: -56, latMax: 13 },
    africa: { lonMin: -20, lonMax: 52, latMin: -35, latMax: 38 },
    oceania: { lonMin: 110, lonMax: 180, latMin: -48, latMax: 0 },
  };

  function getLandmarkById(id) {
    return LANDMARKS.find((l) => l.id === id) || null;
  }

  window.WW.landmarks = LANDMARKS;
  window.WW.continentLabels = CONTINENT_LABELS;
  window.WW.continentOrder = CONTINENT_ORDER;
  window.WW.continentBounds = CONTINENT_BOUNDS;
  window.WW.getLandmarkById = getLandmarkById;
})();
