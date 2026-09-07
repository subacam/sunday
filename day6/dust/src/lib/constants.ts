import type { City } from '@/types/dust';

export const CITIES: City[] = [
  { code: 'seoul', name: '서울' },
  { code: 'busan', name: '부산' },
  { code: 'daegu', name: '대구' },
  { code: 'incheon', name: '인천' },
  { code: 'gwangju', name: '광주' },
  { code: 'daejeon', name: '대전' },
  { code: 'ulsan', name: '울산' },
  { code: 'sejong', name: '세종' },
  { code: 'gyeonggi', name: '경기' },
  { code: 'gangwon', name: '강원' },
  { code: 'chungbuk', name: '충북' },
  { code: 'chungnam', name: '충남' },
  { code: 'jeonbuk', name: '전북' },
  { code: 'jeonnam', name: '전남' },
  { code: 'gyeongbuk', name: '경북' },
  { code: 'gyeongnam', name: '경남' },
  { code: 'jeju', name: '제주' },
];

export const DEFAULT_CITY = 'seoul';

// 시간별 그래프에 보여줄 최대 시간 수(최근 24시간).
export const HOURLY_POINTS = 24;

// 에어코리아 실시간 데이터는 매시 정각 기준 갱신되므로 서버 캐시 TTL을 1시간으로 맞춘다 (PRD §11).
export const CACHE_REVALIDATE_SECONDS = 3600;
