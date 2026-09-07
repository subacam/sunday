export type CityCode =
  | 'seoul'
  | 'busan'
  | 'daegu'
  | 'incheon'
  | 'gwangju'
  | 'daejeon'
  | 'ulsan'
  | 'sejong'
  | 'gyeonggi'
  | 'gangwon'
  | 'chungbuk'
  | 'chungnam'
  | 'jeonbuk'
  | 'jeonnam'
  | 'gyeongbuk'
  | 'gyeongnam'
  | 'jeju';

export interface City {
  code: CityCode;
  name: string;
}

export type Grade = '좋음' | '보통' | '나쁨' | '매우나쁨' | '정보없음';

export interface HourlyPoint {
  dataTime: string;
  pm10Value: number | null;
  pm25Value: number | null;
}

export interface RealtimeReading {
  dataTime: string;
  pm10Value: number | null;
  pm25Value: number | null;
  khaiGrade: Grade;
  pm10Grade: Grade;
  pm25Grade: Grade;
}

export interface DustApiSuccess {
  city: CityCode;
  station: string;
  current: RealtimeReading;
  hourly: HourlyPoint[];
}

export type DustApiErrorCode =
  | 'INVALID_CITY'
  | 'UPSTREAM_CONFIG_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'NO_DATA';

export interface DustApiError {
  error: DustApiErrorCode;
  message: string;
}
