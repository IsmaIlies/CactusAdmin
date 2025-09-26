import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, getDocs, DocumentData } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage, auth } from '../firebase';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  storagePath: string; // e.g. news-pdf/123-file.pdf
  createdAt: any;
  createdBy?: string | null;
}

const coll = collection(db, 'news');

function slugify(name: string) {
  return name
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .toLowerCase();
}

export function listenNews(onUpdate: (items: NewsItem[]) => void) {
  const q = query(coll, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) } as any)) as NewsItem[];
    onUpdate(items);
  }, (err) => {
    console.error('listenNews error', err);
    onUpdate([]);
  });
}

export async function uploadNewsPdf(file: File, title?: string) {
  // Rafraîchir le token pour éviter certains 403 liés au jeton expiré
  try { await auth.currentUser?.getIdToken(true); } catch {}

  const clean = slugify(file.name);
  // IMPORTANT: utiliser 'news-pdf' (aligné sur vos règles Storage)
  const path = `news-pdf/${Date.now()}-${clean}`;
  const r = ref(storage, path);

  await uploadBytes(r, file, {
    contentType: 'application/pdf',
    contentDisposition: `inline; filename="${file.name.replace(/"/g, '')}"`,
    cacheControl: 'public, max-age=3600'
  } as any);

  const url = await getDownloadURL(r);

  await addDoc(coll, {
    title: title || file.name,
    url,
    storagePath: path,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid ?? null,
  });
}

export async function deleteNewsItem(item: NewsItem) {
  if (item.storagePath) {
    try { await deleteObject(ref(storage, item.storagePath)); } catch {}
  } else if (item.url) {
    // Fallback au cas où l'ancien schéma est encore présent
    try { await deleteObject(ref(storage, item.url)); } catch {}
  }
  await deleteDoc(doc(db, 'news', item.id));
}

export async function getNewsOnce(): Promise<NewsItem[]> {
  const q = query(coll, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) } as any)) as NewsItem[];
}

const newsService = { listenNews, uploadNewsPdf, deleteNewsItem };
export default newsService;
