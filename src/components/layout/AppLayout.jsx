import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isSchedulePage = location.pathname === '/escala';

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <motion.main
        initial={false}
        animate={{ marginLeft: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1 h-screen overflow-hidden"
      >
        {isSchedulePage ? (
          <div className="h-full p-4 flex flex-col">
            <Outlet />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="p-6 max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </div>
        )}
      </motion.main>
    </div>
  );
}