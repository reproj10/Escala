import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ShiftChart({ scheduleEntries }) {
  const shiftCounts = {
    diurno_a: 0,
    diurno_b: 0,
    noturno_a: 0,
    noturno_b: 0,
  };

  scheduleEntries.forEach(entry => {
    if (shiftCounts[entry.shift_type] !== undefined) {
      shiftCounts[entry.shift_type]++;
    }
  });

  const data = [
    { name: 'Diurno A', value: shiftCounts.diurno_a, fill: 'hsl(173, 58%, 39%)' },
    { name: 'Noturno A', value: shiftCounts.noturno_a, fill: 'hsl(199, 89%, 48%)' },
    { name: 'Diurno B', value: shiftCounts.diurno_b, fill: 'hsl(262, 52%, 47%)' },
    { name: 'Noturno B', value: shiftCounts.noturno_b, fill: 'hsl(43, 74%, 66%)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <h3 className="text-sm font-semibold mb-4">Colaboradores por Turno</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}