import React from 'react';
import Sidebar from '../components/Sidebar';
import ChecklistAdminPage from './ChecklistAdminPage';

const ChecklistAdminShell: React.FC = () => {
  return (
    <div className="flex h-screen bg-sand-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-hidden">
          <div className="h-full overflow-auto p-3">
            <div className="max-w-full w-full flex flex-col gap-6">
              <ChecklistAdminPage />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistAdminShell;
