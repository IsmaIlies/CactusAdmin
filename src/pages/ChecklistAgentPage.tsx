import React, { useEffect, useMemo, useState } from 'react';
import ChecklistTopHeader from '../modules/checklist/components/ChecklistTopHeader';
import { DayEntry, loadAgentFromStorage, persistAgentState, StoredAgentState } from '../modules/checklist/lib/storage';
import { computeWorkedMinutes, formatDayLabel, formatHours, formatMonthLabel } from '../modules/checklist/lib/time';
import '../modules/checklist/styles/base.css';
import { useAuth } from '../contexts/AuthContext';
import { EntryReviewStatus, PROJECT_OPTIONS, ProjectOption } from '../modules/checklist/lib/constants';
import { submitAgentEntry, subscribeMyEntriesByPeriod } from '../services/hoursService';

const ChecklistAgentPage: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<StoredAgentState>(() => loadAgentFromStorage());
  const [remoteEntries, setRemoteEntries] = useState<Array<DayEntry & { _docId: string }>>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeMyEntriesByPeriod(state.period, user.id, (rows) => {
      setRemoteEntries(rows as any);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [state.period, user]);

  const totalMinutes = useMemo(
    () => remoteEntries.reduce((acc, entry) => acc + computeWorkedMinutes(entry), 0),
    [remoteEntries]
  );

  const SUPERVISEURS = ['Sabrina', 'Julien', 'Ismael', 'Laetitia', 'Samia', 'Arthur'];
  const [draft, setDraft] = useState<DayEntry & { superviseur?: string }>(() => ({
    id: '',
    day: new Date().toISOString().slice(0, 10),
    includeMorning: true,
    includeAfternoon: true,
    morningStart: '09:00',
    morningEnd: '12:00',
    afternoonStart: '14:00',
    afternoonEnd: '18:00',
    project: PROJECT_OPTIONS[0] as ProjectOption,
    notes: '',
    status: 'draft',
    reviewStatus: EntryReviewStatus.Pending,
    hasDispute: false,
    superviseur: SUPERVISEURS[0],
  }));

  const onSubmit = async () => {
    if (!user) return;
  const entry: DayEntry & { superviseur?: string } = { ...draft, id: draft.day };
    const next: StoredAgentState = {
      ...state,
      entries: [...state.entries.filter((existing) => existing.id !== entry.id), entry],
    };
    setState(next);
    persistAgentState(next);

    await submitAgentEntry(
      user.id,
      {
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
  hasDispute: entry.hasDispute,
  superviseur: entry.superviseur,
      } as any,
      {
        userDisplayName: user.displayName,
        userEmail: user.email,
      }
    );
  };

  return (
    <div className="cactus-hours-theme">
      <div className="page-shell">
        <ChecklistTopHeader active="agent" />
        <div className="page-header">
          <div>
            <h2 className="page-title">Mes heures</h2>
            <span className="section-subtitle">Periode {formatMonthLabel(state.period)}</span>
          </div>
          <div className="toolbar">
            <button className="button" onClick={onSubmit} disabled={!user}>Soumettre</button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            <div>
              <div className="date-label">Jour</div>
              <input
                className="input"
                type="date"
                value={draft.day}
                onChange={(event) => setDraft((current) => ({ ...current, day: event.target.value }))}
              />
              <div className="date-chip date-chip--muted">{formatDayLabel(draft.day)}</div>
            </div>
            <div>
              <div className="date-label">Matin</div>
              <div className="time-grid">
                <input
                  className="input input--time"
                  type="time"
                  value={draft.morningStart}
                  onChange={(event) => setDraft((current) => ({ ...current, morningStart: event.target.value }))}
                />
                <input
                  className="input input--time"
                  type="time"
                  value={draft.morningEnd}
                  onChange={(event) => setDraft((current) => ({ ...current, morningEnd: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <div className="date-label">Apres-midi</div>
              <div className="time-grid">
                <input
                  className="input input--time"
                  type="time"
                  value={draft.afternoonStart}
                  onChange={(event) => setDraft((current) => ({ ...current, afternoonStart: event.target.value }))}
                />
                <input
                  className="input input--time"
                  type="time"
                  value={draft.afternoonEnd}
                  onChange={(event) => setDraft((current) => ({ ...current, afternoonEnd: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <div className="date-label">Operation</div>
              <select
                className="select"
                value={draft.project}
                onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value as ProjectOption }))}
              >
                {PROJECT_OPTIONS.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="date-label">Superviseur</div>
              <select
                className="select"
                value={draft.superviseur}
                onChange={(event) => setDraft((current) => ({ ...current, superviseur: event.target.value }))}
              >
                {SUPERVISEURS.map((sup) => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Jour</th>
                  <th>Matin</th>
                  <th>Apres-midi</th>
                  <th>Operation</th>
                </tr>
              </thead>
              <tbody>
                {remoteEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{formatDayLabel(entry.day)}</strong>
                        <span className="section-subtitle">{entry.day}</span>
                      </div>
                    </td>
                    <td>
                      {entry.includeMorning ? `${entry.morningStart} - ${entry.morningEnd}` : 'N/A'}
                    </td>
                    <td>
                      {entry.includeAfternoon ? `${entry.afternoonStart} - ${entry.afternoonEnd}` : 'N/A'}
                    </td>
                    <td>{entry.project}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Recapitulatif</h3>
            <div className="section-subtitle">{state.period}</div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <div className="section-subtitle">Total heures</div>
              <div className="total-highlight">{formatHours(totalMinutes)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistAgentPage;
