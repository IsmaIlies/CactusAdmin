import { LeadsSaleRecord } from "../../services/leadsSalesService";

interface LeadsSalesTableModuleProps {
  sales: LeadsSaleRecord[];
  isLoading: boolean;
}

const formatDateTime = (date: Date | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const firstNameFields = [
  "prenom",
  "firstName",
  "firstname",
  "first_name",
  "prénom",
];

const agentFields = [
  "agent",
  "agentName",
  "agent_name",
  "seller",
  "vendeur",
  "commercial",
  "teleacteur",
  "tele_acteur",
  "owner",
  "assignedTo",
  "assigned_to",
];

const normalizeFirstName = (raw: string): string => {
  const parts = raw
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "-";
  const first = parts[0];
  if (!first) return "-";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

const extractAgentName = (record: LeadsSaleRecord): string => {
  for (const field of firstNameFields) {
    const value = record.raw[field];
    if (typeof value === "string" && value.trim()) {
      return normalizeFirstName(value);
    }
  }

  for (const field of agentFields) {
    const value = record.raw[field];
    if (typeof value === "string" && value.trim()) {
      return normalizeFirstName(value);
    }
  }
  // fallback: look for any string value containing "agent" or "vendeur"
  const candidate = Object.entries(record.raw).find(([key, value]) => {
    if (typeof value !== "string") return false;
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("agent") || lowerKey.includes("vendeur") || lowerKey.includes("seller")) {
      return value.trim().length > 0;
    }
    return false;
  });
  if (candidate && typeof candidate[1] === "string") {
    return normalizeFirstName(candidate[1]);
  }
  return "-";
};

const LeadsSalesTableModule: React.FC<LeadsSalesTableModuleProps> = ({ sales, isLoading }) => {
  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white/8 p-6 text-blue-100/80 backdrop-blur">
        <div className="mb-4 h-6 w-1/4 animate-pulse rounded bg-white/15" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="h-10 w-1/6 animate-pulse rounded bg-white/10" />
              <div className="h-10 flex-1 animate-pulse rounded bg-white/10" />
              <div className="h-10 w-1/5 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!sales.length) {
    return (
      <div className="rounded-3xl bg-white/8 p-6 text-blue-100/75 backdrop-blur">
        <p>Aucune vente enregistrée dans Firestore pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white/8 text-blue-100/80 shadow-[0_22px_50px_rgba(3,24,93,0.35)] backdrop-blur">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/10 text-xs uppercase tracking-wider text-blue-100/70">
          <tr>
            <th className="px-6 py-4 font-semibold">Source</th>
            <th className="px-6 py-4 font-semibold">Produit</th>
            <th className="px-6 py-4 font-semibold">Date</th>
            <th className="px-6 py-4 font-semibold">Agent</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr
              key={sale.id}
              className={`border-t border-white/10 ${sale.isToday ? "bg-white/5" : "bg-transparent"}`}
            >
              <td className="px-6 py-4 text-white/90">{sale.providerDisplay}</td>
              <td className="px-6 py-4">{sale.productDisplay}</td>
              <td className="px-6 py-4 text-white/80">{formatDateTime(sale.date)}</td>
              <td className="px-6 py-4 text-white/85">{extractAgentName(sale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadsSalesTableModule;
