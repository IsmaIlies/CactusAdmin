import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type Props = {
  active?: 'admin' | 'archives' | 'agent';
};

const ChecklistTopHeader: React.FC<Props> = ({ active }) => {
  const location = useLocation();
  // Fallback to URL if prop not provided
  const isAdmin = active === 'admin' || (!active && location.pathname.includes('/dashboard/checklist-admin'));
  const isArchives = active === 'archives' || (!active && location.pathname.includes('/dashboard/checklist-archives'));

  return (
    <div className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <div className="brand-title">Cactus Admin</div>
        <div className="brand-subtitle">Gestion des heures</div>
      </div>
      <div className="top-tabs">
        <Link to="/dashboard/checklist-admin" className={`top-tab ${isAdmin ? 'top-tab--active' : ''}`}>ADMIN</Link>
        <Link to="/dashboard/checklist-archives" className={`top-tab ${isArchives ? 'top-tab--active' : ''}`}>ARCHIVES</Link>
      </div>
    </div>
  );
};

export default ChecklistTopHeader;
