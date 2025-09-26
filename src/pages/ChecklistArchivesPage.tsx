// CSV export utility for validated entries

// Nouvelle version robuste de l'export CSV
function exportArchivesToCSV(entries: AdminArchiveEntry[], period: string) {
  if (!entries.length) return;
  // Titres en majuscules pour plus de clarté
  const columns = [
    "NOM DE L'AGENT", 'JOURNÉE', 'SUPERVISEUR', 'PRISE MATIN', 'FIN MATIN', 'PRISE APRÈS-MIDI', 'FIN AM',
    'PROD', 'BRIEF', 'TOTAL', 'OPÉRATION', 'CHECK', 'SEMAINE', 'MOIS'
  ];
  const pad = (v?: string | null) => v && v.length === 5 ? v : (v || '').padStart(5, '0');
  const formatHour = (v?: string | null) => v && v.length === 5 ? v.replace(':', 'h') : (v || '');
  const duration = (start?: string | null, end?: string | null) => {
    if (!start || !end) return '00h00';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (isNaN(mins) || mins < 0) return '00h00';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
  };
  function getWeek(dateStr: string) {
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - (d.getDay()||7));
    const yearStart = new Date(d.getFullYear(),0,1);
    const weekNo = Math.ceil((((d.getTime()-yearStart.getTime())/86400000)+1)/7);
    return `S${String(weekNo).padStart(2,'0')}`;
  }
  // Mapping robuste de chaque entrée
  const rows = entries.map(e => {
    // Champs robustes
    const agent = (e.userDisplayName && e.userDisplayName.trim()) || e.userEmail || e.userId || '';
    const superviseur = (e as any).superviseur || '---';
    const morningStart = e.morningStart ? formatHour(pad(e.morningStart)) : '---';
    const morningEnd = e.morningEnd ? formatHour(pad(e.morningEnd)) : '---';
    const afternoonStart = e.afternoonStart ? formatHour(pad(e.afternoonStart)) : '---';
    const afternoonEnd = e.afternoonEnd ? formatHour(pad(e.afternoonEnd)) : '---';
    const prod = (e.morningStart && e.morningEnd) ? duration(e.morningStart, e.morningEnd) : '---';
    const brief = (typeof e.briefCount === 'number' && !isNaN(e.briefCount)) ? `${e.briefCount.toString().padStart(2, '0')}h00` : '---';
    const total = (() => {
      const d1 = (e.morningStart && e.morningEnd) ? duration(e.morningStart, e.morningEnd) : '00h00';
      const d2 = (e.afternoonStart && e.afternoonEnd) ? duration(e.afternoonStart, e.afternoonEnd) : '00h00';
      const [h1, m1] = d1.split('h').map(Number);
      const [h2, m2] = d2.split('h').map(Number);
      const briefMins = (typeof e.briefCount === 'number' && !isNaN(e.briefCount)) ? e.briefCount * 60 : 0;
      const totalMins = (h1*60+m1)+(h2*60+m2)-briefMins;
      return totalMins > 0 ? `${String(Math.floor(totalMins/60)).padStart(2,'0')}h${String(totalMins%60).padStart(2,'0')}` : '---';
    })();
    const operation = e.project || '---';
    const check = 'APPROUVÉ';
    const semaine = getWeek(e.day);
    const mois = period;
    return [
      agent,
      e.day || '---',
      superviseur,
      morningStart,
      morningEnd,
      afternoonStart,
      afternoonEnd,
      prod,
      brief,
      total,
      operation,
      check,
      semaine,
      mois
    ];
  });
  // Séparateur visuel entre chaque entrée
  // Pas de guillemets, accents autorisés, point-virgule comme séparateur
  const escape = (v: string | number) => String(v ?? '').replace(/;/g, ',');
  const sep = Array(columns.length).fill('---').join(';');
  // Générer le CSV avec une ligne de séparation après chaque entrée
  const csvLines = [columns.join(';')];
  for (const row of rows) {
    csvLines.push(row.map(escape).join(';'));
    csvLines.push(Array(columns.length).fill('---').join(';'));
  }
  // Ajoute une ligne vide après l'en-tête comme sur l'image
  csvLines.splice(1, 0, '');
  const csv = csvLines.join('\r\n');
  // Add BOM for Excel compatibility with accents/special chars
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `archives_validees_${period}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import ChecklistTopHeader from '../modules/checklist/components/ChecklistTopHeader';
import '../modules/checklist/styles/base.css';
import { subscribeEntriesByPeriod } from '../services/hoursService';
import { computeWorkedMinutes, formatDayLabel, formatMonthLabel } from '../modules/checklist/lib/time';
import { EntryReviewStatus } from '../modules/checklist/lib/constants';

type AdminArchiveEntry = {
  _docId: string;
  id: string;
  day: string; // normalized YYYY-MM-DD
  project: string;
  status: 'draft'|'submitted';
  reviewStatus: EntryReviewStatus;
  includeMorning: boolean;
  includeAfternoon: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  notes?: string;
  briefCount?: number | null;
  userId: string;
  userDisplayName?: string | null;
  userEmail?: string | null;
  hasDispute?: boolean;
  disputeMessage?: string | null;
};

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const ChecklistArchivesPage: React.FC = () => {
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [entries, setEntries] = useState<AdminArchiveEntry[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [onlySubmitted, setOnlySubmitted] = useState<boolean>(true);

  useEffect(() => {
    const unsub = subscribeEntriesByPeriod(period, (list) => {
      const rows: AdminArchiveEntry[] = list.map((e) => ({
        _docId: e._docId,
        id: e.id,
        day: e.day,
        project: e.project,
        status: e.status,
        reviewStatus: e.reviewStatus,
        includeMorning: e.includeMorning,
        includeAfternoon: e.includeAfternoon,
        morningStart: e.morningStart,
        morningEnd: e.morningEnd,
        afternoonStart: e.afternoonStart,
        afternoonEnd: e.afternoonEnd,
        notes: e.notes,
        briefCount: (e as any).briefCount ?? null,
        userId: e.userId,
        userDisplayName: e.userDisplayName,
        userEmail: e.userEmail,
        hasDispute: (e as any).hasDispute ?? false,
        disputeMessage: (e as any).disputeMessage ?? null,
      }));
      setEntries(rows);
    });
    return () => { try { unsub && (unsub as any)(); } catch {} };
  }, [period]);

  const formatAgentLabel = (userDisplayName?: string | null, userEmail?: string | null, userId?: string) => {
    return (userDisplayName && userDisplayName.trim()) || userEmail || (userId || '');
  };

  const agents = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    entries.forEach((e) => {
      const label = formatAgentLabel(e.userDisplayName, e.userEmail, e.userId);
      map.set(e.userId, { value: e.userId, label });
    });
    return [{ value: 'all', label: 'Tous les agents' }, ...Array.from(map.values()).sort((a,b)=> a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }))];
  }, [entries]);

  const grouped = useMemo(() => {
    const byUser = new Map<string, { label: string; userId: string; entries: AdminArchiveEntry[]; submittedCount: number; totalMinutes: number }>();
    entries.forEach((e) => {
      const label = formatAgentLabel(e.userDisplayName, e.userEmail, e.userId);
      const key = e.userId;
      if (!byUser.has(key)) byUser.set(key, { label, userId: e.userId, entries: [], submittedCount: 0, totalMinutes: 0 });
      const bucket = byUser.get(key)!;
      bucket.entries.push(e);
  // Considérer toute entrée non brouillon comme soumise (y compris refusée)
  const isSubmitted = e.status === 'submitted' || e.reviewStatus === EntryReviewStatus.Approved || e.reviewStatus === EntryReviewStatus.Rejected;
  if (isSubmitted) bucket.submittedCount += 1;
      bucket.totalMinutes += computeWorkedMinutes(e);
    });
    let list = Array.from(byUser.values());
    if (agentFilter !== 'all') list = list.filter((g) => g.userId === agentFilter);
    if (onlySubmitted) list = list.filter((g) => g.submittedCount > 0);
    // Sort: agents with submissions first, then by name
    list.sort((a,b) => {
      const subDiff = Number(b.submittedCount > 0) - Number(a.submittedCount > 0);
      if (subDiff !== 0) return subDiff;
      return a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
    });
    // Ensure entries sorted by day
    list.forEach((g) => g.entries.sort((a,b)=> a.day.localeCompare(b.day)));
    return list;
  }, [entries, agentFilter, onlySubmitted]);

  const periodLabel = formatMonthLabel(period).toUpperCase();

  return (
    <div className="cactus-hours-theme">
      <div className="page-shell">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 12 }}>
          <button className="button button--outline" onClick={() => exportArchivesToCSV(entries, period)}>
            Exporter en CSV
          </button>
        </div>
        <ChecklistTopHeader />

        <div className="admin-hero">
          <div>
            <h2 className="page-title">Archives des check-lists</h2>
            <span className="hero-subtitle">PERIODE {periodLabel}</span>
          </div>
          <div className="admin-hero__controls">
            <div className="admin-hero__inputs">
              <input type="month" className="input input--hero text-white" value={period} onChange={(e: ChangeEvent<HTMLInputElement>) => setPeriod(e.target.value)} />
              <select className="select select--hero text-white" value={agentFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAgentFilter(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="admin-hero__actions" style={{ gap: 12, display: 'flex', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
                <input type="checkbox" checked={onlySubmitted} onChange={(e)=> setOnlySubmitted(e.target.checked)} />
                <span>Uniquement agents ayant envoyé</span>
              </label>
            </div>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="empty-state">
            <div className="icon-badge">i</div>
            <div style={{ fontWeight: 700 }}>Aucune donnée sur la période {periodLabel}.</div>
            <div style={{ fontSize: 12 }}>Ajustez les filtres (période ou agent) ou revenez plus tard.</div>
          </div>
        ) : (
          <div className="table-container table-container--elevated">
            <div className="table-scroll">
              {grouped.map((g) => (
                <div key={g.userId} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, color: '#fff' }}>{g.label}</h3>
                    {/* Solution ultime : forcer la couleur en blanc avec !important via ref */}
                    <div
                      className={["section-subtitle", "archive-hours-right"].join(" ")}
                      style={{ color: '#fff' }}
                      ref={el => { if (el) el.style.setProperty('color', '#fff', 'important'); }}
                    >
                      Jours envoyés: {g.submittedCount} • Total heures: {Math.floor(g.totalMinutes/60)}h{String(g.totalMinutes%60).padStart(2,'0')}
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Jour</th>
                        <th>Matin</th>
                        <th>Après-midi</th>
                        <th>Opération</th>
                        <th>Heures</th>
                        <th>Brief</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.entries.map((e) => {
                        const workedMinutes = computeWorkedMinutes(e);
                        const briefMinutes = typeof e.briefCount === 'number' && !isNaN(e.briefCount) ? e.briefCount * 60 : 0;
                        const totalMinutes = workedMinutes - briefMinutes;
                        const totalLabel = `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, '0')}`;
                        const morningLabel = e.includeMorning ? `${e.morningStart} - ${e.morningEnd}` : null;
                        const afternoonLabel = e.includeAfternoon ? `${e.afternoonStart} - ${e.afternoonEnd}` : null;
                        const statusInfo = (() => {
                          if (e.reviewStatus === EntryReviewStatus.Approved) return { label: 'Validé', color: '#27ae60', bg: '#eafaf1' };
                          if (e.reviewStatus === EntryReviewStatus.Rejected) return { label: 'Rejeté', color: '#c0392b', bg: '#ffeaea' };
                          return { label: 'En attente', color: '#b8860b', bg: '#fffbe6' };
                        })();
                        return (
                          <tr key={e._docId}>
                            <td>
                              <div className="table-day">
                                <span className="table-day__chip">{formatDayLabel(e.day)}</span>
                                <span className="table-day__date">{e.day}</span>
                              </div>
                            </td>
                            <td className="session-cell">
                              {morningLabel ? (
                                <span className="session-chip session-chip--morning">{morningLabel}</span>
                              ) : (
                                <span className="session-chip session-chip--empty">N/A</span>
                              )}
                            </td>
                            <td className="session-cell">
                              {afternoonLabel ? (
                                <span className="session-chip session-chip--afternoon">{afternoonLabel}</span>
                              ) : (
                                <span className="session-chip session-chip--empty">N/A</span>
                              )}
                            </td>
                            <td><span className="project-pill">{e.project}</span></td>
                            <td className="archives-total-white">
                              <span className="archives-total-chip">{totalLabel}</span>
                            </td>
                            <td>
                              <span className="brief-chip">
                                {(typeof e.briefCount === 'number' && !isNaN(e.briefCount))
                                  ? `${e.briefCount.toString().padStart(2, '0')}h00`
                                  : '---'}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                background: statusInfo.bg,
                                color: statusInfo.color,
                                borderRadius: 8,
                                padding: '3px 12px',
                                fontWeight: 700,
                                fontSize: 14,
                                minWidth: 70,
                                textAlign: 'center',
                                letterSpacing: 0.5,
                                border: `1.5px solid ${statusInfo.color}`,
                              }}>{statusInfo.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistArchivesPage;
