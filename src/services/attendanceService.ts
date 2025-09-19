import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  present: string[]; // userIds
  absent: string[]; // userIds
  updatedAt: string; // ISO
  updatedBy?: string;
}

const COLLECTION = 'attendance';

function getDateDocRef(date: string) {
  return doc(collection(db, COLLECTION), date);
}

export async function getAttendance(date: string): Promise<AttendanceRecord | null> {
  const ref = getDateDocRef(date);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as AttendanceRecord;
}

export async function saveAttendance(date: string, present: string[], absent: string[], userId?: string) {
  const ref = getDateDocRef(date);
  const record: AttendanceRecord = {
    date,
    present: [...new Set(present)].sort(),
    absent: [...new Set(absent)].sort(),
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
  await setDoc(ref, record, { merge: true });
  return record;
}

export async function toggleAttendance(date: string, userId: string, isPresent: boolean, editorId?: string) {
  const current = (await getAttendance(date)) || { date, present: [], absent: [], updatedAt: '', updatedBy: '' };
  let present = new Set(current.present);
  let absent = new Set(current.absent);
  if (isPresent) {
    present.add(userId); absent.delete(userId);
  } else {
    absent.add(userId); present.delete(userId);
  }
  return saveAttendance(date, Array.from(present), Array.from(absent), editorId);
}

export function buildAttendanceSummaryHtml(date: string, present: {name: string}[], absent: {name: string}[]) {
  return `<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><title>Pointage ${date}</title></head><body style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">
  <h2 style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:6px;">Feuille de présence – ${date}</h2>
  <h3>Présents (${present.length})</h3>
  <ul>${present.map(p=>`<li>${p.name}</li>`).join('') || '<li>Aucun</li>'}</ul>
  <h3>Absents (${absent.length})</h3>
  <ul>${absent.map(a=>`<li>${a.name}</li>`).join('') || '<li>Aucun</li>'}</ul>
  <p style="margin-top:24px;font-size:12px;color:#666;">Email automatique généré par Cactus.</p>
</body></html>`;
}

const attendanceService = { getAttendance, saveAttendance, toggleAttendance, buildAttendanceSummaryHtml };
export default attendanceService;
