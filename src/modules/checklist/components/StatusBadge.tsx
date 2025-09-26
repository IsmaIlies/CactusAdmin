import React from 'react';

const map: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: '#6b7280' },
  submitted: { label: 'Soumis', color: '#3b82f6' },
  approved: { label: 'Approuvé', color: '#10b981' },
  rejected: { label: 'Rejeté', color: '#ef4444' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const v = map[status] || { label: status, color: '#6b7280' };
  return <span style={{ background: v.color, color: 'white', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>{v.label}</span>;
};

export default StatusBadge;
