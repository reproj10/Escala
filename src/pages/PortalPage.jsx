import React, { useState } from 'react';
import PortalLogin from './Portal/PortalLogin';
import PortalCalendario from './Portal/PortalCalendario';
import { Toaster } from 'sonner';

export default function Portal() {
  const [employee, setEmployee] = useState(null);

  // Se não estiver "logado" (sem employee), mostra a tela de login
  if (!employee) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <PortalLogin onLogin={(emp) => setEmployee(emp)} />
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // Se estiver "logado", mostra o calendário
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center p-4">
      <PortalCalendario employee={employee} onLogout={() => setEmployee(null)} />
      <Toaster richColors position="top-center" />
    </div>
  );
}
