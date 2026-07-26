import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { KeyRound, Mail } from 'lucide-react';

export default function PortalLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [coren, setCoren] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !coren) {
      toast.error('Preencha os dois campos!');
      return;
    }

    setLoading(true);

    try {
      // Busca exata por email e coren
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email.trim())
        .eq('coren', coren.trim())
        .single();

      if (error || !data) {
        console.error('Erro no login:', error);
        toast.error('Dados inválidos. Verifique seu E-mail e COREN e tente novamente.');
      } else {
        toast.success(`Bem-vindo(a), ${data.name}!`);
        onLogin(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao tentar acessar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800 text-white">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
          Portal da Enfermagem
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Solicitação de Folgas
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              <Mail className="w-4 h-4" /> E-mail Pessoal
            </label>
            <Input 
              type="email" 
              placeholder="exemplo@gmail.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 focus:border-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Número do COREN (Matrícula)
            </label>
            <Input 
              type="number" 
              placeholder="Digite apenas números" 
              value={coren}
              onChange={(e) => setCoren(e.target.value)}
              className="bg-zinc-950 border-zinc-800 focus:border-emerald-500"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Acessar Calendário'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
