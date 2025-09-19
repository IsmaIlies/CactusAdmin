import { useMemo, useState } from "react";
import { X, Search, Star, StarOff, Filter } from "lucide-react";

export type CallClosure = {
  code: string;
  description: string;
  type: "CA+" | "CA-" | "CNAI" | "CALL" | "AUTRE";
};

interface Props {
  open: boolean;
  onClose: () => void;
  closures: CallClosure[];
}

const typeColors: Record<CallClosure["type"], string> = {
  "CA+": "bg-green-100 text-green-700 ring-green-200",
  "CA-": "bg-red-100 text-red-700 ring-red-200",
  CNAI: "bg-amber-100 text-amber-800 ring-amber-200",
  CALL: "bg-blue-100 text-blue-700 ring-blue-200",
  AUTRE: "bg-gray-100 text-gray-700 ring-gray-200",
};

export default function CallClosuresPanel({ open, onClose, closures }: Props) {
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<CallClosure["type"][]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleType = (t: CallClosure["type"]) => {
    setActiveTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = closures.filter((c) => {
      const matchesQ = !q || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      const matchesT = activeTypes.length === 0 || activeTypes.includes(c.type);
      return matchesQ && matchesT;
    });
    // Favorites on top, then by code
    arr = arr.sort((a, b) => {
      const fa = favorites[a.code] ? 1 : 0;
      const fb = favorites[b.code] ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return a.code.localeCompare(b.code);
    });
    return arr;
  }, [closures, query, activeTypes, favorites]);

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Clôtures d'appel"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Clôtures d’appel</h2>
            <p className="text-xs text-gray-500">Référentiel des statuts d’appel (codes + descriptions)</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" aria-label="Fermer">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tools */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher code ou description…"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500 outline-none text-sm"
              />
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Filter className="w-3 h-3" /> Filtres</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["CA+", "CA-", "CNAI", "CALL", "AUTRE"] as CallClosure["type"][]).map((t) => {
              const active = activeTypes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ring-1 ${typeColors[t]} ${active ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                >
                  {t}
                </button>
              );
            })}
            {activeTypes.length > 0 && (
              <button onClick={() => setActiveTypes([])} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ring-1 ring-gray-200">
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto h-[calc(100%-140px)]">
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-500">Aucun résultat.</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((c) => (
                <li key={c.code} className="group bg-white rounded-lg border border-gray-200 hover:border-cactus-300 shadow-sm hover:shadow transition-all">
                  <div className="p-3 flex items-start gap-3">
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded border border-gray-200 min-w-[64px] text-center">{c.code}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${typeColors[c.type]}`}>{c.type}</span>
                        {favorites[c.code] ? (
                          <button className="ml-1 p-1 text-yellow-600 hover:text-yellow-700" onClick={() => setFavorites((f) => ({ ...f, [c.code]: false }))} aria-label="Retirer des favoris">
                            <Star className="w-4 h-4 fill-yellow-500" />
                          </button>
                        ) : (
                          <button className="ml-1 p-1 text-gray-400 hover:text-yellow-600" onClick={() => setFavorites((f) => ({ ...f, [c.code]: true }))} aria-label="Ajouter aux favoris">
                            <StarOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-snug">{c.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
