import React, { useState, useMemo } from 'react';
import { Send, CheckSquare, Users, Search, BarChart3, Clock } from 'lucide-react';
import salesService from '../../services/salesService';
import teleacteursService from '../../services/teleacteursService';
import recapService, { RecapEntry } from '../../services/recapService';
import { getWeekRange, getMonthRange } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { collection as fsCollection, limit as fsLimit, onSnapshot, orderBy as fsOrderBy, query as fsQuery } from 'firebase/firestore';
import { db } from '../../firebase';

// Liste de base pour initialiser Firestore si vide (semence unique)
const DEFAULT_TELEACTEURS = [
  'Dylan', 'Eunice', 'Benjamin', 'Vinny', 'Fatim', 'Ismael', 'Guy la roche', 'Auguste', 'Marie Cecile', 'Judith'
];

// Téléacteurs dynamiques depuis Firestore (seed si vide, sinon suivre Firestore)
const useTeleacteurs = () => {
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const reload = async () => {
    setLoading(true); setError('');
    try {
      const names = await teleacteursService.getAll();
      if (!Array.isArray(names) || names.length === 0) {
        // Seed Firestore une seule fois si vide
        await teleacteursService.bulkAdd(DEFAULT_TELEACTEURS);
        const reloaded = await teleacteursService.getAll();
        reloaded.sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
        setList(reloaded);
      } else {
        names.sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
        setList(names);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur chargement agents');
    } finally { setLoading(false); }
  };
  React.useEffect(() => { reload(); }, []);
  return { list, setList, loading, error, reload };
};

interface PresenceTAModuleProps {
  title?: string;
}

const PresenceTAModule: React.FC<PresenceTAModuleProps> = ({ title = 'Présence TA' }) => {
  const { isAdmin, isSuperviseur } = useAuth();
  const canManageAgents = isAdmin() || isSuperviseur();
  const { list: TELEACTEURS, setList: setTeleList, loading: taLoading, reload: reloadTA } = useTeleacteurs();
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  // Retards par agent: { [name]: { value: number; unit: 'minutes' | 'heures' } }
  const [delaysByAgent, setDelaysByAgent] = useState<Record<string, { value: number; unit: 'minutes' | 'heures' }>>({});
  // Edition UI ciblée pour retard
  const [delayEditFor, setDelayEditFor] = useState<string | null>(null);
  const [sentMsg, setSentMsg] = useState<string>('');
  const [query, setQuery] = useState('');
  // Filtrage amélioré
  const [filterMode, setFilterMode] = useState<'all'|'present'|'absent'|'unmarked'>('all');
  // Destinataires fixes (configurés côté code, plus d'UI)
  const RECIPIENTS = React.useRef<string[]>([
    'i.boultame@mars-marketing.fr',
    'i.brai@mars-marketing.fr',
    'M.DEMAURET@mars-marketing.fr',
    'J.ALLIONE@mars-marketing.fr',
    'maurice@emiciv.fr',
    'arthur.gouet@terredappels.fr'
  ]);
  const CC_RECIPIENTS = React.useRef<string[]>([
    'stella@emiciv.fr',
    'jeanwilfried@emiciv.fr'
  ]);
  // --- Ventes du jour ---
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string>('');
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [dailySalesBySeller, setDailySalesBySeller] = useState<Array<{name:string;count:number}>>([]);

  // --- Champs Reporting supplémentaires ---
  const [encadrants, setEncadrants] = useState<string[]>([]); // ex: ['Arthur','Maurice']
  const [salesConfirmed, setSalesConfirmed] = useState<number>(0);
  const [mailsSent, setMailsSent] = useState<number>(0);
  const [absenceCount, setAbsenceCount] = useState<number>(0);
  const [congesCount, setCongesCount] = useState<number>(0);
  const [retardCount, setRetardCount] = useState<number>(0);
  const [sanctionCount, setSanctionCount] = useState<number>(0);
  const [demissionCount, setDemissionCount] = useState<number>(0);
  const [soucisTechnique, setSoucisTechnique] = useState<string>('');
  const [electricite, setElectricite] = useState<string>('');
  const [productionTxt, setProductionTxt] = useState<string>("");

  const loadTodaySales = async () => {
    setSalesLoading(true); setSalesError('');
    try {
      const all = await salesService.getAllSales();
      const todayRaw = all.filter(s => salesService.isToday(s.date));
      // Normalisation & matching canonique renforcé:
      // - retire accents
      // - retire ponctuation et symboles (. , ; : ! ? ' " ` ( ) [ ] { } _ - / \ etc.)
      // - compresse les espaces
      // Objectif: faire correspondre des variantes comme "Benjamin.", "Benjamin-Kone", "Benjamin (Orange)" → "benjamin"
      const normalize = (n: string) =>
        n
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // accents
          .replace(/[^a-z0-9\s]/g, ' ') // enlève toute ponctuation/symbole
          .replace(/\s+/g, ' ') // espaces multiples → simple
          .trim();
      const CANONICALS = TELEACTEURS.map(n => ({ raw: n, norm: normalize(n), tokens: normalize(n).split(' ') }));
      const canonicalMap: Record<string,string> = Object.fromEntries(CANONICALS.map(c => [c.norm, c.raw]));
      const containsTokensInOrder = (textTokens: string[], targetTokens: string[]) => {
        let i = 0;
        for (const t of textTokens) {
          if (t === targetTokens[i]) i++;
          if (i === targetTokens.length) return true;
        }
        return false;
      };
      const matchCanonical = (name: string): string | null => {
        const norm = normalize(name);
        if (!norm) return null;
        // Spécial Guy la roche (variantes)
        if (norm.includes('guy') && norm.replace(/\s+/g,'').includes('laroche')) return 'Guy la roche';
        // Exact
        if (canonicalMap[norm]) return canonicalMap[norm];
        const tokens = norm.split(' ');
        for (const c of CANONICALS) {
          // c.norm en sous-chaîne séparée
          if ((' ' + norm + ' ').includes(' ' + c.norm + ' ')) return c.raw;
          // tokens en ordre
          if (containsTokensInOrder(tokens, c.tokens)) return c.raw;
          // Préfixe par le nom canonique (ex: "dylan ouattara")
          if (norm.startsWith(c.norm + ' ')) return c.raw;
        }
        // Fallback: si le premier token (prénom) correspond à un agent connu, renvoyer cet agent
        if (tokens.length > 0) {
          const first = tokens[0];
          const found = CANONICALS.find(c => c.tokens[0] === first);
          if (found) return found.raw;
        }
        return null;
      };
      const today = todayRaw.filter(s => {
        const okStatus = (
          s.orderStatus === 'valide' ||
          (s.orderStatus as any) === 'validation_soft' ||
          (s.orderStatus as any) === 'validation_finale'
        );
        const canon = s.name ? matchCanonical(String(s.name)) : null;
        return okStatus && !!canon;
      });
      const counts: Record<string, number> = {};
      today.forEach(s => {
        const canon = s.name ? matchCanonical(String(s.name)) : null;
        if (canon) {
          counts[canon] = (counts[canon] || 0) + 1;
        }
      });
      const list = Object.entries(counts).map(([name,count])=>({name, count})).sort((a,b)=>b.count-a.count);
      setDailySales(today);
      setDailySalesBySeller(list);
    } catch (e:any) {
      setSalesError(e.message || 'Erreur chargement ventes');
    } finally {
      setSalesLoading(false);
    }
  };

  React.useEffect(()=>{ loadTodaySales(); }, []);
  React.useEffect(()=>{ loadTodaySales(); }, [TELEACTEURS]);

  // Charger/Sauver l'état du reporting (et présences) depuis/vers localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('presence_ta_report_v1');
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.encadrants)) setEncadrants(data.encadrants);
        if (typeof data.salesConfirmed === 'number') setSalesConfirmed(data.salesConfirmed);
        if (typeof data.mailsSent === 'number') setMailsSent(data.mailsSent);
        if (typeof data.absenceCount === 'number') setAbsenceCount(data.absenceCount);
        if (typeof data.congesCount === 'number') setCongesCount(data.congesCount);
        if (typeof data.retardCount === 'number') setRetardCount(data.retardCount);
        if (typeof data.sanctionCount === 'number') setSanctionCount(data.sanctionCount);
        if (typeof data.demissionCount === 'number') setDemissionCount(data.demissionCount);
        if (typeof data.soucisTechnique === 'string') setSoucisTechnique(data.soucisTechnique);
        if (typeof data.electricite === 'string') setElectricite(data.electricite);
        if (typeof data.productionTxt === 'string') setProductionTxt(data.productionTxt);
        if (Array.isArray(data.present)) setPresent(new Set<string>(data.present));
        if (Array.isArray(data.absent)) setAbsent(new Set<string>(data.absent));
        if (data.delaysByAgent && typeof data.delaysByAgent === 'object') setDelaysByAgent(data.delaysByAgent);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    const payload = {
      encadrants,
      salesConfirmed,
      mailsSent,
      absenceCount,
      congesCount,
      retardCount,
      sanctionCount,
      demissionCount,
      soucisTechnique,
      electricite,
      productionTxt,
      present: Array.from(present),
      absent: Array.from(absent),
      delaysByAgent
    };
    try { localStorage.setItem('presence_ta_report_v1', JSON.stringify(payload)); } catch {}
  }, [encadrants, salesConfirmed, mailsSent, absenceCount, congesCount, retardCount, sanctionCount, demissionCount, soucisTechnique, electricite, productionTxt, present, absent, delaysByAgent]);

  // Suppression de l'UI de configuration des destinataires : on ne persiste plus en localStorage

  const persist = (presentSet: Set<string>, absentSet: Set<string>) => {
    const payload = { present: Array.from(presentSet), absent: Array.from(absentSet) };
    try { localStorage.setItem('presence_ta_today_v2', JSON.stringify(payload)); } catch {}
  };

  const togglePresent = (name: string) => {
    setPresent(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      // Si marqué présent, retirer d'absent si besoin
      setAbsent(prevA => {
        if (prevA.has(name)) { const n = new Set(prevA); n.delete(name); return n; }
        return prevA;
      });
      // Persiste
      persist(next, new Set(absent));
      return next;
    });
  };

  const toggleAbsent = (name: string) => {
    setAbsent(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      // Si marqué absent, retirer de présent si besoin
      setPresent(prevP => {
        if (prevP.has(name)) { const n = new Set(prevP); n.delete(name); return n; }
        return prevP;
      });
      // Si on met absent, annuler un éventuel retard saisi pour cet agent
      setDelaysByAgent(prevD => {
        if (next.has(name)) {
          const { [name]: _omit, ...rest } = prevD;
          return rest;
        }
        return prevD;
      });
      // Persiste
      persist(new Set(present), next);
      return next;
    });
  };

  // Définir/effacer retard pour un agent
  const setRetardFor = (name: string, value: number, unit: 'minutes' | 'heures') => {
    setDelaysByAgent(prev => {
      const v = Math.max(0, Math.floor(value || 0));
      if (v <= 0) {
        const { [name]: _omit, ...rest } = prev;
        return rest;
      }
      const next = { ...prev, [name]: { value: v, unit } };
      return next;
    });
    // Un retard implique que l'agent est présent (et non absent)
    setPresent(prev => {
      const n = new Set(prev); n.add(name); return n;
    });
    setAbsent(prev => {
      if (prev.has(name)) { const n = new Set(prev); n.delete(name); return n; }
      return prev;
    });
  };

  const clearRetardFor = (name: string) => {
    setDelaysByAgent(prev => { const { [name]: _omit, ...rest } = prev; return rest; });
  };

  const buildEmailSubjectBody = (overrides?: { logos?: { marsLogo?: string; cactusLogo?: string } }) => {
    const date = new Date().toISOString().split('T')[0];
  const presentList = Array.from(present);
  const absentList = Array.from(absent);
    const unmarked = TELEACTEURS.filter(t => !present.has(t) && !absent.has(t));
    const totalSales = dailySales.length;
  const subject = `🌙 Rapport ORANGE CANAL+ — ${date}`;

    // Plain-text beau (emojis)
    const lines: string[] = [];
    lines.push('Bonsoir à tous,');
    lines.push('');
    lines.push(`Ci-dessous le rapport de production et le reporting du "${date}" sur le pôle : ORANGE CANAL+`);
    lines.push('');
    lines.push(`• ✅ NOMBRE DE VENTES CONFIRMÉES : ${salesConfirmed}`);
    lines.push(`• ✉️ NOMBRE DE MAILS DE COMMANDES ENVOYÉS : ${mailsSent}`);
    lines.push('');
    lines.push(`👤 Encadrant(s) : ${encadrants.length ? encadrants.join(' / ') : '—'}`);
    lines.push('');
    lines.push('📊 Indicateurs');
    lines.push(`- Absence : ${absenceCount.toString().padStart(2,'0')}`);
    lines.push(`- Congés : ${congesCount.toString().padStart(2,'0')}`);
    lines.push(`- Retard : ${retardCount.toString().padStart(2,'0')}`);
    lines.push(`- Mise à pied / Sanction disciplinaire : ${sanctionCount.toString().padStart(2,'0')}`);
    lines.push(`- Démission : ${demissionCount.toString().padStart(2,'0')}`);
    lines.push('');
    lines.push(`🧰 SOUCIS TECHNIQUE : ${soucisTechnique || '—'}`);
    lines.push(`⚡ ÉLECTRICITÉ : ${electricite || '—'}`);
    lines.push(`🏭 PRODUCTION : ${productionTxt || '—'}`);
    lines.push('');
    // Annexes présence/ventes
    const presentWithDelays = presentList.map(n => {
      const d = delaysByAgent[n];
      if (!d || !d.value) return n;
      const suffix = d.unit === 'minutes' ? `${d.value} min` : `${d.value} h`;
      return `${n} (⏰ ${suffix})`;
    });
    lines.push('👥 Présence');
    lines.push(`- Présents (${presentList.length}) : ${presentWithDelays.join(', ') || 'Aucun'}`);
    lines.push(`- Absents (${absentList.length}) : ${absentList.join(', ') || 'Aucun'}`);
    lines.push(`- Non marqués (${unmarked.length}) : ${unmarked.join(', ') || 'Aucun'}`);
    // Détail retards (liste pour texte & HTML)
    const delaysDetail = presentList
      .filter(n => delaysByAgent[n]?.value)
      .map(n => {
        const d = delaysByAgent[n]!;
        const suffix = d.unit === 'minutes' ? `${d.value} min` : `${d.value} h`;
        return `${n} — ${suffix}`;
      });
    if (delaysDetail.length > 0) {
      lines.push('');
      lines.push(`⏰ Retards (détail): ${delaysDetail.join(', ')}`);
    }
    lines.push('');
    if (totalSales === 0) {
      lines.push('📈 Ventes du jour : Aucune');
    } else {
      lines.push(`📈 Ventes du jour (${totalSales}) :`);
      dailySalesBySeller.forEach(s => lines.push(`- ${s.name}: ${s.count}`));
    }
    const body = lines.join('\n');

    // Version HTML stylée — Outlook-friendly (tables + inline styles, no complex gradients)
    // Base URL configurable (prefer absolute HTTPS to avoid client blocking and localhost issues)
  const runtimeBase = typeof window !== 'undefined' ? (window as any).__PUBLIC_BASE_URL__ : '';
  const envBase = (import.meta as any)?.env?.VITE_PUBLIC_BASE_URL || '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isLocal = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1') || currentOrigin.startsWith('http://');
  const defaultProd = 'https://admin.cactus-tech.fr';
  // Prefer explicit base -> env -> if local dev, force prod origin to make images resolvable in inbox
  const baseUrl = (runtimeBase || envBase || (isLocal ? defaultProd : currentOrigin)).replace(/\/$/, '');
  const marsLogo = overrides?.logos?.marsLogo || `${baseUrl}/mars-logo.svg?v=1`;
  // Prefer PNG for better support in email clients; allow override (e.g., generated data URL)
  const cactusLogo = overrides?.logos?.cactusLogo || `${baseUrl}/cactus-logo.png?v=1`;

    const delaysDetailHtml = delaysDetail.length
      ? `<div style="font-size:13px;color:#334155;margin-top:8px;">⏰ Retards (détail): ${delaysDetail.join(', ')}</div>`
      : '';

    const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
            <!-- Brand Bar -->
            <tr>
              <td style="padding:10px 14px;background:#0ea5e9;color:#ffffff;border-bottom:1px solid #0ea5e9;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="right" style="vertical-align:middle;">
                      <img src="${marsLogo}" alt="Mars Marketing" width="110" height="28" style="display:inline-block;border:0;outline:none;text-decoration:none;margin-right:8px;" />
                      <img src="${cactusLogo}" alt="Cactus" width="32" height="32" style="display:inline-block;border:0;outline:none;text-decoration:none;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="vertical-align:middle;padding-top:8px;">
                      <span style="font-size:16px;font-weight:800;letter-spacing:.2px;white-space:nowrap;">🌙 Rapport ORANGE CANAL+ — ${date}</span>
                      <span style="float:right;">
                        <span style="display:inline-block;background:#0284c7;color:#e0f2fe;border:1px solid #0369a1;border-radius:999px;padding:5px 9px;font-size:11px;margin-left:4px;">✅ ${salesConfirmed} ventes</span>
                        <span style="display:inline-block;background:#0284c7;color:#e0f2fe;border:1px solid #0369a1;border-radius:999px;padding:5px 9px;font-size:11px;margin-left:4px;">✉️ ${mailsSent} mails</span>
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding:18px 22px;">
                <p style="margin:0 0 8px 0;font-size:14px;">Bonsoir à tous,</p>
                <p style="margin:0 0 14px 0;font-size:14px;">Ci-dessous le rapport de production et le reporting du "${date}" sur le pôle : <strong>ORANGE CANAL+</strong></p>

                <!-- Two columns: Encadrants + Indicateurs -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="vertical-align:top;padding-right:6px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;">
                        <tr>
                          <td style="background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:8px 10px;font-size:13px;font-weight:700;">👤 Encadrant(s)</td>
                        </tr>
                        <tr>
                          <td style="padding:10px;">
                            ${encadrants.length
                              ? encadrants.map(n=>`<span style=\"display:inline-block;background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:999px;padding:6px 9px;margin:2px 4px 2px 0;font-size:12px;font-weight:600;\">${n}</span>`).join('')
                              : '<span style="color:#64748b;font-size:13px;">—</span>'}
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td width="50%" style="vertical-align:top;padding-left:6px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;">
                        <tr>
                          <td style="background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:8px 10px;font-size:13px;font-weight:700;">📊 Indicateurs</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 8px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding:6px 6px;font-size:13px;color:#334155;">🧍‍♂️ Absence</td>
                                <td align="right" style="padding:6px 6px;">
                                  <span style="display:inline-block;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:6px;padding:3px 8px;font-weight:700;">${absenceCount.toString().padStart(2,'0')}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:6px 6px;font-size:13px;color:#334155;">🏖️ Congés</td>
                                <td align="right" style="padding:6px 6px;">
                                  <span style="display:inline-block;background:#ffedd5;color:#9a3412;border:1px solid #fed7aa;border-radius:6px;padding:3px 8px;font-weight:700;">${congesCount.toString().padStart(2,'0')}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:6px 6px;font-size:13px;color:#334155;">⏰ Retard</td>
                                <td align="right" style="padding:6px 6px;">
                                  <span style="display:inline-block;background:#e0f2fe;color:#075985;border:1px solid #bae6fd;border-radius:6px;padding:3px 8px;font-weight:700;">${retardCount.toString().padStart(2,'0')}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:6px 6px;font-size:13px;color:#334155;">⚖️ Sanction</td>
                                <td align="right" style="padding:6px 6px;">
                                  <span style="display:inline-block;background:#ede9fe;color:#5b21b6;border:1px solid #ddd6fe;border-radius:6px;padding:3px 8px;font-weight:700;">${sanctionCount.toString().padStart(2,'0')}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:6px 6px;font-size:13px;color:#334155;">📤 Démission</td>
                                <td align="right" style="padding:6px 6px;">
                                  <span style="display:inline-block;background:#f1f5f9;color:#0f172a;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;font-weight:700;">${demissionCount.toString().padStart(2,'0')}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Spacing -->
                <div style="height:12px;"></div>

                <!-- Text sections -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;">
                      <div style="font-size:13px;font-weight:700;">🧰 Soucis technique</div>
                      <div style="font-size:13px;color:#334155;margin-top:6px;">${soucisTechnique || '—'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;">
                      <div style="font-size:13px;font-weight:700;">⚡ Électricité</div>
                      <div style="font-size:13px;color:#334155;margin-top:6px;">${electricite || '—'}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;">
                      <div style="font-size:13px;font-weight:700;">🏭 Production</div>
                      <div style="font-size:13px;color:#334155;margin-top:6px;">${productionTxt || '—'}</div>
                    </td>
                  </tr>
                </table>

                <!-- Spacing -->
                <div style="height:12px;"></div>

                <!-- Presence -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #e5e7eb;border-radius:8px;">
                  <tr>
                    <td style="padding:10px 12px;">
                      <div style="font-size:13px;font-weight:700;">👥 Présence</div>
                      <div style="font-size:13px;color:#334155;margin-top:6px;">Présents (${presentList.length}) : ${presentList.map(n=>{
                        const d = delaysByAgent[n];
                        if(!d || !d.value) return n;
                        const suf = d.unit==='minutes'? `${d.value} min` : `${d.value} h`;
                        return `${n} (⏰ ${suf})`;
                      }).join(', ') || 'Aucun'}</div>
                      <div style="font-size:13px;color:#334155;margin-top:4px;">Absents (${absentList.length}) : ${absentList.join(', ') || 'Aucun'}</div>
                      <div style="font-size:13px;color:#334155;margin-top:4px;">Non marqués (${unmarked.length}) : ${unmarked.join(', ') || 'Aucun'}</div>
                      ${delaysDetailHtml}
                    </td>
                  </tr>
                </table>

                <!-- Spacing -->
                <div style="height:12px;"></div>

                <!-- Sales -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #e5e7eb;border-radius:8px;">
                  <tr>
                    <td style="padding:10px 12px;">
                      <div style="font-size:13px;font-weight:700;">📈 Ventes du jour ${totalSales ? `(${totalSales})` : ''}</div>
                      ${totalSales === 0 ? `<div style="font-size:13px;color:#334155;margin-top:6px;">Aucune vente enregistrée</div>` : `
                        <ul style="margin:8px 0 0 16px;padding:0;font-size:13px;color:#334155;">
                          ${dailySalesBySeller.map(s=>`<li><strong>${s.name}</strong>: ${s.count}</li>`).join('')}
                        </ul>
                      `}
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer note -->
            <tr>
              <td style="padding:12px 22px;background:#fafafa;color:#64748b;font-size:12px;text-align:center;border-top:1px solid #e5e7eb;">
                <div style="margin-bottom:4px;">Envoyé depuis Cactus Admin</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Si les images ne s'affichent pas, veuillez autoriser l'affichage des images externes dans votre client mail.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    return { subject, body, html } as const;
  };

  const handleOpenOutlookWeb = async () => {
    // Ouvre Outlook Web (Microsoft 365) avec le compose pré-rempli
    // Génère des PNG temporaires depuis les SVG (Mars & Cactus) pour maximiser l'affichage
    const getSvgAsPngDataUrl = async (svgPath: string, width: number, height: number): Promise<string | null> => {
      try {
        const runtimeBase = typeof window !== 'undefined' ? (window as any).__PUBLIC_BASE_URL__ : '';
        const envBase = (import.meta as any)?.env?.VITE_PUBLIC_BASE_URL || '';
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const isLocal = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1') || currentOrigin.startsWith('http://');
        const defaultProd = 'https://admin.cactus-tech.fr';
        const baseUrl = (runtimeBase || envBase || (isLocal ? defaultProd : currentOrigin)).replace(/\/$/, '');
        const svgUrl = `${baseUrl}/${svgPath.replace(/^\//,'')}`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = svgUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.clearRect(0,0,width,height);
        ctx.drawImage(loaded, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl;
      } catch {
        return null;
      }
    };

    let overrides: { logos?: { marsLogo?: string; cactusLogo?: string } } | undefined = {};
    const [marsPng, cactusPng] = await Promise.all([
      getSvgAsPngDataUrl('mars-logo.svg', 110, 28),
      getSvgAsPngDataUrl('cactus-icon.svg', 32, 32)
    ]);
    overrides.logos = {};
    if (marsPng) overrides.logos.marsLogo = marsPng;
    if (cactusPng) overrides.logos.cactusLogo = cactusPng;

  const { subject, body, html } = buildEmailSubjectBody(overrides);
  const to = RECIPIENTS.current.join(',');
  const cc = CC_RECIPIENTS.current.join(',');
    const base = 'https://outlook.office.com/mail/deeplink/compose';
    // Build query manually so spaces are encoded as %20 (not '+')
  const url = `${base}?to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&bodyType=HTML`;
    window.open(url, '_blank', 'noopener');
    // Essayer de copier la version HTML dans le presse-papiers pour collage manuel dans Outlook si besoin
    try {
      await navigator.clipboard.writeText(html);
      setSentMsg('Mail ouvert. Version HTML copiée — retournez dans Outlook et faites Ctrl+V pour coller la mise en page avec images ✨');
    } catch {
      setSentMsg('Mail ouvert dans Outlook Web. Si vous ne voyez pas la mise en page, revenez ici et copiez le HTML manuellement.');
    }

    // Enregistrer un récap dans Firestore (historique)
    try {
      const date = new Date();
      const presentList = Array.from(present);
      const absentList = Array.from(absent);
      const unmarked = TELEACTEURS.filter(t => !present.has(t) && !absent.has(t));
      await recapService.add({
        id: date.toISOString().slice(0,10),
        subject,
  recipients: RECIPIENTS.current,
  ccRecipients: CC_RECIPIENTS.current,
        encadrants,
        metrics: {
          salesConfirmed,
          mailsSent,
          absence: absenceCount,
          conges: congesCount,
          retard: retardCount,
          sanction: sanctionCount,
          demission: demissionCount,
          presentCount: presentList.length,
          absentCount: absentList.length,
          unmarkedCount: unmarked.length,
          totalSalesOfDay: dailySales.length,
        },
        presence: {
          present: presentList,
          absent: absentList,
          unmarked,
        },
        salesBySeller: dailySalesBySeller,
      });
    } catch (e) {
      console.warn('Impossible de sauvegarder le récap:', e);
    }
  };

  const allCount = TELEACTEURS.length;
  const presentCount = present.size;
  const absentCount = absent.size;
  const unmarkedCount = allCount - presentCount - absentCount;

  const filtered = useMemo(() => {
    let list = TELEACTEURS;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(n => n.toLowerCase().includes(q));
    }
    switch(filterMode){
      case 'present':
        list = list.filter(n=>present.has(n));
        break;
      case 'absent':
        list = list.filter(n=>absent.has(n));
        break;
      case 'unmarked':
        list = list.filter(n=>!present.has(n) && !absent.has(n));
        break;
    }
    return list;
  }, [TELEACTEURS, query, filterMode, present, absent]);

  // Map rapide nom -> ventes du jour (déjà agrégé dans dailySalesBySeller)
  const salesCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    dailySalesBySeller.forEach(s => { m[s.name] = s.count; });
    return m;
  }, [dailySalesBySeller]);

  const progressPct = allCount === 0 ? 0 : Math.round(((presentCount + absentCount) / allCount) * 100);

  const clear = () => { setPresent(new Set()); setAbsent(new Set()); localStorage.removeItem('presence_ta_today'); localStorage.removeItem('presence_ta_today_v2'); };
  const setAllPresent = () => { const all = new Set(TELEACTEURS); setPresent(all); setAbsent(new Set()); persist(all, new Set()); };
  const setAllAbsent = () => { const all = new Set(TELEACTEURS); setAbsent(all); setPresent(new Set()); persist(new Set(), all); };

  // Admin: gestion agents (add/remove)
  const [newAgent, setNewAgent] = useState('');
  const [removeSelection, setRemoveSelection] = useState<string>('');
  const [agentMsg, setAgentMsg] = useState<string>('');
  const [agentErr, setAgentErr] = useState<string>('');
  const [agentBusy, setAgentBusy] = useState<boolean>(false);
  const addAgent = async () => {
    const n = newAgent.trim();
    if (!n) return;
    setAgentBusy(true); setAgentMsg(''); setAgentErr('');
    try {
      await teleacteursService.add(n);
      setTeleList(prev => Array.from(new Set([...prev, n])));
      setNewAgent('');
      setAgentMsg(`Agent "${n}" ajouté ✔️`);
      await reloadTA();
    } catch (e: any) {
      setAgentErr(e?.message || "Impossible d'ajouter l'agent");
    } finally { setAgentBusy(false); }
  };
  const removeAgent = async () => {
    const n = removeSelection.trim();
    if (!n) return;
    setAgentBusy(true); setAgentMsg(''); setAgentErr('');
    try {
      await teleacteursService.remove(n);
      setTeleList(prev => prev.filter(x => x !== n));
      setRemoveSelection('');
      setAgentMsg(`Agent "${n}" supprimé ✔️`);
      await reloadTA();
    } catch (e: any) {
      setAgentErr(e?.message || "Impossible de supprimer l'agent");
    } finally { setAgentBusy(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-6">
      {/* Header + Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-cactus-600" /> {title}
            </h3>
            <p className="text-xs text-gray-500">Gestion quotidienne présence & ventes</p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 font-medium shadow-sm">Présents <span className="font-semibold">{presentCount}</span></div>
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium shadow-sm">Absents <span className="font-semibold">{absentCount}</span></div>
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-medium shadow-sm">Non marqués <span className="font-semibold">{unmarkedCount}</span></div>
            <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium shadow-sm flex items-center gap-1"><BarChart3 className="w-3 h-3"/> Ventes <span className="font-semibold">{dailySales.length}</span></div>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-teal-400 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-[10px] text-gray-400 -mt-3 self-end">{progressPct}% complété</div>
      </div>

      {/* Actions & Filtres */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={setAllPresent} className="px-3 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 font-medium transition">Tous présents</button>
          <button onClick={setAllAbsent} className="px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 font-medium transition">Tous absents</button>
          <button onClick={clear} className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition">Réinitialiser</button>
          <div className="flex items-center gap-2">
            <button onClick={handleOpenOutlookWeb} className="px-4 py-2 rounded-md bg-blue-700 text-white hover:bg-blue-600 flex items-center gap-2 transition shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 text-xs font-semibold">
              <Send className="w-4 h-4" />
              Envoyer instantanément
            </button>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…" className="pl-7 pr-2 py-1.5 text-xs rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500 bg-white w-36" />
          </div>
          <div className="flex gap-1">
            {(['all','present','absent','unmarked'] as const).map(m => (
              <button key={m} onClick={()=>setFilterMode(m)} className={`px-3 py-1.5 rounded-full border text-[11px] font-medium transition ${filterMode===m ? 'bg-cactus-600 border-cactus-600 text-white shadow' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{m==='all'?'Tous': m==='present'?'Présents': m==='absent'?'Absents':'Non marqués'}</button>
            ))}
          </div>
        </div>
      </div>

      {canManageAgents && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-3">
          <div className="text-xs font-semibold text-gray-700">Gestion des agents</div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={newAgent} onChange={e=>setNewAgent(e.target.value)} placeholder="Nom agent (ex: Jean)" className="px-2 py-1.5 text-xs rounded-md border border-gray-300 w-48" />
            <button onClick={addAgent} disabled={agentBusy || !newAgent.trim()} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-500 disabled:opacity-50">{agentBusy? 'Patientez…' : 'Ajouter un agent'}</button>
            <span className="mx-2 text-gray-300">•</span>
            <select value={removeSelection} onChange={e=>setRemoveSelection(e.target.value)} className="px-2 py-1.5 text-xs rounded-md border border-gray-300 w-48">
              <option value="">Sélectionner un agent</option>
              {TELEACTEURS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={removeAgent} className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs hover:bg-rose-500 disabled:opacity-50" disabled={!removeSelection || agentBusy}>Supprimer l'agent</button>
            {taLoading && <span className="text-[10px] text-gray-400">Maj…</span>}
            {agentMsg && <span className="text-[10px] text-emerald-600">{agentMsg}</span>}
            {agentErr && <span className="text-[10px] text-rose-600">{agentErr}</span>}
          </div>
        </div>
      )}

      {/* Destinataires affichage simple */}
      <div className="flex flex-col gap-2 text-[10px] bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-600">À:</span>
          {RECIPIENTS.current.map(r => (
            <span key={r} className="px-2 py-0.5 rounded-full bg-white border border-gray-300 text-gray-600">{r}</span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-600">CC:</span>
          {CC_RECIPIENTS.current.map(r => (
            <span key={r} className="px-2 py-0.5 rounded-full bg-white border border-gray-300 text-gray-600">{r}</span>
          ))}
        </div>
      </div>

      {/* Bloc Reporting Amélioré */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50 to-white p-4 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Reporting — ORANGE CANAL+
          </div>
        </div>

        {/* Encadrants */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-medium text-gray-600">Encadrant(s):</div>
          {['Arthur','Maurice'].map(name => {
            const active = encadrants.includes(name);
            return (
              <button
                key={name}
                onClick={() => setEncadrants(prev => active ? prev.filter(n=>n!==name) : [...prev, name])}
                className={`px-3 py-1.5 rounded-full border text-[11px] transition ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >{name}</button>
            );
          })}
        </div>

        {/* Lignes KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div className="flex-1">
              <div className="text-[11px] text-gray-500">Ventes confirmées</div>
              <input type="number" min={0} value={salesConfirmed} onChange={e=>setSalesConfirmed(Number(e.target.value||0))} className="w-full mt-1 text-sm px-2 py-1.5 border rounded-md" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">✉️</span>
            <div className="flex-1">
              <div className="text-[11px] text-gray-500">Mails de commandes envoyés</div>
              <input type="number" min={0} value={mailsSent} onChange={e=>setMailsSent(Number(e.target.value||0))} className="w-full mt-1 text-sm px-2 py-1.5 border rounded-md" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">🧍‍♂️</span>
            <div className="flex-1">
              <div className="text-[11px] text-gray-500">Absence</div>
              <input type="number" min={0} value={absenceCount} onChange={e=>setAbsenceCount(Number(e.target.value||0))} className="w-full mt-1 text-sm px-2 py-1.5 border rounded-md" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">🏖️</span>
            <div className="flex-1">
              <div className="text-[11px] text-gray-500">Congés</div>
              <input type="number" min={0} value={congesCount} onChange={e=>setCongesCount(Number(e.target.value||0))} className="w-full mt-1 text-sm px-2 py-1.5 border rounded-md" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <div className="flex-1">
              <div className="text-[11px] text-gray-500">Retard</div>
              <input type="number" min={0} value={retardCount} onChange={e=>setRetardCount(Number(e.target.value||0))} className="w-full mt-1 text-sm px-2 py-1.5 border rounded-md" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">⚖️</span>
            <div className="flex-1">
              <div className="text-[11px] text-gray-500">Mise à pied / Sanction</div>
              <input type="number" min={0} value={sanctionCount} onChange={e=>setSanctionCount(Number(e.target.value||0))} className="w-full mt-1 text-sm px-2 py-1.5 border rounded-md" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">📤</span>
            <div className="flex-1">
              <div className="text-[11px] text-gray-500">Démission</div>
              <input type="number" min={0} value={demissionCount} onChange={e=>setDemissionCount(Number(e.target.value||0))} className="w-full mt-1 text-sm px-2 py-1.5 border rounded-md" />
            </div>
          </div>
        </div>

        {/* Textes libres */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-[11px] font-medium text-gray-600 mb-1">🧰 Soucis technique</div>
            <textarea value={soucisTechnique} onChange={e=>setSoucisTechnique(e.target.value)} rows={3} className="w-full text-sm px-2 py-1.5 border rounded-md"></textarea>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-[11px] font-medium text-gray-600 mb-1">⚡ Électricité</div>
            <textarea value={electricite} onChange={e=>setElectricite(e.target.value)} rows={3} className="w-full text-sm px-2 py-1.5 border rounded-md"></textarea>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-[11px] font-medium text-gray-600 mb-1">🏭 Production</div>
            <textarea value={productionTxt} onChange={e=>setProductionTxt(e.target.value)} rows={3} className="w-full text-sm px-2 py-1.5 border rounded-md"></textarea>
          </div>
        </div>
      </div>

  {sentMsg && <div className="flex items-center gap-1 text-green-600 text-xs"><CheckSquare className="w-3 h-3" /> {sentMsg}</div>}
      

      {/* Grid list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-1">
        {filtered.map(name => {
          const isPresent = present.has(name);
          const isAbsent = absent.has(name);
          const salesCount = salesCountMap[name] || 0;
          const delayInfo = delaysByAgent[name];
          const delayLabel = delayInfo ? `${delayInfo.value} ${delayInfo.unit === 'minutes' ? 'min' : 'h'}` : '';
          let salesBadgeClass = 'bg-indigo-100 text-indigo-700';
          if (salesCount > 5) salesBadgeClass = 'bg-yellow-100 text-yellow-700 border border-yellow-300';
          else if (salesCount > 3) salesBadgeClass = 'bg-green-100 text-green-700 border border-green-300';
          return (
            <div key={name} className={`group relative p-5 rounded-2xl border flex flex-col gap-3 transition shadow hover:shadow-md overflow-hidden box-border focus-within:ring-2 focus-within:ring-cactus-500 ${isPresent ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' : isAbsent ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}> 
              <div className="flex items-start justify-between gap-3">
                <span className={`text-base font-semibold tracking-wide flex items-center gap-2 ${isPresent ? 'text-green-800' : isAbsent ? 'text-red-800' : 'text-gray-700'}`}>
                  {name}
                  {salesCount > 0 && <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${salesBadgeClass}`}>{salesCount}</span>}
                  {delayInfo && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {delayLabel}
                    </span>
                  )}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${isPresent ? 'bg-green-100 text-green-700' : isAbsent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{isPresent ? 'Présent' : isAbsent ? 'Absent' : '—'}</span>
              </div>
              <div className="flex flex-wrap items-stretch gap-2 mt-1 -mx-0.5">
                <button
                  onClick={()=>togglePresent(name)}
                  aria-pressed={isPresent}
                  className={`basis-[48%] grow text-sm px-3 py-2 rounded-md border transition font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400 select-none shadow-sm ${isPresent ? 'bg-green-600 border-green-600 text-white' : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'}`}
                >Présent</button>
                <button
                  onClick={()=>toggleAbsent(name)}
                  aria-pressed={isAbsent}
                  className={`basis-[48%] grow text-sm px-3 py-2 rounded-md border transition font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 select-none shadow-sm ${isAbsent ? 'bg-red-600 border-red-600 text-white' : 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'}`}
                >Absent</button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setDelayEditFor(prev => prev === name ? null : name)}
                  className={`text-sm px-3 py-2 rounded-md border transition font-medium flex items-center gap-2 ${delayEditFor===name ? 'bg-sky-600 border-sky-600 text-white' : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'}`}
                >
                  <Clock className="w-4 h-4" /> Retard
                </button>
                {delayInfo && (
                  <button
                    onClick={() => { clearRetardFor(name); if (delayEditFor===name) setDelayEditFor(null); }}
                    className="text-xs px-2 py-1 rounded-md bg-gray-50 border border-gray-300 text-gray-700 hover:bg-white"
                  >Effacer</button>
                )}
              </div>
              {delayEditFor === name && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    value={delayInfo?.value ?? 0}
                    onChange={(e)=> setRetardFor(name, Number(e.target.value||0), (delayInfo?.unit || 'minutes'))}
                    className="w-24 px-3 py-2 rounded-md border border-gray-300 text-sm"
                    placeholder="0"
                  />
                  <select
                    value={delayInfo?.unit || 'minutes'}
                    onChange={(e)=> setRetardFor(name, delayInfo?.value || 0, (e.target.value as 'minutes'|'heures'))}
                    className="px-3 py-2 rounded-md border border-gray-300 text-sm"
                  >
                    <option value="minutes">minutes</option>
                    <option value="heures">heures</option>
                  </select>
                </div>
              )}
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none text-[60px] leading-none font-black select-none pr-2 pb-1 tracking-tighter">
                {isPresent ? 'P' : isAbsent ? 'A' : ''}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-xs text-gray-400 py-6">Aucun résultat</div>
        )}
      </div>

      {/* Footer summary compact */}
      <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 justify-end">
        <span>Présents: <strong>{presentCount}</strong></span>
        <span>Absents: <strong>{absentCount}</strong></span>
        <span>Non marqués: <strong>{unmarkedCount}</strong></span>
        <span>Total: <strong>{allCount}</strong></span>
      </div>

      {/* Ventes du jour UI amélioré */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-100 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700 tracking-wide">Ventes du jour</span>
            {!salesLoading && !salesError && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white">{dailySales.length}</span>}
          </div>
          <div className="flex items-center gap-2">
            {salesLoading && <span className="text-[10px] text-gray-400 animate-pulse">Chargement…</span>}
            <button onClick={loadTodaySales} className="text-[10px] px-2 py-1 rounded-md bg-white/70 backdrop-blur border border-indigo-300 hover:bg-white transition shadow-sm">Rafraîchir</button>
          </div>
        </div>
        {salesError && <div className="text-[10px] text-red-500">{salesError}</div>}
        {!salesError && !salesLoading && (
          dailySales.length === 0 ? <div className="text-[11px] text-gray-500">Aucune vente aujourd'hui</div> :
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {dailySalesBySeller.map(s => (
                <span key={s.name} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 shadow-sm">{s.name}<span className="ml-1 font-semibold">{s.count}</span></span>
              ))}
            </div>
            <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" style={{width: dailySales.length === 0 ? '4%' : '100%'}} />
            </div>
          </div>
        )}
      </div>

      {/* Historique des récaps envoyés */}
      <RecapsHistorySection />

      {/* Récap hebdo / mensuel */}
      <AggregatedRecapSection />
    </div>
  );
};

export default PresenceTAModule;

// Composant de section d'historique (rendu sous les ventes du jour)
const RecapsHistorySection: React.FC = () => {
  const [recaps, setRecaps] = React.useState<RecapEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');

  // Ecoute en temps réel des derniers récaps
  React.useEffect(() => {
    try {
      const q = fsQuery(fsCollection(db, 'recaps'), fsOrderBy('createdAt','desc'), fsLimit(60));
      const unsub = onSnapshot(q, (snap) => {
        const out: RecapEntry[] = [];
        snap.forEach(d => out.push(d.data() as RecapEntry));
        setRecaps(out);
        setLoading(false);
      }, (err) => {
        setError(err?.message || 'Erreur écoute historique');
        setLoading(false);
      });
      return () => unsub();
    } catch(e:any) {
      setError(e?.message || 'Erreur initialisation historique');
      setLoading(false);
    }
  }, []);

  const toCsv = (r: RecapEntry) => {
    // Utiliser un séparateur « ; » pour une meilleure compatibilité avec Excel FR
    const SEP = ';';
    const EOL = '\r\n'; // Favorise l'ouverture dans Excel sous Windows
    const escapeCSV = (value: string | number | undefined | null) => {
      const s = (value === undefined || value === null) ? '' : String(value);
      // Doubler les guillemets, entourer de quotes
      return '"' + s.replace(/"/g, '""') + '"';
    };

    // Mise en forme des dates lisibles
    const created = r.createdAt?.toDate ? r.createdAt.toDate() : undefined;
    const dateStr = r.id; // yyyy-mm-dd
    const timeStr = created ? created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

    // Concat utilitaire pour ligne CSV
    const row = (...cols: Array<string | number | undefined | null>) => cols.map(escapeCSV).join(SEP);

    const lines: string[] = [];

    // Section 1: Informations générales
    lines.push('Informations générales');
    lines.push(row('Clé','Valeur'));
    lines.push(row('Date', dateStr));
    if (timeStr) lines.push(row('Heure', timeStr));
    lines.push(row('Sujet', r.subject));
    lines.push(row('Destinataires', r.recipients.join(' | ')));
    lines.push(row('CC', (r.ccRecipients || []).join(' | ')));
    lines.push(row('Encadrants', r.encadrants.join(' | ')));

    // Ligne vide
    lines.push('');

    // Section 2: Indicateurs
    lines.push('Indicateurs');
    lines.push(row('Indicateur','Valeur'));
    lines.push(row('Ventes confirmées', r.metrics.salesConfirmed));
    lines.push(row('Ventes du jour (total)', r.metrics.totalSalesOfDay));
    lines.push(row('Mails envoyés', r.metrics.mailsSent));
    lines.push(row('Absence', r.metrics.absence));
    lines.push(row('Congés', r.metrics.conges));
    lines.push(row('Retard', r.metrics.retard));
    lines.push(row('Sanction', r.metrics.sanction));
    lines.push(row('Démission', r.metrics.demission));
    lines.push(row('Présents (compte)', r.metrics.presentCount));
    lines.push(row('Absents (compte)', r.metrics.absentCount));
    lines.push(row('Non marqués (compte)', r.metrics.unmarkedCount));

    // Ligne vide
    lines.push('');

    // Section 3: Présence
    lines.push('Présence');
    lines.push(row('Statut','Noms'));
    lines.push(row('Présents', r.presence.present.join(' | ')));
    lines.push(row('Absents', r.presence.absent.join(' | ')));
    lines.push(row('Non marqués', r.presence.unmarked.join(' | ')));

    // Ligne vide
    lines.push('');

    // Section 4: Ventes par vendeur
    if (r.salesBySeller && r.salesBySeller.length) {
      lines.push('Ventes par vendeur');
      lines.push(row('Vendeur','Ventes'));
      // Trier par nombre décroissant pour lisibilité
      [...r.salesBySeller]
        .sort((a,b)=> b.count - a.count)
        .forEach(s => lines.push(row(s.name, s.count)));
    }

    // Joindre en ajoutant un BOM pour que Excel reconnaisse l'UTF-8
    const content = lines.join(EOL);
    return '\uFEFF' + content;
  };

  const downloadCsv = (r: RecapEntry) => {
    const csv = toCsv(r);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recap-${r.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">Historique des récaps envoyés</div>
        {/* Actualisation en temps réel activée */}
        <span className="text-[10px] px-2 py-1 rounded-md bg-gray-50 border border-gray-200">Temps réel</span>
      </div>
      {loading && <div className="text-[11px] text-gray-500">Chargement…</div>}
      {error && <div className="text-[11px] text-red-600">{error}</div>}
      {!loading && !error && (
        recaps.length === 0 ? (
          <div className="text-[11px] text-gray-500">Aucun récap enregistré pour le moment</div>
        ) : (
          <div className="flex flex-col gap-2">
            {recaps.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-800">{r.id}</span>
                  <span className="text-[11px] text-gray-500 hidden sm:inline">{r.subject}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Ventes: {r.metrics.totalSalesOfDay}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Présents: {r.metrics.presentCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>downloadCsv(r)} className="text-[10px] px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50">Télécharger CSV</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

// Section de récap agrégé (hebdomadaire / mensuel)
const AggregatedRecapSection: React.FC = () => {
  const [mode, setMode] = React.useState<'week'|'month'>('week');
  const [range, setRange] = React.useState<{start: Date; end: Date}>(()=> getWeekRange());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [data, setData] = React.useState<RecapEntry[]>([]);

  const computeRange = React.useCallback((newMode: 'week'|'month') => {
    return newMode === 'week' ? getWeekRange(new Date()) : getMonthRange(new Date());
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const list = await recapService.getByDateRange(range.start, range.end);
      setData(list);
    } catch(e:any) {
      setError(e?.message || 'Erreur chargement récap agrégé');
    } finally { setLoading(false); }
  }, [range]);

  React.useEffect(()=>{ setRange(computeRange(mode)); }, [mode, computeRange]);
  React.useEffect(()=>{ load(); }, [range, load]);

  // Agrégation métriques + ventes par vendeur
  const agg = React.useMemo(() => {
    const metrics = {
      salesConfirmed: 0,
      mailsSent: 0,
      absence: 0,
      conges: 0,
      retard: 0,
      sanction: 0,
      demission: 0,
      presentCount: 0,
      absentCount: 0,
      unmarkedCount: 0,
      totalSalesOfDay: 0,
    };
    const sellerMap: Record<string, number> = {};
    data.forEach(r => {
      metrics.salesConfirmed += r.metrics.salesConfirmed || 0;
      metrics.mailsSent += r.metrics.mailsSent || 0;
      metrics.absence += r.metrics.absence || 0;
      metrics.conges += r.metrics.conges || 0;
      metrics.retard += r.metrics.retard || 0;
      metrics.sanction += r.metrics.sanction || 0;
      metrics.demission += r.metrics.demission || 0;
      metrics.presentCount += r.metrics.presentCount || 0;
      metrics.absentCount += r.metrics.absentCount || 0;
      metrics.unmarkedCount += r.metrics.unmarkedCount || 0;
      metrics.totalSalesOfDay += r.metrics.totalSalesOfDay || 0;
      (r.salesBySeller || []).forEach(s => {
        sellerMap[s.name] = (sellerMap[s.name] || 0) + (s.count || 0);
      });
    });
    const salesBySeller = Object.entries(sellerMap)
      .map(([name,count])=>({name, count}))
      .sort((a,b)=> b.count - a.count);
    return { metrics, salesBySeller };
  }, [data]);

  const toCsv = () => {
    const escape = (s:string) => '"' + (s || '').split('"').join('""') + '"';
    const period = mode === 'week' ? 'hebdo' : 'mensuel';
    const lines: string[] = [];
    lines.push([`Récap ${period}`].map(escape).join(','));
    lines.push(['Début', 'Fin'].map(escape).join(','));
    lines.push([range.start.toISOString().slice(0,10), range.end.toISOString().slice(0,10)].map(escape).join(','));
  lines.push('');
  lines.push(['Indicateurs cumulés'].map(escape).join(','));
    lines.push(['Ventes confirmées','Mails envoyés','Absence','Congés','Retard','Sanction','Démission','Présents cumulés','Absents cumulés','Non marqués cumulés','Ventes du jour (sommes)'].map(escape).join(','));
    lines.push([
      String(agg.metrics.salesConfirmed),
      String(agg.metrics.mailsSent),
      String(agg.metrics.absence),
      String(agg.metrics.conges),
      String(agg.metrics.retard),
      String(agg.metrics.sanction),
      String(agg.metrics.demission),
      String(agg.metrics.presentCount),
      String(agg.metrics.absentCount),
      String(agg.metrics.unmarkedCount),
      String(agg.metrics.totalSalesOfDay)
    ].map(escape).join(','));
  lines.push('');
    lines.push(['Ventes par vendeur (cumulées)'].map(escape).join(','));
    lines.push(['Vendeur','Ventes'].map(escape).join(','));
    agg.salesBySeller.forEach(s=>{
      lines.push([s.name, String(s.count)].map(escape).join(','));
    });
    return lines.join('\n');
  };

  const downloadCsv = () => {
    const csv = toCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const period = mode === 'week' ? 'hebdo' : 'mensuel';
    a.href = url;
    a.download = `recap-${period}-${range.start.toISOString().slice(0,10)}_${range.end.toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">Récap {mode === 'week' ? 'hebdomadaire' : 'mensuel'}</div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setMode('week')} className={`text-[10px] px-2 py-1 rounded-md border ${mode==='week'?'bg-indigo-600 text-white border-indigo-600':'bg-white border-gray-300'}`}>Hebdo</button>
          <button onClick={()=>setMode('month')} className={`text-[10px] px-2 py-1 rounded-md border ${mode==='month'?'bg-indigo-600 text-white border-indigo-600':'bg-white border-gray-300'}`}>Mensuel</button>
          <button onClick={downloadCsv} className="text-[10px] px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50">Télécharger CSV</button>
        </div>
      </div>
      {loading && <div className="text-[11px] text-gray-500">Chargement…</div>}
      {error && <div className="text-[11px] text-red-600">{error}</div>}
      {!loading && !error && (
        data.length === 0 ? (
          <div className="text-[11px] text-gray-500">Aucun récap sur la période</div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Résumé métriques */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">Ventes conf.: {agg.metrics.salesConfirmed}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">Mails: {agg.metrics.mailsSent}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">Abs.: {agg.metrics.absence}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">Congés: {agg.metrics.conges}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">Retard: {agg.metrics.retard}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">Sanction: {agg.metrics.sanction}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">Démission: {agg.metrics.demission}</span>
            </div>
            {/* Ventes par vendeur cumulées */}
            <div className="flex flex-wrap gap-1 mt-1">
              {agg.salesBySeller.map(s=> (
                <span key={s.name} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 shadow-sm">{s.name}<span className="ml-1 font-semibold">{s.count}</span></span>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};
