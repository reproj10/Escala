import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import NewEmployee from '@/pages/NewEmployee';
import SearchPage from '@/pages/Search';
import Management from '@/pages/Management';
import Certificates from '@/pages/Certificates';
import Reports from '@/pages/Reports';
import EscalaControl from '@/pages/EscalaControl';

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/novo" element={<NewEmployee />} />
        <Route path="/pesquisar" element={<SearchPage />} />
        <Route path="/gerenciamento" element={<Management />} />
        <Route path="/atestados" element={<Certificates />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/escala-control" element={<EscalaControl />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App