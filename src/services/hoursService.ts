import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getFirestore, addDoc, serverTimestamp, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { EntryReviewStatus } from '../modules/checklist/lib/constants';

export type HoursEntryDoc = {
  id: string;           // logical id for the day entry (e.g., yyyy-mm-dd)
  period: string;       // yyyy-MM
  day: string;          // yyyy-mm-dd
  includeMorning: boolean;
  includeAfternoon: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  project: string;
  notes?: string;
  briefCount?: number | null;
  status: 'draft'|'submitted';
  reviewStatus: EntryReviewStatus;
  hasDispute?: boolean;
  rejectionNote?: string | null;
  disputeMessage?: string | null; // agent-provided reclamation message
  superviseur?: string;
  userId: string;       // owner of the entry
  userDisplayName?: string | null;
  userEmail?: string | null;
  createdAt?: any;
};

// Narrow type without Firestore-only fields, useful for UI contracts
export type HoursEntry = Omit<HoursEntryDoc, 'userId' | 'createdAt'>;

const db = getFirestore();
const coll = collection(db, 'hoursEntries');

function computePeriodRange(period: string): { start: string; endExclusive: string } {
  // period is 'YYYY-MM'
  const [y, m] = period.split('-').map((v) => parseInt(v, 10));
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1); // first day of next month
  const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return { start: toStr(startDate), endExclusive: toStr(endDate) };
}

function periodVariants(period: string): { padded: string; noPad: string } {
  const [y, m] = period.split('-');
  const n = parseInt(m, 10);
  const noPad = `${y}-${n}`;
  const padded = `${y}-${String(n).padStart(2,'0')}`;
  return { padded, noPad };
}

function derivePeriodFromDay(day?: string): string | null {
  if (!day) return null;
  const parts = String(day).split('-');
  if (parts.length < 2) return null;
  const y = parts[0];
  const m = String(parseInt(parts[1], 10)).padStart(2,'0');
  return `${y}-${m}`;
}

function normalizeDayString(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  try {
    if (typeof value.toDate === 'function') {
      const d: Date = value.toDate();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch {}
  return null;
}

function computePeriodDateRange(period: string): { startDate: Date; endDate: Date } {
  const [y, m] = period.split('-').map((v)=> parseInt(v, 10));
  const startDate = new Date(y, m-1, 1, 0, 0, 0, 0);
  const endDate = new Date(y, m, 1, 0, 0, 0, 0);
  return { startDate, endDate };
}

export function subscribeEntriesByPeriod(period: string, cb: (list: Array<HoursEntryDoc & { _docId: string }>)=>void) {
  const { start, endExclusive } = computePeriodRange(period);
  const { padded, noPad } = periodVariants(period);
  const qByPeriod = query(coll, where('period','==', padded));
  const qByPeriodAlt = noPad !== padded ? query(coll, where('period','==', noPad)) : null;
  const qByDayRange = query(coll, where('day','>=', start), where('day','<', endExclusive));
  const year = period.split('-')[0];
  const qByYearRange = query(coll, where('day','>=', `${year}-`), where('day','<', `${Number(year)+1}-`));
  const { startDate, endDate } = computePeriodDateRange(period);
  const qByCreatedAt = query(coll, where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<', Timestamp.fromDate(endDate)));
  const qByDayRangeTs = query(coll, where('day','>=', Timestamp.fromDate(startDate)), where('day','<', Timestamp.fromDate(endDate)));

  let lastA: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastB: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastC: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastD: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastE: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastF: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastG: Record<string, HoursEntryDoc & { _docId: string }> = {};

  const emit = () => {
    // Merge all streams; precedence starts from broadest fallback
    const merged: Record<string, HoursEntryDoc & { _docId: string }> = { ...lastG, ...lastF, ...lastE, ...lastD, ...lastB, ...lastC, ...lastA };
    // Filter to target month using period/day/createdAt, then normalize fields before emitting
    const rows = Object.values(merged)
      .filter((it)=> {
        const p = (typeof it.period === 'string' && it.period) ? periodVariants(it.period as any).padded : null;
        const dayStr = normalizeDayString((it as any).day);
        const fromDay = dayStr ? derivePeriodFromDay(dayStr) : null;
        const created = (it as any).createdAt && typeof (it as any).createdAt.toDate === 'function' ? (it as any).createdAt.toDate() as Date : null;
        const inCreatedRange = created ? (created >= startDate && created < endDate) : false;
        return (p && p === padded) || (fromDay === padded) || inCreatedRange;
      })
      .map((raw) => {
        // Normalize to strings for UI safety
        const created = (raw as any).createdAt && typeof (raw as any).createdAt.toDate === 'function' ? (raw as any).createdAt.toDate() as Date : null;
        const createdStr = created ? `${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,'0')}-${String(created.getDate()).padStart(2,'0')}` : '';
        const dayStr = normalizeDayString((raw as any).day) || createdStr || String((raw as any).day || '');
        const periodFromDay = derivePeriodFromDay(dayStr);
        const declaredPeriod = typeof raw.period === 'string' && raw.period ? periodVariants(raw.period).padded : '';
        const safePeriod = periodFromDay || declaredPeriod || padded;
        return { ...(raw as any), day: dayStr, period: safePeriod } as HoursEntryDoc & { _docId: string };
      })
      .sort((a,b)=> a.day.localeCompare(b.day));
    try {
      // Lightweight debug to help diagnose which query path matched
      console.debug('[hoursService] emit', {
        period,
        counts: {
          byPeriod: Object.keys(lastA).length,
          byPeriodAlt: Object.keys(lastC).length,
          byDayRange: Object.keys(lastB).length,
          byYearRange: Object.keys(lastD).length,
          byCreatedAt: Object.keys(lastE).length,
          byDayRangeTs: Object.keys(lastF).length,
          all: Object.keys(lastG).length,
          merged: rows.length,
        },
      });
    } catch {}
    cb(rows);
  };

  const unsubA = onSnapshot(qByPeriod, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastA = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeEntriesByPeriod (period) error', err);
    lastA = {};
    emit();
  });

  const unsubAlt = qByPeriodAlt ? onSnapshot(qByPeriodAlt, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastC = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeEntriesByPeriod (period alt) error', err);
    lastC = {};
    emit();
  }) : null;

  const unsubB = onSnapshot(qByDayRange, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastB = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeEntriesByPeriod (day range) error', err);
    lastB = {};
    emit();
  });

  const unsubD = onSnapshot(qByYearRange, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastD = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeEntriesByPeriod (year range) error', err);
    lastD = {};
    emit();
  });

  const unsubE = onSnapshot(qByCreatedAt, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastE = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeEntriesByPeriod (createdAt range) error', err);
    lastE = {};
    emit();
  });

  const unsubF = onSnapshot(qByDayRangeTs, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastF = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeEntriesByPeriod (day range TS) error', err);
    lastF = {};
    emit();
  });

  // Final fallback: whole collection (client-side filtered)
  const unsubG = onSnapshot(coll, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastG = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeEntriesByPeriod (all coll) error', err);
    lastG = {};
    emit();
  });

  return ()=>{
    try { unsubA && unsubA(); } catch {}
    try { unsubB && unsubB(); } catch {}
    try { unsubAlt && (unsubAlt as any)(); } catch {}
    try { unsubD && unsubD(); } catch {}
    try { unsubE && unsubE(); } catch {}
    try { unsubF && unsubF(); } catch {}
    try { unsubG && unsubG(); } catch {}
  };
}

