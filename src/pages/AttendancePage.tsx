import React, { useEffect, useMemo, useState } from 'react';
import userService from '../services/userService';
import attendanceService from '../services/attendanceService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Users, Check, X, Loader2 } from 'lucide-react';

interface TAUser { id: string; name: string; email?: string; }

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [teleactors, setTeleactors] = useState<TAUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [sendSuccess, setSendSuccess] = useState<string>('');
  const [sendError, setSendError] = useState<string>('');

  const functions = getFunctions(app, 'europe-west9');
  const sendAttendanceEmail = httpsCallable(functions, 'sendAttendanceEmail');

  // Charger les TA
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const all = await userService.getUsers();
        const tas = all.filter(u => (u.role === 'ta' || u.customClaims?.ta));
        const mapped: TAUser[] = tas.map(u => ({ id: u.uid, name: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Sans Nom', email: u.email || undefined }));
        mapped.sort((a,b) => a.name.localeCompare(b.name, 'fr'));
        setTeleactors(mapped);
      } catch (e:any) {
        setLoadError(e.message || 'Erreur chargement utilisateurs');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Charger état de présence pour la date
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setSaving(true);
        const record = await attendanceService.getAttendance(date);
        if (record) {
          setPresentIds(new Set(record.present));
          setAbsentIds(new Set(record.absent));
        } else {
          setPresentIds(new Set());
          setAbsentIds(new Set());
        }
      } finally {
        setSaving(false);
      }
    };
    loadAttendance();
  }, [date]);

  const toggle = (id: string, value: 'present' | 'absent' | 'unset') => {
    setPresentIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    setAbsentIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (value === 'present') setPresentIds(prev => new Set(prev).add(id));
    if (value === 'absent') setAbsentIds(prev => new Set(prev).add(id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await attendanceService.saveAttendance(
        date,
        Array.from(presentIds),
        Array.from(absentIds),
  (user as any)?.uid
      );
    } catch (e:any) {
      alert('Erreur sauvegarde: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const presentList = useMemo(() => teleactors.filter(t => presentIds.has(t.id)), [teleactors, presentIds]);
  const absentList = useMemo(() => teleactors.filter(t => absentIds.has(t.id)), [teleactors, absentIds]);

  const handleSend = async () => {
    try {
      setSending(true);
      setSendError('');
      setSendSuccess('');
      const html = attendanceService.buildAttendanceSummaryHtml(
        date,
        presentList.map(p => ({ name: p.name })),
        absentList.map(a => ({ name: a.name }))
      );
      const resp = await sendAttendanceEmail({ date, present: presentList, absent: absentList, html });
      const data = resp.data as any;
      if (data.success) {
        setSendSuccess('Email envoyé');
      } else {
        setSendError('Echec envoi email');
      }
    } catch (e:any) {
      setSendError(e.message || 'Erreur envoi');
    } finally {
      setSending(false);
    }
  };

  const setAll = (mode: 'present' | 'absent' | 'clear') => {
    if (mode === 'clear') { setPresentIds(new Set()); setAbsentIds(new Set()); return; }
    if (mode === 'present') { setPresentIds(new Set(teleactors.map(t=>t.id))); setAbsentIds(new Set()); return; }
    if (mode === 'absent') { setAbsentIds(new Set(teleactors.map(t=>t.id))); setPresentIds(new Set()); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Feuille de présence (TA)</h1>
        <div className="flex items-center gap-4">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
            Sauvegarder
          </button>
          <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm">
            {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
            Envoyer email
          </button>
        </div>
      </div>

      {loadError && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{loadError}</div>}
      {sendError && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{sendError}</div>}
      {sendSuccess && <div className="p-3 bg-green-100 text-green-700 rounded text-sm">{sendSuccess}</div>}

      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setAll('present')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs">Tous présents</button>
        <button onClick={()=>setAll('absent')} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs">Tous absents</button>
        <button onClick={()=>setAll('clear')} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs">Réinitialiser</button>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Téléacteur</th>
              <th className="px-4 py-2 text-center font-medium">Présent</th>
              <th className="px-4 py-2 text-center font-medium">Absent</th>
              <th className="px-4 py-2 text-center font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loadingUsers ? (
              <tr><td colSpan={4} className="py-10 text-center text-gray-500">Chargement...</td></tr>
            ) : teleactors.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">Aucun téléacteur</td></tr>
            ) : teleactors.map(t => {
              const isPresent = presentIds.has(t.id);
              const isAbsent = absentIds.has(t.id);
              return (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={()=>toggle(t.id, isPresent ? 'unset':'present')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${isPresent ? 'bg-green-500 text-white border-green-500':'border-gray-300 text-gray-400 hover:text-green-600'}`}>✓</button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={()=>toggle(t.id, isAbsent ? 'unset':'absent')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${isAbsent ? 'bg-red-500 text-white border-red-500':'border-gray-300 text-gray-400 hover:text-red-600'}`}>✕</button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isPresent && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Présent</span>}
                    {isAbsent && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">Absent</span>}
                    {!isPresent && !isAbsent && <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4"/> Présents ({presentList.length})</h3>
          <ul className="text-sm space-y-1 max-h-56 overflow-auto pr-1">
            {presentList.map(p=> <li key={p.id}>{p.name}</li>)}
            {presentList.length===0 && <li className="text-gray-400">Aucun</li>}
          </ul>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><X className="w-4 h-4"/> Absents ({absentList.length})</h3>
          <ul className="text-sm space-y-1 max-h-56 overflow-auto pr-1">
            {absentList.map(a=> <li key={a.id}>{a.name}</li>)}
            {absentList.length===0 && <li className="text-gray-400">Aucun</li>}
          </ul>
        </div>
      </div>

    </div>
  );
};

export default AttendancePage;
