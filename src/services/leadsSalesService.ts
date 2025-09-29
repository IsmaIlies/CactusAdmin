import {
  collection,
  getDocs,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { categorize as baseCategorize, SaleCategoryFlags } from "./salesService";

export type NormalizedProvider = "hipto" | "dolead" | "mars marketing";

export interface LeadsSalesCategoryCounts {
  internet: number;
  mobile: number;
  internetSosh: number;
  mobileSosh: number;
}

export type LeadsSalesDailyBreakdown = Record<NormalizedProvider, LeadsSalesCategoryCounts>;

export interface LeadsSaleRecord {
  id: string;
  providerDisplay: string;
  providerNormalized: NormalizedProvider | null;
  typeOffreRaw: string;
  typeOffreNormalized: string;
  categoryFlags: SaleCategoryFlags;
  productDisplay: string;
  isToday: boolean;
  date: Date | null;
  raw: Record<string, any>;
}

type CategoryKey = keyof LeadsSalesCategoryCounts;

export const PROVIDERS_ORDER: NormalizedProvider[] = ["hipto", "dolead", "mars marketing"];

export const createEmptyCounts = (): LeadsSalesCategoryCounts => ({
  internet: 0,
  mobile: 0,
  internetSosh: 0,
  mobileSosh: 0,
});

export const createEmptyBreakdown = (): LeadsSalesDailyBreakdown => ({
  hipto: createEmptyCounts(),
  dolead: createEmptyCounts(),
  "mars marketing": createEmptyCounts(),
});

export const leadsCollectionRef = collection(db, "leads_sales");

const parseDate = (value: any): Date | null => {
  if (!value) return null;

  const tryParse = (input: any): Date | null => {
    if (!input) return null;
    if (input instanceof Date) return input;
    if (input.toDate && typeof input.toDate === "function") {
      return input.toDate();
    }
    if (typeof input === "number") {
      const parsed = new Date(input);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof input === "string") {
      const normalized = input.replace(/\//g, "-");
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
      const match = normalized.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
      if (match) {
        const [, dd, mm, yyyy, hh = "00", min = "00"] = match;
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
      }
    }
    return null;
  };

  if (Array.isArray(value)) {
    for (const candidate of value) {
      const parsed = tryParse(candidate);
      if (parsed) return parsed;
    }
    return null;
  }

  return tryParse(value);
};

const isTodayDate = (date: Date | null): boolean => {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export const providerFields = [
  "origineLead",
  "originLead",
  "leadOrigin",
  "lead_provider",
  "provider",
  "origin",
  "origine",
  "source",
  "campaign",
  "vendor",
  "lead_source",
  "leadSource",
];

const productFields = [
  "typeOffre",
  "productType",
  "product_type",
  "offer",
  "offre",
  "product",
  "category",
  "type",
  "type_produit",
  "formule",
];

const dateFields = [
  "date",
  "createdAt",
  "created_at",
  "timestamp",
  "ts",
  "created",
  "createdOn",
  "created_on",
];

const providerRawValue = (data: Record<string, any>): string => {
  for (const key of providerFields) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }
  return "";
};

const productRawValue = (data: Record<string, any>): string => {
  for (const key of productFields) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }
  return "";
};

export const normalizeProvider = (
  origineLeadRaw: string | null | undefined
): NormalizedProvider | null => {
  if (!origineLeadRaw) return null;
  const trimmed = origineLeadRaw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const collapsed = lower.replace(/\s+/g, "");

  if (lower.includes("hipto")) return "hipto";
  if (lower.includes("dolead")) return "dolead";
  if (lower.includes("mars")) return "mars marketing";
  if (collapsed === "mm") return "mars marketing";
  return null;
};

export const categorize = (typeOffreRaw: string | null | undefined): SaleCategoryFlags => {
  const base: SaleCategoryFlags = {
    internet: 0,
    mobile: 0,
    internetSosh: 0,
    mobileSosh: 0,
  };
  if (!typeOffreRaw) return base;
  const normalized = typeOffreRaw.trim().toLowerCase();
  if (!normalized) return base;
  const compact = normalized.replace(/\s+/g, "");

  switch (compact) {
    case "mobile":
      return { ...base, mobile: 1 };
    case "internet":
      return { ...base, internet: 1 };
    case "internetsosh":
      return { ...base, internetSosh: 1 };
    case "mobilesosh":
      return { ...base, mobileSosh: 1 };
    case "internet+mobile":
      return { ...base, internet: 1, mobile: 1 };
    case "internetsosh+mobilesosh":
      return { ...base, internetSosh: 1, mobileSosh: 1 };
    default:
      return base;
  }
};

const productLabel = (key: CategoryKey): string => {
  switch (key) {
    case "internet":
      return "Internet";
    case "mobile":
      return "Mobile";
    case "internetSosh":
      return "Internet Sosh";
    case "mobileSosh":
      return "Mobile Sosh";
    default:
      return key;
  }
};

const computeBreakdownFromSnapshot = (
  snapshot: QuerySnapshot<DocumentData>
): LeadsSalesDailyBreakdown => {
  const breakdown = createEmptyBreakdown();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const saleDate = dateFields.map((field) => data[field]).filter(Boolean);
    if (!isToday(saleDate)) return;

    const provider = normalizeProvider(providerRawValue(data));
    if (!provider) return;

    const categoryFlags = categorize(data.typeOffre);
    breakdown[provider].internet += categoryFlags.internet;
    breakdown[provider].mobile += categoryFlags.mobile;
    breakdown[provider].internetSosh += categoryFlags.internetSosh;
    breakdown[provider].mobileSosh += categoryFlags.mobileSosh;
  });

  return breakdown;
};

