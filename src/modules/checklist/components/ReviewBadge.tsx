import React from 'react';

const colors: Record<string, string> = {
  Pending: '#f59e0b',
  Approved: '#10b981',
  Rejected: '#ef4444',
};

export const ReviewBadge: React.FC<{ status: string; children?: React.ReactNode }> = ({ status, children }) => {
  const bg = colors[status] || '#6b7280';
  return <span style={{ background: bg, color: 'white', padding: '2px 8px', borderRadius: 8, fontSize: 12 }}>{children || status}</span>;
};

export default ReviewBadge;
