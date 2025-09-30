export function formatMonthLabel(period: string) {
  const [y,m] = period.split('-').map(Number);
  const d = new Date(y, (m||1)-1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function formatDayLabel(day: string) {
  const [y,m,d] = day.split('-').map(Number);
  const date = new Date(y, (m||1)-1, d||1);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

export function computeWorkedMinutes(e: { includeMorning: boolean; includeAfternoon: boolean; morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string; }) {
  const parse = (hhmm: string) => {
    const [h,m] = (hhmm||'0:0').split(':').map(Number);
    return h*60 + m;
  };
  let total = 0;
  if (e.includeMorning) total += Math.max(0, parse(e.morningEnd)-parse(e.morningStart));
  if (e.includeAfternoon) total += Math.max(0, parse(e.afternoonEnd)-parse(e.afternoonStart));
  return total;
}

export function formatHours(minutes: number) {
  const h = Math.floor(minutes/60);
  const m = minutes%60;
  return `${h}h ${String(m).padStart(2,'0')}m`;
}

/**
 * Formats a briefCount (fractional hours, e.g. 1.5) to HhMM (e.g. '1h30').
 */
export function formatBriefCount(bc?: number | null) {
  if (bc === undefined || bc === null || isNaN(bc as any)) return '---';
  const totalMins = Math.round((bc as number) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h)}h${String(m).padStart(2, '0')}`;
}
