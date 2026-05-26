import React from 'react';
import { motion } from 'framer-motion';

const legend = [
  { sigla: 'P', desc: 'Plantão (12h)', color: 'bg-success/20 text-success' },
  { sigla: 'F', desc: 'Folga Regulamentar (36h)', color: 'bg-muted text-muted-foreground' },
  { sigla: 'FE', desc: 'Folga Enfermagem', color: 'bg-primary/20 text-primary' },
  { sigla: 'FA', desc: 'Folga Abonada', color: 'bg-accent/20 text-accent' },
  { sigla: 'AU', desc: 'Ausência / Falta', color: 'bg-destructive/20 text-destructive' },
  { sigla: 'AT', desc: 'Atestado Médico', color: 'bg-warning/20 text-warning' },
  { sigla: 'LM', desc: 'Licença Maternidade/Médica', color: 'bg-chart-3/20 text-chart-3' },
  { sigla: 'V', desc: 'Férias', color: 'bg-chart-4/20 text-chart-4' },
  { sigla: 'TP', desc: 'Troca de Plantão', color: 'bg-accent/30 text-accent' },
  { sigla: 'FI', desc: 'Falta Injustificada', color: 'bg-destructive/30 text-destructive' },
];

export default function LegendBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-xl border border-border p-4"
    >
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Legenda</h4>
      <div className="flex flex-wrap gap-2">
        {legend.map(item => (
          <div key={item.sigla} className="flex items-center gap-1.5">
            <span className={`inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-bold ${item.color}`}>
              {item.sigla}
            </span>
            <span className="text-[10px] text-muted-foreground">{item.desc}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}