export function subscribeMyEntriesByPeriod(period: string, userId: string, cb: (list: Array<HoursEntryDoc & { _docId: string }>)=>void) {
  const { start, endExclusive } = computePeriodRange(period);
  const { padded, noPad } = periodVariants(period);
  const qByPeriod = query(coll, where('period','==', padded), where('userId','==', userId));
  const qByPeriodAlt = noPad !== padded ? query(coll, where('period','==', noPad), where('userId','==', userId)) : null;
  const qByDayRange = query(coll, where('day','>=', start), where('day','<', endExclusive), where('userId','==', userId));
  const year = period.split('-')[0];
  const qByYearRange = query(coll, where('day','>=', `${year}-`), where('day','<', `${Number(year)+1}-`), where('userId','==', userId));
  const { startDate, endDate } = computePeriodDateRange(period);
  const qByCreatedAt = query(coll, where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<', Timestamp.fromDate(endDate)), where('userId','==', userId));
  const qByDayRangeTs = query(coll, where('day','>=', Timestamp.fromDate(startDate)), where('day','<', Timestamp.fromDate(endDate)), where('userId','==', userId));

  let lastA: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastB: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastC: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastD: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastE: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastF: Record<string, HoursEntryDoc & { _docId: string }> = {};
  let lastG: Record<string, HoursEntryDoc & { _docId: string }> = {};

  const emit = () => {
    const merged: Record<string, HoursEntryDoc & { _docId: string }> = { ...lastG, ...lastF, ...lastE, ...lastD, ...lastB, ...lastC, ...lastA };
    const rows = Object.values(merged)
      .filter((it)=> {
        const p = (typeof it.period === 'string' && it.period) ? periodVariants(it.period as any).padded : null;
        const dayStr = normalizeDayString((it as any).day);
        const fromDay = dayStr ? derivePeriodFromDay(dayStr) : null;
        const created = (it as any).createdAt && typeof (it as any).createdAt.toDate === 'function' ? (it as any).createdAt.toDate() as Date : null;
        const inCreatedRange = created ? (created >= startDate && created < endDate) : false;
        return (p && p === padded) || (fromDay === padded) || inCreatedRange;
      })
      .map((raw) => {
        const created = (raw as any).createdAt && typeof (raw as any).createdAt.toDate === 'function' ? (raw as any).createdAt.toDate() as Date : null;
        const createdStr = created ? `${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,'0')}-${String(created.getDate()).padStart(2,'0')}` : '';
        const dayStr = normalizeDayString((raw as any).day) || createdStr || String((raw as any).day || '');
        const periodFromDay = derivePeriodFromDay(dayStr);
        const declaredPeriod = typeof raw.period === 'string' && raw.period ? periodVariants(raw.period).padded : '';
        const safePeriod = periodFromDay || declaredPeriod || padded;
        return { ...(raw as any), day: dayStr, period: safePeriod } as HoursEntryDoc & { _docId: string };
      })
      .sort((a,b)=> a.day.localeCompare(b.day));
    try {
      console.debug('[hoursService] emit:mine', {
        period,
        userId,
        counts: {
          byPeriod: Object.keys(lastA).length,
          byPeriodAlt: Object.keys(lastC).length,
          byDayRange: Object.keys(lastB).length,
          byYearRange: Object.keys(lastD).length,
          byCreatedAt: Object.keys(lastE).length,
          byDayRangeTs: Object.keys(lastF).length,
          all: Object.keys(lastG).length,
          merged: rows.length,
        },
      });
    } catch {}
    cb(rows);
  };

  const unsubA = onSnapshot(qByPeriod, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastA = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeMyEntriesByPeriod (period) error', err);
    lastA = {};
    emit();
  });

  const unsubAlt = qByPeriodAlt ? onSnapshot(qByPeriodAlt, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastC = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeMyEntriesByPeriod (period alt) error', err);
    lastC = {};
    emit();
  }) : null;

  const unsubB = onSnapshot(qByDayRange, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastB = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeMyEntriesByPeriod (day range) error', err);
    lastB = {};
    emit();
  });

  const unsubD = onSnapshot(qByYearRange, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastD = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeMyEntriesByPeriod (year range) error', err);
    lastD = {};
    emit();
  });

  const unsubE = onSnapshot(qByCreatedAt, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastE = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeMyEntriesByPeriod (createdAt range) error', err);
    lastE = {};
    emit();
  });

  const unsubF = onSnapshot(qByDayRangeTs, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastF = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeMyEntriesByPeriod (day range TS) error', err);
    lastF = {};
    emit();
  });

  const unsubG = onSnapshot(coll, (snap)=>{
    const map: Record<string, HoursEntryDoc & { _docId: string }> = {};
    snap.forEach(d => { map[d.id] = { ...(d.data() as any), _docId: d.id }; });
    lastG = map;
    emit();
  }, (err:any)=>{
    console.error('subscribeMyEntriesByPeriod (all coll) error', err);
    lastG = {};
    emit();
  });

  return ()=>{
    try { unsubA && unsubA(); } catch {}
    try { unsubB && unsubB(); } catch {}
    try { unsubAlt && (unsubAlt as any)(); } catch {}
    try { unsubD && unsubD(); } catch {}
    try { unsubE && unsubE(); } catch {}
    try { unsubF && unsubF(); } catch {}
    try { unsubG && unsubG(); } catch {}
  };
}

