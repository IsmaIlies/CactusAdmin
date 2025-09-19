import { collection, doc, getDocs, limit, orderBy, query, setDoc, Timestamp, startAt, endAt } from 'firebase/firestore';
import { db } from '../firebase';

const COLL = 'recaps';

export interface RecapEntry {
  id: string; // yyyy-mm-dd
  createdAt: Timestamp;
  subject: string;
  recipients: string[];
  ccRecipients?: string[];
  encadrants: string[];
  metrics: {
    salesConfirmed: number;
    mailsSent: number;
    absence: number;
    conges: number;
    retard: number;
    sanction: number;
    demission: number;
    presentCount: number;
    absentCount: number;
    unmarkedCount: number;
    totalSalesOfDay: number;
  };
  presence: {
    present: string[];
    absent: string[];
    unmarked: string[];
  };
  salesBySeller: Array<{ name: string; count: number }>;
}

const toId = (d: Date) => d.toISOString().slice(0,10); // yyyy-mm-dd

export default {
  async add(entry: Omit<RecapEntry, 'id' | 'createdAt'> & { id?: string }): Promise<void> {
    const id = entry.id || toId(new Date());
    const ref = doc(db, COLL, id);
    await setDoc(ref, { ...entry, id, createdAt: Timestamp.now() }, { merge: true });
  },
  async getRecent(max: number = 30): Promise<RecapEntry[]> {
    const q = query(collection(db, COLL), orderBy('createdAt','desc'), limit(max));
    const snap = await getDocs(q);
    const out: RecapEntry[] = [];
    snap.forEach(d => out.push(d.data() as RecapEntry));
    return out;
  }
  ,
  async getByDateRange(start: Date, end: Date): Promise<RecapEntry[]> {
    // Utilise createdAt pour le filtrage
    const q = query(
      collection(db, COLL),
      orderBy('createdAt','asc'),
      startAt(Timestamp.fromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0,0,0))),
      endAt(Timestamp.fromDate(new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23,59,59)))
    );
    const snap = await getDocs(q);
    const out: RecapEntry[] = [];
    snap.forEach(d => out.push(d.data() as RecapEntry));
    return out;
  }
};
