// AirKorea dataTime looks like "2026-08-19 15:00", already KST — parse without timezone conversion.
export function formatMeasuredTime(dataTime: string): string {
  const match = dataTime.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return dataTime;
  const [, , month, day, hour] = match;
  return `${Number(month)}월 ${Number(day)}일 ${Number(hour)}시 측정`;
}

export function formatHourLabel(dataTime: string): string {
  const match = dataTime.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return dataTime;
  const [, , , , hour] = match;
  return `${Number(hour)}시`;
}
