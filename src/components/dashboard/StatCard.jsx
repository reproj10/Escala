import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, subtitle, icon: Icon, color, delay = 0, onClick }) {
  const colorMap = {
    teal: 'bg-primary/10 text-primary',
    blue: 'bg-accent/10 text-accent',
    red: 'bg-destructive/10 text-destructive',
    yellow: 'bg-warning/10 text-warning',
    green: 'bg-success/10 text-success',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      onClick={onClick}
      className="bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] select-none"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.teal}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}