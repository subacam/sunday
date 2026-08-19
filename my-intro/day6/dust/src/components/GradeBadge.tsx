import { gradeStyle } from '@/lib/airQualityGrade';
import type { Grade } from '@/types/dust';

export default function GradeBadge({ grade }: { grade: Grade }) {
  const style = gradeStyle(grade);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${style.bgClass} ${style.textClass}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dotClass}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}
