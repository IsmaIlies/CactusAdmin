import React from "react";
import Sidebar from "./Sidebar";

const SidebarLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen bg-cactus-900">
    <Sidebar />
    <main className="flex-1 flex items-center justify-center p-4">
      {children}
    </main>
  </div>
);

export default SidebarLayout;
