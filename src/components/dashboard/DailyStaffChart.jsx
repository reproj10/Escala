import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailyStaffChart({ scheduleEntries, daysInMonth = 31 }) {
  const data = useMemo(() => {
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      let present = 0;
      let absent = 0;
      scheduleEntries.forEach(entry => {
        const val = entry.days?.[String(d)];
        if (val === 'P') present++;
        else if (val && val !== '') absent++;
      });
      days.push({ day: d, presentes: present, ausentes: absent });
    }
    return days;
  }, [scheduleEntries, daysInMonth]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <h3 className="text-sm font-semibold mb-4">Dimensionamento Diário — Presentes vs Ausentes</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Area type="monotone" dataKey="presentes" stroke="hsl(173, 58%, 39%)" fill="url(#colorPresent)" strokeWidth={2} animationDuration={2000} />
            <Area type="monotone" dataKey="ausentes" stroke="hsl(0, 72%, 51%)" fill="url(#colorAbsent)" strokeWidth={2} animationDuration={2000} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}