export async function approveEntry(docId: string) {
  await updateDoc(doc(coll, docId), {
    reviewStatus: EntryReviewStatus.Approved,
    hasDispute: false,
    rejectionNote: null,
  });
}

export async function updateEntryFields(docId: string, fields: Partial<HoursEntryDoc>) {
  await updateDoc(doc(coll, docId), fields as any);
}

export async function deleteEntry(docId: string) {
  await deleteDoc(doc(coll, docId));
}

export async function bulkUpdateEntries(docIds: string[], updates: Partial<HoursEntryDoc>) {
  const targets = Array.from(new Set(docIds.filter(Boolean)));
  if (!targets.length) return;
  const batch = writeBatch(db);
  targets.forEach((id) => {
    batch.update(doc(coll, id), updates as any);
  });
  await batch.commit();
}

// Optional helper for agent side: create or submit an entry
export async function upsertAgentEntry(userId: string, entry: HoursEntryDoc) {
  // This is a simple add; real upsert would query by userId+day and update. Keep for reference.
  await addDoc(coll, { ...entry, userId, createdAt: serverTimestamp() });
}

// Deterministic upsert for agent submission: one doc per (userId, day)
export async function submitAgentEntry(
  userId: string,
  entry: Omit<HoursEntryDoc, 'userId'|'createdAt'|'status'|'reviewStatus'|'period'|'userDisplayName'|'userEmail'|'rejectionNote'> & { period?: string },
  metadata?: { userDisplayName?: string | null; userEmail?: string | null }
) {
  // Compute a safe period 'YYYY-MM' even if day is 'YYYY-M-D'
  let period = entry.period || '';
  if (!period && entry.day) {
    const parts = String(entry.day).split('-');
    if (parts.length >= 2) {
      const y = parts[0];
      const m = String(parseInt(parts[1], 10)).padStart(2,'0');
      period = `${y}-${m}`;
    }
  }
  const payload: HoursEntryDoc = {
    ...entry,
    period,
    userId,
    status: 'submitted',
    reviewStatus: EntryReviewStatus.Pending,
    userDisplayName: metadata?.userDisplayName ?? null,
    userEmail: metadata?.userEmail ?? null,
    rejectionNote: null,
    hasDispute: entry.hasDispute ?? false,
  } as HoursEntryDoc;

  const deterministicId = `${userId}_${payload.day}`;
  await setDoc(doc(coll, deterministicId), { ...payload, createdAt: serverTimestamp() }, { merge: true });
}
