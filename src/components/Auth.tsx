import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LogIn, UserPlus, LogOut, ShieldAlert, Cpu } from 'lucide-react';

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  status: 'Trial' | 'Liberado' | 'Bloqueado';
  trial_fim: any;
  deviceId: string;
}

export const AuthProvider: React.FC<{ children: (user: UserProfile | null, loading: boolean) => React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDeviceFingerprint = () => {
      const existing = localStorage.getItem('system_device_fingerprint');
      if (existing) return existing;
      const newValue = crypto.randomUUID();
      localStorage.setItem('system_device_fingerprint', newValue);
      return newValue;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          const deviceId = getDeviceFingerprint();

          if (!userSnap.exists()) {
            // New User - Start Trial
            const startTime = new Date();
            const endTime = new Date();
            endTime.setDate(startTime.getDate() + 7);

            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              nome: firebaseUser.displayName || 'Engenheiro',
              email: firebaseUser.email!,
              status: 'Trial',
              trial_fim: endTime,
              deviceId: deviceId
            };

            await setDoc(userRef, {
              ...newProfile,
              trial_inicio: serverTimestamp(),
              trial_fim: endTime,
              createdAt: serverTimestamp()
            });

            // Log Login
            await setDoc(doc(db, 'logins', `${firebaseUser.uid}_${Date.now()}`), {
              user_id: firebaseUser.uid,
              email: firebaseUser.email,
              nome: newProfile.nome,
              data_hora: new Date().toISOString(),
              deviceId: deviceId
            });

            setUser(newProfile);
          } else {
            const data = userSnap.data() as any;
            const profile: UserProfile = {
              id: firebaseUser.uid,
              nome: data.nome || 'Engenheiro',
              email: firebaseUser.email!,
              status: data.status,
              trial_fim: data.trial_fim?.toDate ? data.trial_fim.toDate() : new Date(data.trial_fim),
              deviceId: data.deviceId
            };
            
            setUser(profile);
            
            // Log Login
             await setDoc(doc(db, 'logins', `${firebaseUser.uid}_${Date.now()}`), {
              user_id: firebaseUser.uid,
              email: firebaseUser.email,
              nome: profile.nome,
              data_hora: new Date().toISOString(),
              deviceId: deviceId
            });
          }
        } catch (error) {
          console.error("AUTH_PROVIDER_ERROR:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return <>{children(user, loading)}</>;
};

export const LoginView = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, informe seu e-mail para recuperar a senha.');
      return;
    }
    setError('');
    setResetSent(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Name will be handled in AuthProvider setup
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-green-500/30 p-8 rounded-lg shadow-2xl shadow-green-500/10">
        <div className="flex flex-col items-center mb-8">
          <Cpu className="w-16 h-16 text-green-500 mb-4 animate-pulse" />
          <h1 className="text-3xl font-mono text-green-500 tracking-tighter uppercase">Sistema Coordenograma</h1>
          <p className="text-green-800 font-mono text-xs mt-2 uppercase tracking-widest">Proteção & Seletividade</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-green-500 text-xs font-mono mb-1 uppercase">Nome Completo</label>
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-black border border-green-900 text-green-400 p-3 rounded focus:outline-none focus:border-green-500 font-mono transition-all"
                placeholder="EX: ENG. JOÃO SILVA"
              />
            </div>
          )}
          <div>
            <label className="block text-green-500 text-xs font-mono mb-1 uppercase">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-green-900 text-green-400 p-3 rounded focus:outline-none focus:border-green-500 font-mono transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-green-500 text-xs font-mono mb-1 uppercase">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-green-900 text-green-400 p-3 rounded focus:outline-none focus:border-green-500 font-mono transition-all"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-mono bg-red-950/20 p-2 border border-red-900/50 rounded">
              <ShieldAlert className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="flex items-center gap-2 text-green-500 text-xs font-mono bg-green-950/20 p-2 border border-green-900/50 rounded">
              <ShieldAlert className="w-4 h-4" />
              <span>E-mail de recuperação enviado com sucesso!</span>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded transition-colors flex items-center justify-center gap-2 font-mono uppercase"
          >
            {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isLogin ? 'Autenticar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center">
          {isLogin && (
            <button 
              onClick={handleForgotPassword}
              className="text-green-800 hover:text-green-500 text-[10px] font-mono underline transition-all uppercase tracking-tighter"
            >
              ESQUECEU A SENHA?
            </button>
          )}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setResetSent(false);
            }}
            className="text-green-700 hover:text-green-500 text-xs font-mono underline transition-all uppercase tracking-tighter"
          >
            {isLogin ? 'Não possui conta? Crie uma agora' : 'Já possui conta? Faça LOGIN'}
          </button>
        </div>
      </div>
    </div>
  );
};
