import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  ActionCodeSettings,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LogIn, UserPlus, LogOut, ShieldAlert, Cpu, CheckCircle2, KeyRound } from 'lucide-react';

function translateAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-action-code':
      return 'O link ou código de redefinição é inválido ou já foi utilizado. Solicite um novo link.';
    case 'auth/expired-action-code':
      return 'O link ou código de redefinição expirou (validade de 1 hora). Solicite um novo link.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi desativada pelo administrador.';
    case 'auth/user-not-found':
      return 'Nenhum usuário cadastrado foi encontrado com este e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso por outra conta.';
    case 'auth/weak-password':
      return 'A senha deve conter no mínimo 6 caracteres.';
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas consecutivas. Aguarde alguns minutos antes de tentar novamente.';
    default:
      return err?.message || 'Ocorreu um erro ao processar a solicitação.';
  }
}

function extractOobCode(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('oobCode=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const code = url.searchParams.get('oobCode');
      if (code) return code;
    } catch {
      const match = trimmed.match(/oobCode=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
  }
  return trimmed;
}

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
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Estados para redefinição de senha
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  // Detecta se a página foi aberta via link com parâmetros de ação do Firebase (mode=resetPassword ou oobCode)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('oobCode');
      const mode = params.get('mode');

      if (code && (mode === 'resetPassword' || !mode)) {
        setIsResetMode(true);
        setResetCodeInput(code);
        verifyPasswordResetCode(auth, code)
          .then((verifiedEmail) => {
            setResetEmail(verifiedEmail);
            setCodeVerified(true);
            setError('');
          })
          .catch((err) => {
            setError(translateAuthError(err));
          });
      }
    } catch (e) {
      console.error('Erro ao verificar parâmetros de redefinição de senha:', e);
    }
  }, []);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, informe seu e-mail para recuperar a senha.');
      return;
    }
    setError('');
    setResetSent(false);
    setIsSendingReset(true);

    try {
      // Configuração para direcionar a ação do link de volta ao aplicativo
      const actionCodeSettings: ActionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true
      };

      try {
        await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      } catch (innerErr) {
        // Fallback para envio padrão caso o domínio de redirecionamento encontre restrição
        await sendPasswordResetEmail(auth, email.trim());
      }

      setResetSent(true);
    } catch (err: any) {
      setError(translateAuthError(err));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetCode = extractOobCode(resetCodeInput);
    if (!targetCode) {
      setError('Por favor, informe o link ou código de redefinição (oobCode) recebido por e-mail.');
      return;
    }

    if (!newPassword) {
      setError('Por favor, digite a nova senha.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setIsSubmittingReset(true);
    try {
      await confirmPasswordReset(auth, targetCode, newPassword);
      setResetSuccess(true);
      setError('');
      // Limpa a query string da URL sem recarregar
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err: any) {
      setError(translateAuthError(err));
    } finally {
      setIsSubmittingReset(false);
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
      setError(translateAuthError(err));
    }
  };

  // TELA DE REDEFINIÇÃO DE SENHA (quando ativada por link ou pelo botão de inserir código)
  if (isResetMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-green-500/30 p-8 rounded-lg shadow-2xl shadow-green-500/10">
          <div className="flex flex-col items-center mb-8">
            <Cpu className="w-16 h-16 text-green-500 mb-4 animate-pulse" />
            <h1 className="text-3xl font-mono text-green-500 tracking-tighter uppercase">Sistema Coordenograma</h1>
            <p className="text-green-800 font-mono text-xs mt-2 uppercase tracking-widest">Redefinir Senha de Acesso</p>
          </div>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500 text-xs font-mono bg-green-950/20 p-3 border border-green-900/50 rounded">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400" />
                <span>Senha alterada com sucesso! Você já pode entrar com sua nova senha.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setIsLogin(true);
                  setResetSuccess(false);
                  setResetCodeInput('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded transition-colors flex items-center justify-center gap-2 font-mono uppercase cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Ir para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              {resetEmail && (
                <div className="bg-black/60 border border-green-950 p-2.5 rounded text-xs font-mono text-green-400">
                  <span className="text-green-800 text-[10px] block uppercase font-bold">Conta Identificada:</span>
                  <strong>{resetEmail}</strong>
                </div>
              )}

              {/* Se o código não veio validado na URL, permite ao usuário colar o link ou o código do e-mail */}
              {!codeVerified && (
                <div>
                  <label className="block text-green-500 text-xs font-mono mb-1 uppercase">
                    Link ou Código do E-mail (oobCode)
                  </label>
                  <input
                    type="text"
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    className="w-full bg-black border border-green-900 text-green-400 p-3 rounded focus:outline-none focus:border-green-500 font-mono text-xs transition-all"
                    placeholder="Cole aqui o link completo ou o código..."
                    required
                  />
                  <p className="text-[10px] text-green-800 font-mono mt-1 leading-normal">
                    Se o link estiver desabilitado no seu cliente de e-mail (comum no Gmail por segurança), copie o link ou o código do e-mail e cole aqui.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-green-500 text-xs font-mono mb-1 uppercase">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black border border-green-900 text-green-400 p-3 rounded focus:outline-none focus:border-green-500 font-mono transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              <div>
                <label className="block text-green-500 text-xs font-mono mb-1 uppercase">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black border border-green-900 text-green-400 p-3 rounded focus:outline-none focus:border-green-500 font-mono transition-all"
                  placeholder="Repita a nova senha"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-mono bg-red-950/20 p-2 border border-red-900/50 rounded">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingReset}
                className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded transition-colors flex items-center justify-center gap-2 font-mono uppercase cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {isSubmittingReset ? 'Salvando Nova Senha...' : 'Salvar Nova Senha'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setError('');
                  }}
                  className="text-green-700 hover:text-green-500 text-xs font-mono underline transition-all uppercase tracking-tighter cursor-pointer"
                >
                  Cancelar e Voltar ao Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

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
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="text-green-500 text-xs font-mono bg-green-950/20 p-3 border border-green-900/50 rounded space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">E-mail de recuperação enviado para:</p>
                  <p className="text-green-300 font-semibold">{email}</p>
                </div>
              </div>
              <p className="text-[10px] text-green-400/80 leading-relaxed border-t border-green-900/40 pt-1.5">
                Verifique a caixa de entrada e a pasta de <strong>Spam</strong>. Se o link recebido estiver desabilitado no seu cliente de e-mail (comum no Gmail por segurança), copie o link ou código do e-mail e clique no botão abaixo para alterar sua senha:
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(true);
                  setError('');
                }}
                className="w-full mt-1 bg-green-950/60 hover:bg-green-900/60 text-green-300 border border-green-700/60 hover:border-green-500 py-1.5 px-3 rounded text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Inserir Link/Código e Alterar Senha
              </button>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded transition-colors flex items-center justify-center gap-2 font-mono uppercase cursor-pointer"
          >
            {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isLogin ? 'Autenticar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center">
          {isLogin && (
            <div className="flex flex-col gap-2">
              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className="text-green-800 hover:text-green-500 text-[10px] font-mono underline transition-all uppercase tracking-tighter disabled:opacity-50 cursor-pointer"
              >
                {isSendingReset ? 'ENVIANDO E-MAIL...' : 'ESQUECEU A SENHA?'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(true);
                  setError('');
                  setResetSent(false);
                }}
                className="text-green-900 hover:text-green-600 text-[9px] font-mono underline transition-all uppercase tracking-tighter cursor-pointer"
              >
                Já possui um código/link de redefinição? Alterar Senha
              </button>
            </div>
          )}
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setResetSent(false);
            }}
            className="text-green-700 hover:text-green-500 text-xs font-mono underline transition-all uppercase tracking-tighter cursor-pointer"
          >
            {isLogin ? 'Não possui conta? Crie uma agora' : 'Já possui conta? Faça LOGIN'}
          </button>
        </div>
      </div>
    </div>
  );
};
