import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isSchedulePage = location.pathname === '/escala' || location.pathname === '/escala-control';

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        style={{ 
          marginLeft: collapsed ? 72 : 260,
          transition: 'margin-left 0.3s ease-in-out'
        }}
        className="flex-1 h-screen overflow-hidden"
      >
        {isSchedulePage ? (
          <div className="h-full overflow-y-auto p-4 flex flex-col">
            <Outlet />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="p-6 max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}