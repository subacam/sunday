import type { Grade } from '@/types/dust';

// 에어코리아 등급 코드(1~4) -> 등급 라벨. 색상만으로 등급을 구분하지 않도록 항상 라벨과 함께 쓴다.
const GRADE_BY_CODE: Record<string, Grade> = {
  '1': '좋음',
  '2': '보통',
  '3': '나쁨',
  '4': '매우나쁨',
};

export function parseGrade(raw: string | null | undefined): Grade {
  if (!raw) return '정보없음';
  return GRADE_BY_CODE[raw] ?? '정보없음';
}

export function parseValue(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (raw === '-' || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

interface GradeStyle {
  label: Grade;
  textClass: string;
  bgClass: string;
  dotClass: string;
}

const GRADE_STYLES: Record<Grade, Omit<GradeStyle, 'label'>> = {
  좋음: { textClass: 'text-blue-700', bgClass: 'bg-blue-50', dotClass: 'bg-blue-500' },
  보통: { textClass: 'text-green-700', bgClass: 'bg-green-50', dotClass: 'bg-green-500' },
  나쁨: { textClass: 'text-orange-700', bgClass: 'bg-orange-50', dotClass: 'bg-orange-500' },
  매우나쁨: { textClass: 'text-red-700', bgClass: 'bg-red-50', dotClass: 'bg-red-500' },
  정보없음: { textClass: 'text-neutral-500', bgClass: 'bg-neutral-100', dotClass: 'bg-neutral-400' },
};

export function gradeStyle(grade: Grade): GradeStyle {
  return { label: grade, ...GRADE_STYLES[grade] };
}
