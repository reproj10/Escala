import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'hsl(173, 58%, 39%)',
  'hsl(0, 72%, 51%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(262, 52%, 47%)',
];

export default function StatusPieChart({ employees }) {
  const data = useMemo(() => {
    const counts = { active: 0, inactive: 0, on_leave: 0 };
    employees.forEach(e => {
      counts[e.status || 'active']++;
    });
    return [
      { name: 'Ativos', value: counts.active },
      { name: 'Afastados', value: counts.on_leave },
      { name: 'Inativos', value: counts.inactive },
    ].filter(d => d.value > 0);
  }, [employees]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <h3 className="text-sm font-semibold mb-4">Status dos Colaboradores</h3>
      <div className="h-64 flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              animationDuration={1500}
              animationBegin={300}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
            <span className="text-xs text-muted-foreground">{entry.name} ({entry.value})</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}