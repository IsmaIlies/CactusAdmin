import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const COLL = 'teleacteurs';

const normalizeId = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export default {
  normalizeId,
  async getAll(): Promise<string[]> {
    const snap = await getDocs(collection(db, COLL));
    const names: string[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (data && typeof data.name === 'string' && data.name.trim()) {
        names.push(data.name);
      }
    });
    // Tri alpha simple
    names.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    return names;
  },
  async add(name: string): Promise<void> {
    const n = name.trim();
    if (!n) return;
    const id = normalizeId(n);
    const ref = doc(db, COLL, id);
    await setDoc(ref, { name: n, createdAt: Timestamp.now() }, { merge: true });
  },
  async remove(name: string): Promise<void> {
    const id = normalizeId(name.trim());
    const ref = doc(db, COLL, id);
    await deleteDoc(ref);
  },
  async bulkAdd(names: string[]): Promise<void> {
    const tasks = names.map(async (name) => {
      const n = (name || '').trim();
      if (!n) return;
      const id = normalizeId(n);
      const ref = doc(db, COLL, id);
      await setDoc(ref, { name: n, createdAt: Timestamp.now() }, { merge: true });
    });
    await Promise.all(tasks);
  },
};