const extractRecordsFromSnapshot = (
  snapshot: QuerySnapshot<DocumentData>
): LeadsSaleRecord[] => {
  const records: LeadsSaleRecord[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const rawProvider = providerRawValue(data);
    const providerNormalized = normalizeProvider(rawProvider);
    const providerDisplay = providerNormalized
      ? providerNormalized
          .split(" ")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : rawProvider || "—";

    const typeOffreRaw = typeof data.typeOffre === "string" ? data.typeOffre : "";
    const typeOffreNormalized = typeOffreRaw.trim().toLowerCase();
    const categoryFlags = categorize(typeOffreRaw);

    const dateCandidates = dateFields.map((field) => data[field]).filter(Boolean);
    const date = parseDate(dateCandidates);

    records.push({
      id: docSnap.id,
      providerDisplay,
      providerNormalized,
      typeOffreRaw,
      typeOffreNormalized,
      categoryFlags,
      productDisplay: typeOffreRaw || productLabel("internet"),
      isToday: isTodayDate(date),
      date,
      raw: data,
    });
  });

  return records.sort((a, b) => {
    const aTime = a.date ? a.date.getTime() : 0;
    const bTime = b.date ? b.date.getTime() : 0;
    return bTime - aTime;
  });
};

const leadsSalesService = {
  createEmptyBreakdown,
  async getTodayBreakdown(): Promise<LeadsSalesDailyBreakdown> {
    const snapshot = await getDocs(leadsCollectionRef);
    return computeBreakdownFromSnapshot(snapshot);
  },
  subscribeToTodayBreakdown(
    onData: (data: LeadsSalesDailyBreakdown) => void,
    onError?: (error: Error) => void
  ) {
    return onSnapshot(
      leadsCollectionRef,
      (snapshot) => {
        onData(computeBreakdownFromSnapshot(snapshot));
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },
  subscribeToSalesRecords(
    onData: (records: LeadsSaleRecord[]) => void,
    onError?: (error: Error) => void
  ) {
    return onSnapshot(
      leadsCollectionRef,
      (snapshot) => {
        onData(extractRecordsFromSnapshot(snapshot));
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  },
};

export default leadsSalesService;

export const NORMALIZE_PROVIDER_TEST_CASES: Array<[
  string,
  NormalizedProvider | null
]> = [
  ["hipto", "hipto"],
  [" HIPTO  ", "hipto"],
  ["dolead", "dolead"],
  ["DoLead", "dolead"],
  ["mars marketing", "mars marketing"],
  ["MM", "mars marketing"],
  ["unknown", null],
];

export const CATEGORIZE_TEST_CASES: Array<[string, SaleCategoryFlags]> = [
  ["mobile", { internet: 0, mobile: 1, internetSosh: 0, mobileSosh: 0 }],
  ["internet", { internet: 1, mobile: 0, internetSosh: 0, mobileSosh: 0 }],
  ["internet sosh", { internet: 0, mobile: 0, internetSosh: 1, mobileSosh: 0 }],
  ["mobile sosh", { internet: 0, mobile: 0, internetSosh: 0, mobileSosh: 1 }],
  ["internet + mobile", { internet: 1, mobile: 1, internetSosh: 0, mobileSosh: 0 }],
  ["internetsosh + mobilesosh", { internet: 0, mobile: 0, internetSosh: 1, mobileSosh: 1 }],
  ["AUTRES", { internet: 0, mobile: 0, internetSosh: 0, mobileSosh: 0 }],
  ["  Mobile  ", { internet: 0, mobile: 1, internetSosh: 0, mobileSosh: 0 }],
];
