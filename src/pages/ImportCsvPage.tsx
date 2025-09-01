import React, { useRef, useState } from "react";
import salesService from "../services/salesService";
import SidebarLayout from "../components/SidebarLayout";

const ImportCsvPage: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [fileName, setFileName] = useState<string>("");
  const [csvPreview, setCsvPreview] = useState<string>("");
  const [error, setError] = useState<string>("");
  type Result = {
    num: string;
    found: boolean;
    name?: string;
    date?: string;
    offer?: string;
    clientFirstName?: string;
    clientLastName?: string;
    isDuplicate?: boolean;
  };
  const [results, setResults] = useState<Result[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [globalError, setGlobalError] = useState<string>("");

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, results]);

  React.useEffect(() => {
    setLoading(true);
    salesService.getAllSales().then((data) => {
      setSales(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      setGlobalError("Erreur lors du chargement des ventes. Veuillez réessayer plus tard.");
    });
  }, []);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Veuillez sélectionner un fichier CSV.");
      setFileName("");
      setResults([]);
      return;
    }
    setFileName(file.name);
    setError("");
    setResults([]);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      let header: string[] = [];
      let colIdx = -1;
      let nums: string[] = [];
      if (lines.length) {
        header = lines[0].split(/,|;|\t/).map(h => h.trim());
        colIdx = header.findIndex(h => h.toLowerCase().includes('commar') || h.toLowerCase().includes('num') || h.toLowerCase().includes('n°'));
        if (colIdx === -1) colIdx = header.findIndex(h => h.match(/\d+/));
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,|;|\t/);
          let val = cols[colIdx] || '';
          val = val.replace(/"|'|\s/g, '');
          if (val.match(/e\+/i)) {
            const n = Number(val.replace(',', '.'));
            if (!isNaN(n)) val = String(Math.round(n));
          }
          if (val) nums.push(val);
        }
      }
      // Détection des doublons
      const numCounts: Record<string, number> = {};
      nums.forEach(num => {
        numCounts[num] = (numCounts[num] || 0) + 1;
      });
      const res = nums.map(num => {
        const found = sales.find(s => s && s.orderNumber && String(s.orderNumber).replace(/\s/g, '') === num);
        const isDuplicate = numCounts[num] > 1;
        if (found && typeof found === 'object') {
          let formattedDate = '';
          try {
            formattedDate = formatDate(found.date);
          } catch {
            formattedDate = '';
          }
          return {
            num,
            found: true,
            name: found.name || '',
            date: formattedDate,
            offer: found.offer || '',
            clientFirstName: found.clientFirstName || '',
            clientLastName: found.clientLastName || '',
            isDuplicate
          };
        } else {
          return { num, found: false, isDuplicate };
        }
      });
      setResults(Array.isArray(res) ? res : []);
    };
    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier.");
    };
    reader.readAsText(file, "utf-8");
  };

  function formatDate(date: any): string {
    if (!date) return "-";
    if (typeof date === "object" && date.seconds) {
      const d = new Date(date.seconds * 1000);
      return d.toISOString().slice(0, 10);
    }
    if (typeof date === "string" && date.startsWith("Timestamp")) {
      const match = date.match(/seconds=(\d+)/);
      if (match) {
        const d = new Date(Number(match[1]) * 1000);
        return d.toISOString().slice(0, 10);
      }
    }
    if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    return String(date);
  }

  // Filtrage des résultats selon la recherche
  const filteredResults = results.filter(r => {
    const searchLower = search.toLowerCase();
    return (
      r.num.toLowerCase().includes(searchLower) ||
      (r.name && r.name.toLowerCase().includes(searchLower)) ||
      (r.found ? "ok" : "erreur").includes(searchLower)
    );
  });

  return (
    <SidebarLayout>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '32px 16px',
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #f8fafc 60%, #e0f2fe 100%)',
        fontFamily: 'Inter, Arial, sans-serif',
        boxSizing: 'border-box',
        overflowY: 'auto',
        height: '100vh'
      }}>
        {globalError && (
          <div style={{
            color: '#ef4444',
            background: '#fff0f0',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '18px',
            textAlign: 'center',
            fontWeight: 600
          }}>
            {globalError}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <label htmlFor="csv-import" style={{
            background: 'linear-gradient(90deg, #22c55e 80%, #38bdf8 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 700,
            padding: '12px 32px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px #22c55e22',
            marginBottom: '12px',
            letterSpacing: '0.5px',
            transition: 'background 0.2s, box-shadow 0.2s',
            outline: 'none',
            borderTopLeftRadius: '24px',
            borderBottomRightRadius: '24px',
            borderTopRightRadius: '12px',
            borderBottomLeftRadius: '12px',
          }}>
            Importer un fichier CSV
            <input
              id="csv-import"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
          {fileName && (
            <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 500 }}>{fileName}</span>
          )}
          {error && (
            <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px', fontWeight: 600 }}>{error}</div>
          )}
        </div>
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          boxShadow: '0 2px 8px #2222',
          border: '1px solid #e5e7eb',
          padding: '14px 18px',
          marginBottom: '24px',
          textAlign: 'center',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <h3 style={{
            color: '#22c55e',
            fontWeight: 900,
            fontSize: '24px',
            marginBottom: '18px',
            letterSpacing: '0.5px',
            textShadow: '0 2px 8px #22c55e22'
          }}>Synthèse de l'import</h3>
          {results.length === 0 ? (
            <div style={{ color: '#888', fontSize: '16px' }}>Aucun fichier importé.<br />Importez un CSV pour voir la synthèse.</div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '8px' }}>
              {/* OK */}
              <div style={{
                background: '#e7fbe7',
                borderRadius: '12px',
                padding: '12px 16px',
                minWidth: '120px',
                boxShadow: '0 4px 12px #22c55e22',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid #22c55e'
              }}>
                <span style={{ fontSize: '28px', color: '#22c55e', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#22c55e"/><text x="12" y="17" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Arial" fontWeight="bold">✔</text></svg>
                </span>
                <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '18px' }}>{results.filter(r => r.found && !r.isDuplicate).length}</span>
                <span style={{ color: '#22c55e', fontSize: '15px', fontWeight: 500 }}>Vente(s) OK</span>
              </div>
              {/* Agent non renseigné */}
              <div style={{
                background: '#fde7e7',
                borderRadius: '12px',
                padding: '12px 16px',
                minWidth: '120px',
                boxShadow: '0 4px 12px #ef444422',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid #ef4444'
              }}>
                <span style={{ fontSize: '28px', color: '#ef4444', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#ef4444"/><text x="12" y="17" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Arial" fontWeight="bold">👤</text></svg>
                </span>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '18px' }}>{results.filter(r => !r.found && r.name).length}</span>
                <span style={{ color: '#ef4444', fontSize: '15px', fontWeight: 500 }}>Agent non renseigné</span>
              </div>
              {/* Arsip non renseigné */}
              <div style={{
                background: '#fde7e7',
                borderRadius: '12px',
                padding: '12px 16px',
                minWidth: '120px',
                boxShadow: '0 4px 12px #ef444422',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid #ef4444'
              }}>
                <span style={{ fontSize: '28px', color: '#ef4444', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#ef4444"/><text x="12" y="17" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Arial" fontWeight="bold">📦</text></svg>
                </span>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '18px' }}>{results.filter(r => !r.found && !r.name).length}</span>
                <span style={{ color: '#ef4444', fontSize: '15px', fontWeight: 500 }}>Arsip non renseigné</span>
              </div>
              {/* Non attribuée */}
              <div style={{
                background: '#fde7e7',
                borderRadius: '12px',
                padding: '12px 16px',
                minWidth: '120px',
                boxShadow: '0 4px 12px #ef444422',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid #ef4444'
              }}>
                <span style={{ fontSize: '28px', color: '#ef4444', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#ef4444"/><text x="12" y="17" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Arial" fontWeight="bold">?</text></svg>
                </span>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '18px' }}>{results.filter(r => r.found && !r.name).length}</span>
                <span style={{ color: '#ef4444', fontSize: '15px', fontWeight: 500 }}>Non attribuée</span>
              </div>
              {/* Doublons */}
              <div style={{
                background: '#ffedd5',
                borderRadius: '12px',
                padding: '12px 16px',
                minWidth: '120px',
                boxShadow: '0 2px 8px #fb923c44',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid #fb923c'
              }}>
                <span style={{ color: '#fb923c', fontWeight: 700, fontSize: '18px' }}>{results.filter(r => r.isDuplicate).length}</span>
                <span style={{ color: '#fb923c', fontSize: '15px', fontWeight: 500 }}>Doublon(s) détecté(s)</span>
              </div>
            </div>
          )}
        </div>
        <div style={{
          background: '#23272f',
          borderRadius: '14px',
          boxShadow: '0 2px 12px #2228',
          border: '1px solid #22c55e',
          padding: '0',
          overflow: 'hidden',
          marginBottom: '32px'
        }}>
          <div style={{
            padding: '24px 32px 0 32px',
            borderBottom: '1px solid #22c55e',
            background: 'linear-gradient(90deg, #23272f 80%, #22c55e 100%)',
            borderTopLeftRadius: '14px',
            borderTopRightRadius: '14px',
            position: 'sticky',
            top: 0,
            zIndex: 2
          }}>
            <h4 style={{ color: '#22c55e', fontWeight: 800, fontSize: '20px', marginBottom: '0' }}>Résultats détaillés</h4>
            {/* Barre de recherche intégrée au tableau */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '18px 0 0 0' }}>
              <input
                type="text"
                placeholder="Filtrer par N° panier, vendeur ou statut..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #22c55e',
                  fontSize: '15px',
                  width: '100%',
                  maxWidth: '320px',
                  outline: 'none',
                  boxShadow: '0 2px 8px #22c55e22',
                  background: '#23272f',
                  color: '#e2e8f0',
                }}
              />
            </div>
          </div>
          <div style={{
            overflowX: 'auto',
            padding: '0 32px 24px 32px',
            maxHeight: '420px',
            overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#22c55e', fontSize: '18px', padding: '32px' }}>Chargement des ventes...</div>
            ) : !sales || sales.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '17px', padding: '32px' }}>Aucune vente chargée. Impossible d'afficher les résultats.</div>
            ) : (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '15px',
                fontFamily: 'Inter, Arial, sans-serif',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(90deg, #22c55e 80%, #38bdf8 100%)',
                    color: '#fff',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}>
                    <th style={{ padding: '14px', border: 'none', fontWeight: 800, fontSize: '16px', textAlign: 'left', borderTopLeftRadius: '10px' }}>N° Panier</th>
                    <th style={{ padding: '14px', border: 'none', fontWeight: 800, fontSize: '16px', textAlign: 'left' }}>Vendeur</th>
                    <th style={{ padding: '14px', border: 'none', fontWeight: 800, fontSize: '16px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '14px', border: 'none', fontWeight: 800, fontSize: '16px', textAlign: 'left' }}>Statut</th>
                    <th style={{ padding: '14px', border: 'none', fontWeight: 800, fontSize: '16px', textAlign: 'left', borderTopRightRadius: '10px' }}>Erreur</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '24px', fontSize: '16px' }}>Aucun résultat</td>
                    </tr>
                  ) : (
                    filteredResults.map((r, idx) => (
                      <tr key={r.num} style={{
                        background: r.isDuplicate ? '#ffedd5' : (idx % 2 === 0 ? '#23272f' : '#2c2f38'),
                        color: r.isDuplicate ? '#fb923c' : (r.found ? '#e2e8f0' : '#ef4444'),
                        fontWeight: r.found ? 500 : 700,
                        transition: 'background 0.2s'
                      }}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #2c2f38' }}>{r.num}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #2c2f38' }}>{r.name || '-'}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #2c2f38' }}>{r.date ? r.date : '-'}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #2c2f38' }}>{r.found ? (r.isDuplicate ? '⚠ Doublon' : '✔ OK') : '✖ Erreur'}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #2c2f38' }}>
                          {r.isDuplicate
                            ? 'Doublon détecté'
                            : (!r.found
                              ? (!r.name ? "Non renseignée par l'Arsip" : "Non renseignée par l'agent")
                              : (r.found && !r.name ? "Non attribuée à un agent" : '')
                            )
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default ImportCsvPage;