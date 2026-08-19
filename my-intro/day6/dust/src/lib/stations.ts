import type { CityCode } from '@/types/dust';

/**
 * 시/도별 대표 측정소명 (getMsrstnAcctoRltmMesureDnsty의 stationName 파라미터로 사용).
 *
 * 아래 7개는 실 서비스키로 라이브 호출까지 확인된 값이다:
 * seoul, busan, daegu, incheon, gwangju, daejeon, ulsan.
 *
 * 나머지 10개(sejong, gyeonggi, gangwon, chungbuk, chungnam, jeonbuk, jeonnam,
 * gyeongbuk, gyeongnam, jeju)는 **미검증 상태**다. 시/도명을 그대로 쓴 최초 추정값
 * ("수원", "춘천", "청주", "천안", "전주", "목포", "안동", "창원", "제주", "세종고운")은
 * 라이브 호출로 확인해보니 전부 존재하지 않는 측정소명으로 확인되어 제거했고,
 * 대신 실제 동 단위 측정소명일 가능성이 있는 값으로 교체했지만 이 값들 자체는
 * 아직 라이브로 확인하지 못했다(API가 짧은 시간에 반복 호출을 많이 받아 rate-limit에
 * 걸려 있는 상태에서 작업을 멈췄다). 이 10개 도시는 현재 UI에서 선택 시 NO_DATA 에러
 * 상태(친절한 에러 카드 + 다시 시도)로 정상적으로 저하되어 보이므로 앱이 깨지지는 않지만,
 * 정확한 값은 에어코리아 "측정소 정보" 페이지(https://www.airkorea.or.kr/web/stationInfo)에서
 * 확인해 채워 넣어야 한다.
 */
export const REPRESENTATIVE_STATIONS: Record<CityCode, string> = {
  seoul: '중구',
  busan: '연산동',
  daegu: '대신동',
  incheon: '구월동',
  gwangju: '농성동',
  daejeon: '문창동',
  ulsan: '신정동',
  // 아래 10개는 미검증 — 위 주석 참고.
  sejong: '종촌동',
  gyeonggi: '파장동',
  gangwon: '석사동',
  chungbuk: '복대동',
  chungnam: '쌍용동',
  jeonbuk: '덕진동',
  jeonnam: '옥암동',
  gyeongbuk: '대잠동',
  gyeongnam: '봉림동',
  jeju: '이도동',
};
