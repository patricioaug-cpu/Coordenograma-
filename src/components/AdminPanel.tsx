import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Clock, CheckCircle, XCircle, Search, ShieldCheck } from 'lucide-react';

interface FullUser {
  id: string;
  nome: string;
  email: string;
  status: string;
  trial_inicio: any;
  trial_fim: any;
  deviceId: string;
}

interface LoginLog {
  id: string;
  email: string;
  nome: string;
  data_hora: string;
  deviceId: string;
}

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<FullUser[]>([]);
  const [logins, setLogins] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('nome')));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as FullUser)));

      const loginsSnap = await getDocs(query(collection(db, 'logins'), orderBy('data_hora', 'desc'), limit(50)));
      setLogins(loginsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LoginLog)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Trial' ? 'Liberado' : currentStatus === 'Liberado' ? 'Bloqueado' : 'Liberado';
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { status: newStatus });
    fetchData();
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-6 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 text-blue-500">
           <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8" />
           PAINEL DO ADMINISTRADOR
        </h2>
        <p className="text-zinc-500 text-[10px] sm:text-sm mt-1 uppercase tracking-widest leading-tight">Gestão de Usuários e Auditoria de Acesso</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* User List */}
        <section className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <h3 className="text-xs font-bold uppercase flex items-center gap-2"><Users className="w-4 h-4" /> Usuários Registrados</h3>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{users.length} TOTAL</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Validade</th>
                  <th className="p-4">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/20">
                    <td className="p-4">
                      <p className="font-bold text-zinc-200">{u.nome}</p>
                      <p className="text-[9px] text-zinc-600">{u.email}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        u.status === 'Liberado' ? 'bg-green-900/30 text-green-500' : 
                        u.status === 'Trial' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-red-900/30 text-red-500'
                      }`}>
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500">
                      {u.trial_fim?.toDate ? u.trial_fim.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => toggleStatus(u.id, u.status)}
                        className="text-blue-500 hover:text-blue-400 font-bold underline"
                      >
                        ALTERAR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Login Logs */}
        <section className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <h3 className="text-xs font-bold uppercase flex items-center gap-2"><Clock className="w-4 h-4" /> Histórico de Logins</h3>
            <button onClick={fetchData} className="text-[10px] text-blue-500 hover:underline">ATUALIZAR</button>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {logins.map(l => (
              <div key={l.id} className="p-4 border-b border-zinc-900 hover:bg-zinc-800/20 flex gap-4">
                <div className="w-1.5 bg-blue-900 rounded-full"></div>
                <div>
                  <p className="font-bold text-zinc-200 text-xs">{l.nome}</p>
                  <p className="text-[10px] text-zinc-600">{new Date(l.data_hora).toLocaleString('pt-BR')}</p>
                  <p className="text-[9px] text-zinc-700 mt-1">DEVICE ID: {l.deviceId.substring(0, 8)}...</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
