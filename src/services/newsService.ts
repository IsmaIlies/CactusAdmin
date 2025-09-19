import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, DocumentData, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

export interface NewsItem {
  id?: string;
  title: string;
  url: string;
  path?: string; // storage path (e.g., news/123-file.pdf)
  createdAt?: any;
}

const COLLECTION = 'news';

export async function uploadNewsPdf(file: File, title?: string): Promise<NewsItem> {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const path = `news/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/pdf' });
  const url = await getDownloadURL(storageRef);

  const docRef = await addDoc(collection(db, COLLECTION), {
    title: title?.trim() || file.name.replace(/\.pdf$/i, ''),
    url,
    path,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, title: title || file.name, url, path };
}

export function listenNews(callback: (items: NewsItem[]) => void) {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: NewsItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) } as NewsItem));
    callback(items);
  });
}

export async function getNewsOnce(): Promise<NewsItem[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) } as NewsItem));
}

export async function deleteNewsItem(item: NewsItem): Promise<void> {
  if (!item.id) return;
  // Delete Firestore doc first (or last). We'll attempt storage deletion regardless.
  await deleteDoc(doc(db, COLLECTION, item.id));
  try {
    if (item.path) {
      await deleteObject(ref(storage, item.path));
    } else if (item.url) {
      // Fallback: delete by URL if path not stored
      await deleteObject(ref(storage, item.url));
    }
  } catch (e) {
    // If the file is already missing or URL invalid, ignore
    console.warn('Delete storage object warning:', e);
  }
}

const newsService = { uploadNewsPdf, listenNews, getNewsOnce, deleteNewsItem };
export default newsService;
