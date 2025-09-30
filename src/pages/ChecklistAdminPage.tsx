// Input toujours éditable pour Brief, sauvegarde au blur uniquement
function BriefDirectInput({ entry }: { entry: AdminEntry }) {
  const [value, setValue] = React.useState(
    typeof entry.briefCount === 'number' ? String(entry.briefCount) : ''
  );
  React.useEffect(() => {
    setValue(typeof entry.briefCount === 'number' ? String(entry.briefCount) : '');
  }, [entry.briefCount]);

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : Number(e.target.value);
    await updateEntryFields(entry._docId, { briefCount: val });
  };

  return (
    <input
      type="number"
      min={0}
      value={value}
      style={{
        width: 60,
        textAlign: 'center',
        background: '#f3f4f6',
        color: '#222',
        border: '1px solid #bbb',
        borderRadius: 4
      }}
      onChange={e => setValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
}
import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
// CSV export utility
function exportChecklistToCSV(entries: AdminEntry[], period: string) {
  if (!entries.length) return;
  // Titres et structure identiques à ChecklistArchivesPage
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
  const rows = entries.map(e => {
    const agent = (e.userDisplayName && e.userDisplayName.trim()) || e.userEmail || e.userId || '';
    const superviseur = (e as any).superviseur || '---';
    const morningStart = e.morningStart ? formatHour(pad(e.morningStart)) : '---';
    const morningEnd = e.morningEnd ? formatHour(pad(e.morningEnd)) : '---';
    const afternoonStart = e.afternoonStart ? formatHour(pad(e.afternoonStart)) : '---';
    const afternoonEnd = e.afternoonEnd ? formatHour(pad(e.afternoonEnd)) : '---';
    const prod = (e.morningStart && e.morningEnd) ? duration(e.morningStart, e.morningEnd) : '---';
  const brief = formatBriefCount((e as any).briefCount);
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
    const check = e.reviewStatus === EntryReviewStatus.Approved ? 'APPROUVÉ' : (e.reviewStatus === EntryReviewStatus.Pending ? 'EN ATTENTE' : 'REJETÉ');
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
  const escape = (v: string | number) => String(v ?? '').replace(/;/g, ',');
  const csvLines = [columns.join(';')];
  for (const row of rows) {
    csvLines.push(row.map(escape).join(';'));
    csvLines.push(Array(columns.length).fill('---').join(';'));
  }
  csvLines.splice(1, 0, '');
  const csv = csvLines.join('\r\n');
  // Add BOM for Excel compatibility with accents/special chars
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `heures_${period}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
import { ReviewBadge } from '../modules/checklist/components/ReviewBadge';
import StatusBadge from '../modules/checklist/components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { EntryReviewStatus, ProjectOption, Status } from '../modules/checklist/lib/constants';
import { DayEntry } from '../modules/checklist/lib/storage';
import { computeWorkedMinutes, formatDayLabel, formatMonthLabel, formatBriefCount } from '../modules/checklist/lib/time';
import '../modules/checklist/styles/base.css';
import ChecklistTopHeader from '../modules/checklist/components/ChecklistTopHeader';
import {
  approveEntry,
  bulkUpdateEntries,
  deleteEntry,
  subscribeEntriesByPeriod,
  updateEntryFields,
} from '../services/hoursService';

type AdminEntry = DayEntry & {
  _docId: string;
  userId: string;
  userDisplayName?: string | null;
  userEmail?: string | null;
  rejectionNote?: string | null;
  disputeMessage?: string | null;
  superviseur?: string | null;
};

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatHoursCompact = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}h${String(mins).padStart(2, '0')}`;
};

const ChecklistAdminPage: React.FC = () => {
  const ALLOWED_PROJECTS = useMemo<ProjectOption[]>(() => (
    ['CANAL 211', 'CANAL 214', 'CANAL 210', 'BRIEF'] as ProjectOption[]
  ), []);
  const [periodFilter, setPeriodFilter] = useState<string>(currentPeriod());
  const { isAdmin, isDirection } = useAuth();
  const [remoteEntries, setRemoteEntries] = useState<AdminEntry[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionDraft, setRejectionDraft] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<AdminEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeEntriesByPeriod(periodFilter, (list) => {
      const rows: AdminEntry[] = list.map((entry) => {
        const displayName = entry.userDisplayName ? entry.userDisplayName.trim() : '';
        // Support both 'superviseur' (fr) and 'supervisor' (en) fields
        let superviseur = (entry as any).superviseur;
        if (superviseur == null && (entry as any).supervisor != null) {
          superviseur = (entry as any).supervisor;
        }
        return {
          id: entry.id,
          day: entry.day,
          includeMorning: entry.includeMorning,
          includeAfternoon: entry.includeAfternoon,
          morningStart: entry.morningStart,
          morningEnd: entry.morningEnd,
          afternoonStart: entry.afternoonStart,
          afternoonEnd: entry.afternoonEnd,
          project: entry.project,
          notes: entry.notes,
          status: entry.status,
          reviewStatus: entry.reviewStatus,
          hasDispute: entry.hasDispute,
          rejectionNote: entry.rejectionNote,
          disputeMessage: (entry as any).disputeMessage ?? null,
          userId: entry.userId,
          userDisplayName: displayName || entry.userDisplayName,
          userEmail: entry.userEmail,
          _docId: entry._docId,
          briefCount: (entry as any).briefCount ?? null,
          superviseur: superviseur ?? null,
        };
      });
      setRemoteEntries(rows);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [periodFilter, refreshKey]);

  useEffect(() => {
    if (selectedUserId === 'all') return;
    if (!remoteEntries.some((entry) => entry.userId === selectedUserId)) {
      setSelectedUserId('all');
    }
  }, [remoteEntries, selectedUserId]);

  const userOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    remoteEntries.forEach((entry) => {
      const label = (entry.userDisplayName && entry.userDisplayName.trim()) || entry.userEmail || entry.userId;
      map.set(entry.userId, { value: entry.userId, label });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [remoteEntries]);

  const filteredEntries = useMemo(() => {
    if (selectedUserId === 'all') return remoteEntries;
    return remoteEntries.filter((entry) => entry.userId === selectedUserId);
  }, [remoteEntries, selectedUserId]);

  const pendingEntries = useMemo(
    () => filteredEntries.filter((entry) => entry.reviewStatus !== EntryReviewStatus.Approved || entry.hasDispute),
    [filteredEntries]
  );

  const historyEntries = useMemo(
    () => filteredEntries.filter((entry) => entry.reviewStatus === EntryReviewStatus.Approved && !entry.hasDispute),
    [filteredEntries]
  );

  const displayedEntries = useMemo(() => {
    const source = viewMode === 'pending' ? pendingEntries : historyEntries;
    return [...source].sort((a, b) => {
      const byDay = a.day.localeCompare(b.day);
      if (byDay !== 0) return byDay;
      const labelA = (a.userDisplayName && a.userDisplayName.trim()) || a.userEmail || a.userId;
      const labelB = (b.userDisplayName && b.userDisplayName.trim()) || b.userEmail || b.userId;
      return labelA.localeCompare(labelB, 'fr', { sensitivity: 'base' });
    });
  }, [historyEntries, pendingEntries, viewMode]);

  const totalMinutesPeriod = useMemo(
    () => filteredEntries.reduce((acc, entry) => acc + computeWorkedMinutes(entry), 0),
    [filteredEntries]
  );

  const submittedDaysCount = useMemo(() => {
    const days = new Set<string>();
    filteredEntries.forEach((entry) => {
      if (entry.status === 'submitted' || entry.reviewStatus === EntryReviewStatus.Approved) {
        days.add(entry.day);
      }
    });
    return days.size;
  }, [filteredEntries]);

  const summaryStatus = useMemo<Status>(() => {
    if (!filteredEntries.length) return Status.Draft;
    const hasRejection = filteredEntries.some((entry) => entry.reviewStatus === EntryReviewStatus.Rejected || entry.hasDispute);
    if (hasRejection) return Status.Rejected;
    const allApproved = filteredEntries.every((entry) => entry.reviewStatus === EntryReviewStatus.Approved);
    if (allApproved) return Status.Approved;
    return Status.Submitted;
  }, [filteredEntries]);

  const changeEditingField = useCallback(<K extends keyof DayEntry>(field: K, value: DayEntry[K]) => {
    setEditingDraft((draft) => (draft ? { ...draft, [field]: value } : draft));
  }, []);

  const startEditingEntry = useCallback((entry: AdminEntry) => {
    setEditingDocId(entry._docId);
    setEditingDraft({ ...entry });
  }, []);

  const cancelEditingEntry = useCallback(() => {
    setEditingDocId(null);
    setEditingDraft(null);
  }, []);

  const saveEditingEntry = useCallback(async () => {
    if (!editingDocId || !editingDraft) return;
    await updateEntryFields(editingDocId, {
      morningStart: editingDraft.morningStart,
      morningEnd: editingDraft.morningEnd,
      afternoonStart: editingDraft.afternoonStart,
      afternoonEnd: editingDraft.afternoonEnd,
      project: editingDraft.project,
      briefCount: editingDraft.briefCount,
      rejectionNote: editingDraft.rejectionNote ?? null,
      superviseur: editingDraft.superviseur === null ? undefined : editingDraft.superviseur,
    });
    // Force immediate local update for better UX
    setRemoteEntries((prev) => prev.map(e =>
      e._docId === editingDocId ? { ...e, ...editingDraft } : e
    ));
    setEditingDocId(null);
    setEditingDraft(null);
  }, [editingDocId, editingDraft]);

  const onPeriodFilterChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value || currentPeriod();
    setPeriodFilter(value);
  }, []);

  const onUserFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserId(event.target.value);
  }, []);

  const onApproveAll = useCallback(async () => {
    const targets = pendingEntries.map((entry) => entry._docId);
    if (!targets.length) return;
    await bulkUpdateEntries(targets, {
      reviewStatus: EntryReviewStatus.Approved,
      hasDispute: false,
      rejectionNote: null,
      status: 'submitted',
    });
    setIsRejecting(false);
    setRejectionDraft('');
  }, [pendingEntries]);

  const onResetToDraft = useCallback(async () => {
    const targets = pendingEntries.map((entry) => entry._docId);
    if (!targets.length) return;
    await bulkUpdateEntries(targets, {
      reviewStatus: EntryReviewStatus.Pending,
      status: 'draft',
      hasDispute: false,
      rejectionNote: null,
    });
  }, [pendingEntries]);

  const confirmRejection = useCallback(async () => {
    const note = rejectionDraft.trim();
    if (!note) return;
    const targets = pendingEntries.map((entry) => entry._docId);
    if (!targets.length) return;
    await bulkUpdateEntries(targets, {
      reviewStatus: EntryReviewStatus.Rejected,
      status: 'draft',
      hasDispute: true,
      rejectionNote: note,
    });
    setIsRejecting(false);
    setRejectionDraft('');
  }, [pendingEntries, rejectionDraft]);

  const selectedUserLabel = useMemo(() => {
    if (selectedUserId === 'all') return 'Tous les agents';
    return userOptions.find((option) => option.value === selectedUserId)?.label || selectedUserId;
  }, [selectedUserId, userOptions]);

  const disableBulkActions = selectedUserId === 'all' || pendingEntries.length === 0;
  const heroPeriodLabel = formatMonthLabel(periodFilter).toUpperCase();
  const totalHoursDisplay = formatHoursCompact(totalMinutesPeriod);
  const emptyStateMessage = useMemo(() => {
    const scope = selectedUserId === 'all' ? 'les agents' : selectedUserLabel;
    if (viewMode === 'pending') return `Aucune demande en cours pour ${scope} sur la période ${heroPeriodLabel}.`;
    return `Aucun historique validé pour ${scope} sur la période ${heroPeriodLabel}.`;
  }, [heroPeriodLabel, selectedUserId, selectedUserLabel, viewMode]);

  return (
    <div className="cactus-hours-theme">
      <div className="page-shell">

  <ChecklistTopHeader />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 12 }}>
          <button className="button button--outline" onClick={() => exportChecklistToCSV(displayedEntries, periodFilter)}>
            Exporter en CSV
          </button>
        </div>

        <div className="admin-hero">
          <div>
            <h2 className="page-title">Supervision des heures</h2>
            <span className="hero-subtitle">PERIODE {heroPeriodLabel}</span>
          </div>
          <div className="admin-hero__controls">
            <div className="admin-hero__inputs">
              <input type="month" className="input input--hero" value={periodFilter} onChange={onPeriodFilterChange} />
              <select className="select select--hero" value={selectedUserId} onChange={onUserFilterChange}>
                <option value="all">Tous les agents</option>
                {userOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-hero__actions">
              <button type="button" className="button button--ghost" onClick={() => setRefreshKey((prev) => prev + 1)}>
                Rafraichir
              </button>
            </div>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-summary-card__col">
            <div className="admin-summary-card__label">Mes declarations</div>
            <div className="admin-summary-card__value admin-summary-card__value--period">{periodFilter}</div>
          </div>
          <div className="admin-summary-card__divider" />
          <div className="admin-summary-card__col">
            <div className="admin-summary-card__label">Total heures</div>
            <div className="admin-summary-card__metric">{totalHoursDisplay}</div>
          </div>
          <div className="admin-summary-card__divider" />
          <div className="admin-summary-card__col">
            <div className="admin-summary-card__label">Jours soumis</div>
            <div className="admin-summary-card__metric">{String(submittedDaysCount).padStart(2, '0')}</div>
            <span className="admin-summary-card__badge">Soumis</span>
          </div>
        </div>

        
        <div className="admin-view-toggle">
          <button
            type="button"
            className={`button button--segmented ${viewMode === 'pending' ? 'button--segmented-active' : ''}`}
            onClick={() => setViewMode('pending')}
          >
            En cours ({pendingEntries.length})
          </button>
          <button
            type="button"
            className={`button button--segmented ${viewMode === 'history' ? 'button--segmented-active' : ''}`}
            onClick={() => setViewMode('history')}
          >
            Historique valide ({historyEntries.length})
          </button>
        </div>

        <div className="admin-insight-card">
          Le superviseur peut approuver ou modifier la check-list depuis son espace admin.
        </div>

        {displayedEntries.length === 0 ? (
          <div className="empty-state">
            <div className="icon-badge">i</div>
            <div style={{ fontWeight: 700 }}>{emptyStateMessage}</div>
            <div style={{ fontSize: 12 }}>Ajustez les filtres (période ou agent) ou revenez plus tard.</div>
          </div>
        ) : (
          <div className="table-container table-container--elevated">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Agent</th>
                    <th>Superviseur</th>
                    <th>Matin</th>
                    <th>Apres-midi</th>
                    <th>Operation</th>
                    <th>Motif</th>
                    <th>Brief</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEntries.map((entry) => {
                    // Admins or Direction can edit even validated (history) entries
                    const isEditingAllowed = viewMode === 'pending' || isAdmin() || isDirection();
                    const isEditing = isEditingAllowed && editingDocId === entry._docId && editingDraft;
                    const draftSource = isEditing && editingDraft ? editingDraft : entry;
                    const agentLabel = (draftSource.userDisplayName && draftSource.userDisplayName.trim()) || draftSource.userEmail || draftSource.userId;
                    return (
                      <tr key={entry._docId}>
                        <td>
                          <div className="table-day">
                            <strong>{formatDayLabel(entry.day)}</strong>
                            <span>{entry.day}</span>
                          </div>
                        </td>
                        <td>{agentLabel}</td>
                        <td>
                          {typeof draftSource.superviseur === 'string' && draftSource.superviseur.trim() !== ''
                            ? draftSource.superviseur
                            : <span style={{color:'#b0b0b0',fontStyle:'italic'}}>—</span>}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="time-grid">
                              <input
                                className="input input--time"
                                type="time"
                                value={draftSource.morningStart}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => changeEditingField('morningStart', event.target.value)}
                              />
                              <input
                                className="input input--time"
                                type="time"
                                value={draftSource.morningEnd}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => changeEditingField('morningEnd', event.target.value)}
                              />
                            </div>
                          ) : (
                            draftSource.includeMorning ? `${draftSource.morningStart} -> ${draftSource.morningEnd}` : 'N/A'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="time-grid">
                              <input
                                className="input input--time"
                                type="time"
                                value={draftSource.afternoonStart}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => changeEditingField('afternoonStart', event.target.value)}
                              />
                              <input
                                className="input input--time"
                                type="time"
                                value={draftSource.afternoonEnd}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => changeEditingField('afternoonEnd', event.target.value)}
                              />
                            </div>
                          ) : (
                            draftSource.includeAfternoon ? `${draftSource.afternoonStart} -> ${draftSource.afternoonEnd}` : 'N/A'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <select
                              className="select select--operation"
                              value={draftSource.project}
                              onChange={(event: ChangeEvent<HTMLSelectElement>) => changeEditingField('project', event.target.value as ProjectOption)}
                            >
                              {ALLOWED_PROJECTS.map((project) => (
                                <option key={project} value={project}>
                                  {project}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="project-pill">{draftSource.project}</span>
                          )}
                        </td>
                        <td>
                          {/* Motif rejet : input moderne en édition, badge coloré ou tiret stylé sinon */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftSource.rejectionNote ?? ''}
                              placeholder="Saisir un motif…"
                              style={{
                                width: 140,
                                background: '#f8fafc',
                                color: '#1a2b2b',
                                border: '1.5px solid #b5c2c2',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                boxShadow: '0 1px 2px #0001',
                                transition: 'border 0.2s',
                              }}
                              onFocus={e => (e.target.style.border = '1.5px solid #1abc9c')}
                              onBlur={e => (e.target.style.border = '1.5px solid #b5c2c2')}
                              onChange={e => changeEditingField('rejectionNote' as any, e.target.value)}
                            />
                          ) : entry.rejectionNote ? (
                            <span
                              style={{
                                display: 'inline-block',
                                background: '#ffeaea',
                                color: '#c0392b',
                                borderRadius: 8,
                                padding: '3px 10px',
                                fontWeight: 600,
                                fontSize: 14,
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={entry.rejectionNote}
                            >
                              {entry.rejectionNote}
                            </span>
                          ) : entry.hasDispute ? (
                            <span
                              style={{
                                display: 'inline-block',
                                background: '#fffbe6',
                                color: '#b8860b',
                                borderRadius: 8,
                                padding: '3px 10px',
                                fontWeight: 600,
                                fontSize: 14,
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={entry.disputeMessage || entry.notes || 'Réclamation'}
                            >
                              Réclamation
                            </span>
                          ) : (
                            <span style={{ color: '#b0b0b0', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={draftSource.briefCount ?? ''}
                              placeholder="Saisir un brief…"
                              style={{
                                width: 80,
                                background: '#f8fafc',
                                color: '#1a2b2b',
                                border: '1.5px solid #b5c2c2',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 15,
                                fontWeight: 500,
                                outline: 'none',
                                boxShadow: '0 1px 2px #0001',
                                textAlign: 'center',
                                transition: 'border 0.2s',
                              }}
                              onFocus={e => (e.target.style.border = '1.5px solid #1abc9c')}
                              onBlur={e => (e.target.style.border = '1.5px solid #b5c2c2')}
                              onChange={e => changeEditingField('briefCount', e.target.value === '' ? null : Number(e.target.value))}
                            />
                          ) : (entry.briefCount !== undefined && entry.briefCount !== null && !isNaN(Number(entry.briefCount))) ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'linear-gradient(90deg, #b9fbc0 0%, #2ecc40 100%)',
                                color: '#14532d',
                                borderRadius: 16,
                                padding: '4px 14px 4px 10px',
                                fontWeight: 700,
                                fontSize: 15,
                                minWidth: 44,
                                textAlign: 'center',
                                boxShadow: '0 2px 8px #2ecc4033',
                                border: '1.5px solid #2ecc40',
                                letterSpacing: 0.5,
                                transition: 'box-shadow 0.2s',
                              }}
                              title={`Brief: ${formatBriefCount(entry.briefCount)}`}
                            >
                              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{marginRight: 3}} xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="#fff" stroke="#2ecc40" strokeWidth="2"/><path d="M7.5 10.5L9.5 12.5L13 9" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              {formatBriefCount(entry.briefCount)}
                            </span>
                          ) : (
                            <span style={{ color: '#b0b0b0', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td>
                          <ReviewBadge status={draftSource.reviewStatus}>
                            {draftSource.reviewStatus === EntryReviewStatus.Approved
                              ? 'Validé'
                              : draftSource.reviewStatus === EntryReviewStatus.Pending
                              ? 'En attente'
                              : 'Rejeté'}
                          </ReviewBadge>
                        </td>
                        <td>
                          <div className="table-actions">
                            {isEditing ? (
                              <>
                                <button type="button" className="button button--ghost" onClick={cancelEditingEntry}>
                                  Annuler
                                </button>
                                <button type="button" className="button" onClick={saveEditingEntry}>
                                  Valider modif
                                </button>
                              </>
                            ) : isEditingAllowed ? (
                              <>
                                <button type="button" className="button button--secondary" onClick={() => startEditingEntry(entry)}>
                                  Modifier
                                </button>
                                <button type="button" className="button" onClick={async () => {
                                  await approveEntry(entry._docId);
                                }}>
                                  Valider
                                </button>
                                <button type="button" className="button button--danger" onClick={async () => {
                                  await deleteEntry(entry._docId);
                                }}>
                                  Refuser
                                </button>
                              </>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="admin-summary-footer">
          <div>
            <h3>{selectedUserLabel}</h3>
            <span>{periodFilter}</span>
          </div>
          <div className="admin-summary-footer__status">
            <div>
              <div className="summary-footer-label">Total heures</div>
              <div className="summary-footer-value">{totalHoursDisplay}</div>
            </div>
            <StatusBadge status={summaryStatus} />
          </div>
        </div>

        {isRejecting && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h4 className="modal-title">Motif du rejet</h4>
              <textarea
                className="textarea textarea--elevated"
                placeholder="Expliquez la raison du rejet"
                value={rejectionDraft}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRejectionDraft(event.target.value)}
              />
              <div className="modal-actions">
                <button type="button" className="button button--danger" onClick={confirmRejection}>
                  Confirmer le rejet
                </button>
                <button type="button" className="button button--ghost" onClick={() => setIsRejecting(false)}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default ChecklistAdminPage;

