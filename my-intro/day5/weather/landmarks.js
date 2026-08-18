// day5 랜드마크 정적 데이터 (PRD §6 스키마, silhouette 대신 emoji, thumbnail은 위키미디어 커먼즈 사진 URL 사용)
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
   * @property {string} image - 위키미디어 커먼즈 사진 URL (자유이용 라이선스, ~640px 썸네일)
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tokyo_Tower_2023.jpg/960px-Tokyo_Tower_2023.jpg",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg/960px-Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg",
      description: "828m, 현존 세계 최고층 빌딩",
    },
    {
      id: "great-wall",
      name: "만리장성",
      nameEn: "Great Wall of China",
      city: "베이징",
      country: "중국",
      countryCode: "CN",
      continent: "asia",
      latitude: 40.4319,
      longitude: 116.5704,
      emoji: "🧱",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/960px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg",
      description: "수천 km에 걸쳐 이어진 고대 방어 성벽",
    },
    {
      id: "angkor-wat",
      name: "앙코르와트",
      nameEn: "Angkor Wat",
      city: "시엠레아프",
      country: "캄보디아",
      countryCode: "KH",
      continent: "asia",
      latitude: 13.4125,
      longitude: 103.867,
      emoji: "🛕",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/960px-Angkor_Wat.jpg",
      description: "12세기에 세워진 세계 최대 규모의 사원 유적",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/960px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Elizabeth_Tower_and_the_north_front_of_the_Palace_of_Westminster%2C_London.jpg/960px-Elizabeth_Tower_and_the_north_front_of_the_Palace_of_Westminster%2C_London.jpg",
      description: "웨스트민스터 궁 시계탑의 별칭",
    },
    {
      id: "colosseum",
      name: "콜로세움",
      nameEn: "Colosseum",
      city: "로마",
      country: "이탈리아",
      countryCode: "IT",
      continent: "europe",
      latitude: 41.8902,
      longitude: 12.4922,
      emoji: "🏛️",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/960px-Colosseo_2020.jpg",
      description: "고대 로마의 원형 경기장",
    },
    {
      id: "sagrada-familia",
      name: "사그라다 파밀리아",
      nameEn: "Sagrada Familia",
      city: "바르셀로나",
      country: "스페인",
      countryCode: "ES",
      continent: "europe",
      latitude: 41.4036,
      longitude: 2.1744,
      emoji: "⛪",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/SF_maig_2_cropped.jpg/960px-SF_maig_2_cropped.jpg",
      description: "가우디가 설계한 아직도 건축 중인 대성당",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Front_view_of_Statue_of_Liberty_%28cropped%29.jpg/960px-Front_view_of_Statue_of_Liberty_%28cropped%29.jpg",
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
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Chichen_Itza_3.jpg/960px-Chichen_Itza_3.jpg",
      description: "마야 문명의 대표 유적, 쿠쿨칸 피라미드",
    },
    {
      id: "golden-gate-bridge",
      name: "골든게이트 브리지",
      nameEn: "Golden Gate Bridge",
      city: "샌프란시스코",
      country: "미국",
      countryCode: "US",
      continent: "north-america",
      latitude: 37.8199,
      longitude: -122.4783,
      emoji: "🌉",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/960px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg",
      description: "붉은 주황빛 현수교, 샌프란시스코의 상징",
    },
    {
      id: "cn-tower",
      name: "CN 타워",
      nameEn: "CN Tower",
      city: "토론토",
      country: "캐나다",
      countryCode: "CA",
      continent: "north-america",
      latitude: 43.6426,
      longitude: -79.3871,
      emoji: "🗼",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/CN_Tower%2C_Toronto%2C_Ontario_%2829969151776%29.jpg/960px-CN_Tower%2C_Toronto%2C_Ontario_%2829969151776%29.jpg",
      description: "한때 세계에서 가장 높았던 통신탑",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Christ_the_Redeemer_-_Cristo_Redentor.jpg/960px-Christ_the_Redeemer_-_Cristo_Redentor.jpg",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Machu_Picchu%2C_2023_%28012%29.jpg/960px-Machu_Picchu%2C_2023_%28012%29.jpg",
      description: "안데스 산맥 고지대의 잉카 유적 도시",
    },
    {
      id: "iguazu-falls",
      name: "이과수 폭포",
      nameEn: "Iguazu Falls",
      city: "미시오네스",
      country: "아르헨티나",
      countryCode: "AR",
      continent: "south-america",
      latitude: -25.6953,
      longitude: -54.4367,
      emoji: "💦",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Aerial_Foz_de_Igua%C3%A7u_26_Nov_2005.jpg/960px-Aerial_Foz_de_Igua%C3%A7u_26_Nov_2005.jpg",
      description: "아르헨티나와 브라질 국경에 걸친 거대한 폭포군",
    },
    {
      id: "salar-de-uyuni",
      name: "우유니 소금사막",
      nameEn: "Salar de Uyuni",
      city: "우유니",
      country: "볼리비아",
      countryCode: "BO",
      continent: "south-america",
      latitude: -20.1338,
      longitude: -67.4891,
      emoji: "🧂",
      image: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Salar_Uyuni_au01.jpg",
      description: "세계 최대의 소금 평원, 비 온 뒤 거대한 거울이 됨",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Pyramids_of_the_Giza_Necropolis.jpg/960px-Pyramids_of_the_Giza_Necropolis.jpg",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Table_Mountain_DanieVDM.jpg/960px-Table_Mountain_DanieVDM.jpg",
      description: "정상이 평평한 사암 산, 케이프타운의 랜드마크",
    },
    {
      id: "sahara-desert",
      name: "사하라 사막",
      nameEn: "Sahara Desert (Merzouga)",
      city: "메르주가",
      country: "모로코",
      countryCode: "MA",
      continent: "africa",
      latitude: 31.0801,
      longitude: -4.0133,
      emoji: "🐫",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Merzouga_Dunes_2011.jpg/960px-Merzouga_Dunes_2011.jpg",
      description: "세계 최대의 뜨거운 사막, 붉은 모래언덕으로 유명",
    },
    {
      id: "serengeti",
      name: "세렝게티 국립공원",
      nameEn: "Serengeti National Park",
      city: "세렝게티",
      country: "탄자니아",
      countryCode: "TZ",
      continent: "africa",
      latitude: -2.3333,
      longitude: 34.8333,
      emoji: "🦁",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Serengeti-Landscape-2012.JPG/960px-Serengeti-Landscape-2012.JPG",
      description: "대이동으로 유명한 동아프리카의 대초원",
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
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sydney_Australia._%2821339175489%29.jpg/960px-Sydney_Australia._%2821339175489%29.jpg",
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
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/ULURU.jpg/960px-ULURU.jpg",
      description: "호주 사막 한가운데 우뚝 솟은 거대한 붉은 바위",
    },
    {
      id: "milford-sound",
      name: "밀포드 사운드",
      nameEn: "Milford Sound",
      city: "피오르드랜드",
      country: "뉴질랜드",
      countryCode: "NZ",
      continent: "oceania",
      latitude: -44.6714,
      longitude: 167.925,
      emoji: "🏔️",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Milford_Sound_%28New_Zealand%29.JPG/960px-Milford_Sound_%28New_Zealand%29.JPG",
      description: "깎아지른 절벽과 폭포로 둘러싸인 피오르 협만",
    },
    {
      id: "bora-bora",
      name: "보라보라 섬",
      nameEn: "Bora Bora",
      city: "보라보라",
      country: "프랑스령 폴리네시아",
      countryCode: "PF",
      continent: "oceania",
      latitude: -16.5004,
      longitude: -151.7415,
      emoji: "🏝️",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Bora_Bora_ISS006.jpg/960px-Bora_Bora_ISS006.jpg",
      description: "에메랄드빛 라군으로 둘러싸인 남태평양의 섬",
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
