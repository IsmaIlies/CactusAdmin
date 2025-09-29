import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  Query,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";

export type LeadOrderProvider = "hipto" | "dolead";

export interface LeadOrderInput {
  date: Date;
  provider: LeadOrderProvider;
  quantity: number;
}

export interface LeadsOrderRecord {
  id: string;
  provider: LeadOrderProvider | null;
  providerLabel: string;
  quantity: number;
  date: Date | null;
  createdAt: Date | null;
  raw: Record<string, unknown>;
}

const NEW_COLLECTION = "leads_order";
const LEGACY_COLLECTION = "leads_orders";

const providerLabelMap: Record<LeadOrderProvider, string> = {
  hipto: "Hipto",
  dolead: "Dolead",
};

const newCollectionRef = collection(db, NEW_COLLECTION);
const legacyCollectionRef = collection(db, LEGACY_COLLECTION);

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && (value as any).toDate) {
    try {
      return (value as any).toDate();
    } catch (error) {
      console.error("Unable to parse date", error);
      return null;
    }
  }
  return null;
};

const mapSnapshot = (
  snapshot: QuerySnapshot<DocumentData>,
  source: "new" | "legacy"
): LeadsOrderRecord[] => {
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const rawProvider = data.provider?.toString().toLowerCase().trim();
    const provider: LeadOrderProvider | null =
      rawProvider === "hipto" || rawProvider === "dolead" ? rawProvider : null;
    const parsedQuantity = Number(data.quantity);
    const dateValue = parseDate(
      data.date ?? data.orderDate ?? data.commandedAt ?? data.createdAt ?? null
    );

    return {
      id: `${source}:${docSnapshot.id}`,
      provider,
      providerLabel: provider ? providerLabelMap[provider] : rawProvider ?? "",
      quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
      date: dateValue,
      createdAt: parseDate(data.createdAt ?? data.date ?? null),
      raw: data,
    };
  });
};

const mergeAndSortRecords = (
  primary: LeadsOrderRecord[],
  secondary: LeadsOrderRecord[]
): LeadsOrderRecord[] => {
  return [...primary, ...secondary].sort((a, b) => {
    const aTime = a.date ? a.date.getTime() : 0;
    const bTime = b.date ? b.date.getTime() : 0;
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return (b.createdAt ? b.createdAt.getTime() : 0) - (a.createdAt ? a.createdAt.getTime() : 0);
  });
};

export const subscribeToLeadOrders = (
  onData: (records: LeadsOrderRecord[]) => void,
  onError: (error: unknown) => void
): Unsubscribe => {
  const subscriptions: Unsubscribe[] = [];
  let newRecords: LeadsOrderRecord[] = [];
  let legacyRecords: LeadsOrderRecord[] = [];

  const emit = () => {
    onData(mergeAndSortRecords(newRecords, legacyRecords));
  };

  const subscribe = (queryRef: Query<DocumentData>, source: "new" | "legacy") => {
    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        const mapped = mapSnapshot(snapshot, source);
        if (source === "new") {
          newRecords = mapped;
        } else {
          legacyRecords = mapped;
        }
        emit();
      },
      (error) => {
        console.error(`Erreur Firestore leads orders (${source})`, error);
        onError(error);
      }
    );
    subscriptions.push(unsubscribe);
  };

  const newQuery = query(newCollectionRef);
  const legacyQuery = query(legacyCollectionRef);

  subscribe(newQuery, "new");
  subscribe(legacyQuery, "legacy");

  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
};

export const addLeadOrders = async (inputs: LeadOrderInput[]): Promise<void> => {
  const validInputs = inputs.filter((input) => input.quantity > 0);
  if (!validInputs.length) {
    return;
  }
  const createDocs = (targetCollection: typeof newCollectionRef | typeof legacyCollectionRef) =>
    Promise.all(
      validInputs.map((input) =>
        addDoc(targetCollection, {
          provider: input.provider,
          quantity: input.quantity,
          date: Timestamp.fromDate(input.date),
          createdAt: serverTimestamp(),
        })
      )
    );

  try {
    await createDocs(newCollectionRef);
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      await createDocs(legacyCollectionRef);
      return;
    }
    throw error;
  }
};

export const providerOptions: Array<{ value: LeadOrderProvider; label: string }> = [
  { value: "hipto", label: providerLabelMap.hipto },
  { value: "dolead", label: providerLabelMap.dolead },
];

export const PROVIDERS: LeadOrderProvider[] = providerOptions.map((option) => option.value);
