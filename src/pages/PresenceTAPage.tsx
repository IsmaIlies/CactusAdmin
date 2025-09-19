import React from 'react';
import PresenceTAModule from '../components/admin/PresenceTAModule';
import Sidebar from '../components/Sidebar';

const PresenceTAPage: React.FC = () => {
  return (
    <div className="flex h-screen bg-sand-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-hidden">
          <div className="h-full overflow-auto p-6">
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
              <PresenceTAModule title="🗓️ Présence TA" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenceTAPage;
