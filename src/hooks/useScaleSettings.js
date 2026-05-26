import { useState, useEffect } from 'react';

// Valores padrão do sistema
const DEFAULT_LIMITS = {
  nurses: 1,
  technicians: 3,
};

const DEFAULT_CODES = [
  { code: 'P', label: 'Plantão (12H)', type: 'default', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  { code: 'F', label: 'Folga Regulamentar (36H)', type: 'default', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  { code: 'FE', label: 'Folga Enfermagem', type: 'duty', color: 'text-teal-600', bgColor: 'bg-teal-500/10' },
  { code: 'FA', label: 'Folga Abonada', type: 'off-duty', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  { code: 'AU', label: 'Ausência / Falta', type: 'off-duty', color: 'text-red-600', bgColor: 'bg-red-500/10' },
  { code: 'AT', label: 'Atestado Médico', type: 'off-duty', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  { code: 'LM', label: 'Licença Maternidade/Médica', type: 'off-duty', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  { code: 'V', label: 'Férias', type: 'off-duty', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  { code: 'TP', label: 'Troca de Plantão', type: 'duty', color: 'text-cyan-600', bgColor: 'bg-cyan-500/10' },
  { code: 'FI', label: 'Falta Injustificada', type: 'off-duty', color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
];

export function useScaleSettings() {
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [codes, setCodes] = useState(DEFAULT_CODES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Carregar configurações salvas no LocalStorage
    try {
      const savedLimits = localStorage.getItem('escala_limits');
      if (savedLimits) setLimits(JSON.parse(savedLimits));

      const savedCodes = localStorage.getItem('escala_codes');
      if (savedCodes) setCodes(JSON.parse(savedCodes));
    } catch (err) {
      console.error("Erro ao carregar as configurações da escala", err);
    }
    setIsLoaded(true);
  }, []);

  const updateLimits = (newLimits) => {
    setLimits(newLimits);
    localStorage.setItem('escala_limits', JSON.stringify(newLimits));
  };

  const updateCodes = (newCodes) => {
    setCodes(newCodes);
    localStorage.setItem('escala_codes', JSON.stringify(newCodes));
  };

  const resetToDefault = () => {
    setLimits(DEFAULT_LIMITS);
    setCodes(DEFAULT_CODES);
    localStorage.removeItem('escala_limits');
    localStorage.removeItem('escala_codes');
  };

  return {
    limits,
    codes,
    isLoaded,
    updateLimits,
    updateCodes,
    resetToDefault,
    DEFAULT_LIMITS,
    DEFAULT_CODES
  };
}
