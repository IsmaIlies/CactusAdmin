import React from 'react';
import Sidebar from '../components/Sidebar';
import ChecklistArchivesPage from './ChecklistArchivesPage';

const ChecklistArchivesShell: React.FC = () => {
  return (
    <div className="flex h-screen bg-sand-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-hidden">
          <div className="h-full overflow-auto p-3">
            <div className="max-w-full w-full flex flex-col gap-6">
              <ChecklistArchivesPage />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistArchivesShell;
