import React, { useState } from 'react';
import { 
  signInWithPopup,
  GoogleAuthProvider,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Mail, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LogoDisplay = ({ title, subtitle }: { title: string; subtitle: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center mb-6">
    <div className="relative w-20 h-20 mb-3 drop-shadow-2xl">
      <svg viewBox="0 0 200 240" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pinGradAuth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dbf64" />
            <stop offset="100%" stopColor="#0c6b37" />
          </linearGradient>
          <linearGradient id="barGradAuth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path d="M 0 90 C 0 -10, 200 -10, 200 90 C 200 160, 100 210, 100 210 C 100 210, 0 160, 0 90 Z" fill="url(#pinGradAuth)" />
        <path d="M 15 90 C 15 10, 185 10, 185 90 C 185 150, 100 195, 100 195 C 100 195, 15 150, 15 90 Z" fill="#ffffff" />
        <path d="M 100 10 L 190 70 L 160 80 L 100 35 L 40 80 L 10 70 Z" fill="#146d36" />
        <rect x="40" y="20" width="15" height="30" fill="#146d36" />
        <path d="M 45 145 L 65 145 L 65 180 L 45 180 Z" fill="url(#barGradAuth)" />
        <path d="M 80 110 L 100 110 L 100 170 L 80 170 Z" fill="url(#barGradAuth)" />
        <path d="M 115 75 L 135 75 L 135 160 L 115 160 Z" fill="url(#barGradAuth)" />
        <path d="M 150 40 L 170 40 L 170 145 L 150 145 Z" fill="url(#barGradAuth)" />
      </svg>
    </div>
    <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1">
      <span className="text-[#2dbf64]">GERENTE</span> <span className="text-[#818cf8]">IMOBILIÁRIO</span>
    </h1>
    <div className="text-center mt-3">
      <h2 className="text-white text-lg font-medium tracking-tight">{title}</h2>
      <p className="text-slate-400 text-xs font-normal mt-1 leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

interface AuthProps {
  user?: User | null;
  onTenantLogin?: (tenantData: any) => void;
}

type ViewMode = 'login' | 'register' | 'reset';

export const Auth: React.FC<AuthProps> = ({ onTenantLogin }) => {
  const [view, setView] = useState<ViewMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Tenant Authentication States
  const [roleMode, setRoleMode] = useState<'manager' | 'tenant'>('manager');
  const [cpf, setCpf] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');

  const handleTenantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf || !tenantPassword) {
      setError('Por favor, digite o CPF e a senha.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cleanInputCpf = cpf.replace(/\D/g, '');
      const portalId = `${cleanInputCpf}_${tenantPassword}`;
      
      console.log('Attempting direct client-side login lookup...', portalId);
      const portalDocRef = doc(db, 'tenant_portal_data', portalId);
      const portalSnap = await getDoc(portalDocRef);
      
      if (portalSnap.exists()) {
        const portalData = portalSnap.data();
        console.log('Login successful via direct Firebase client snapshot!');
        if (onTenantLogin) {
          onTenantLogin({
            success: true,
            tenantId: portalData.tenantId,
            tenantName: portalData.tenantName || 'Inquilino',
            propertyName: portalData.propertyName || 'Imóvel',
            propertyPixKey: portalData.propertyPixKey || '',
            payments: portalData.payments || []
          });
          setLoading(false);
          return;
        }
      }
      
      console.log('Tenant portal document not found. Trying legacy server-side login as fallback...');
      const response = await fetch('/api/tenant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, password: tenantPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao autenticar o inquilino.');
      }
      if (onTenantLogin) {
        onTenantLogin(data);
      }
    } catch (err: any) {
      console.warn('Direct login failed, trying local developer/testing cache fallback:', err);
      
      // Fallback verification in localStorage for smooth development testing
      try {
        const cleanInputCpf = cpf.replace(/\D/g, '');
        const backupRaw = localStorage.getItem('local_tenants_backup');
        if (backupRaw) {
          const backups = JSON.parse(backupRaw);
          const matched = backups.find((b: any) => {
            const cleanBackupCpf = (b.cpf || '').replace(/\D/g, '');
            return cleanBackupCpf === cleanInputCpf && b.password === tenantPassword;
          });

          if (matched) {
            console.log('Success! Logged in with local developer/testing cache:', matched);
            if (onTenantLogin) {
              onTenantLogin({
                success: true,
                tenantId: matched.id,
                tenantName: matched.tenantName,
                propertyName: matched.propertyName,
                propertyPixKey: matched.propertyPixKey || '',
                payments: matched.payments
              });
              setLoading(false);
              return;
            }
          }
        }
      } catch (localErr) {
        console.error('Local fallback failed:', localErr);
      }

      setError(err.message || 'CPF ou senha incorretos ou extrato ainda não gerado pelo gerente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/tasks');
      provider.addScope('https://www.googleapis.com/auth/tasks.readonly');
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        let existingTokens: any = {};
        try {
          const stored = localStorage.getItem('google_drive_tokens');
          if (stored) existingTokens = JSON.parse(stored);
        } catch (e) {}
        
        const tokens: any = { access_token: credential.accessToken };
        if (existingTokens.refresh_token) {
          tokens.refresh_token = existingTokens.refresh_token;
        }
        if (existingTokens.expiry_date) {
            tokens.expiry_date = existingTokens.expiry_date;
        }

        localStorage.setItem('google_drive_tokens', JSON.stringify(tokens));
        
        try {
          await fetch('/api/auth/google/save-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens, uid: result.user.uid })
          });
          
          try {
            await setDoc(doc(db, 'config', result.user.uid), {
              googleDriveTokens: JSON.stringify(tokens),
              googleDriveConnected: true,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (configErr) {
            console.error('Failed to save tokens to firestore config:', configErr);
          }
          
          window.dispatchEvent(new Event('drive-connected'));
        } catch (e) {
          console.error('Failed to sync tokens to backend:', e);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Falha ao entrar com Google. Verifique se popups estão permitidos e libere acesso ao Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      // User is logged in automatically after registration
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else {
        setError('Falha ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Informe seu e-mail para recuperar a senha.');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Instruções de recuperação enviadas para seu e-mail!');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Nenhuma conta encontrada com este e-mail.');
      } else {
        setError('Falha ao enviar e-mail de recuperação.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setError(null);
    setSuccess(null);
    setPassword('');
  };

  return (
    <div className="w-full flex items-center justify-center font-sans relative overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full p-2"
          >
            <LogoDisplay 
              title={roleMode === 'manager' ? "Bem-vindo de volta!" : "Portal do Inquilino"} 
              subtitle={roleMode === 'manager' ? <>Faça login para continuar<br/>gerenciando seus imóveis.</> : <>Acesse com seu CPF e senha cadastrados<br/>para consultar seu extrato de pagamentos.</>} 
            />

            {/* Role selection toggle */}
            <div className="flex bg-[#1e232b] p-1 rounded-xl border border-slate-700/50 mb-5 w-full">
              <button
                type="button"
                onClick={() => {
                  setRoleMode('manager');
                  setError(null);
                }}
                className={`flex-grow py-2 text-xs font-bold rounded-lg transition-all ${roleMode === 'manager' ? 'bg-[#2dbf64] text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Gerente
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleMode('tenant');
                  setError(null);
                }}
                className={`flex-grow py-2 text-xs font-bold rounded-lg transition-all ${roleMode === 'tenant' ? 'bg-[#818cf8] text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Inquilino
              </button>
            </div>

            {roleMode === 'manager' ? (
              <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    <span translate="no">{error}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="E-mail ou CPF" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2dbf64] focus:border-transparent transition-all placeholder:text-slate-500"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Senha" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2dbf64] focus:border-transparent transition-all placeholder:text-slate-500"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#2dbf64] border-[#2dbf64]' : 'border-slate-600 bg-transparent group-hover:border-slate-500'}`}>
                      {rememberMe && <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                    <span className="text-slate-400 group-hover:text-slate-300 transition-colors">Lembrar de mim</span>
                  </label>
                  <button type="button" onClick={() => { resetState(); setView('reset'); }} className="text-[#818cf8] hover:text-[#a5b4fc] transition-colors">Esqueci minha senha</button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2dbf64] hover:bg-[#25a555] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(45,191,100,0.39)] disabled:opacity-50 mt-2"
                >
                  {loading ? 'Aguarde...' : 'Entrar'}
                </button>

                <div className="relative my-4 flex items-center">
                  <div className="flex-grow border-t border-slate-700/50"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">ou continue com</span>
                  <div className="flex-grow border-t border-slate-700/50"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-[#1e232b] hover:bg-[#252a33] text-slate-300 font-medium py-2.5 rounded-xl border border-slate-700/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="w-full bg-[#1e232b] hover:bg-[#252a33] text-slate-300 font-medium py-2.5 rounded-xl border border-slate-700/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.24-.86 3.43-.88 1.81.01 3.16.89 4.02 2.21-1.63 1.05-1.31 3.23.23 4.14-.38 1.76-1.54 3.8-2.76 6.7z"/>
                      <path d="M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Apple
                  </button>
                </div>

                <div className="text-center mt-4 pb-2">
                  <span className="text-slate-400 text-xs">Novo por aqui? </span>
                  <button type="button" onClick={() => { resetState(); setView('register'); }} className="text-[#818cf8] hover:text-[#a5b4fc] text-xs font-semibold transition-colors">Criar conta</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleTenantLogin} className="flex flex-col gap-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    <span translate="no">{error}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="CPF do Inquilino" 
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8] focus:border-transparent transition-all placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Senha" 
                      value={tenantPassword}
                      onChange={(e) => setTenantPassword(e.target.value)}
                      className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8] focus:border-transparent transition-all placeholder:text-slate-500"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#818cf8] hover:bg-[#6c7ae6] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(129,140,248,0.39)] disabled:opacity-50 mt-4"
                >
                  {loading ? 'Aguarde...' : 'Entrar no Extrato'}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {view === 'register' && (
          <motion.div 
            key="register"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full p-2"
          >
            <button 
              onClick={() => { resetState(); setView('login'); }}
              className="absolute top-2 left-2 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <LogoDisplay 
              title="Crie sua conta" 
              subtitle={<>Comece a organizar e otimizar<br/>a gestão dos seus imóveis.</>} 
            />

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span translate="no">{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nome completo" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2dbf64] focus:border-transparent transition-all placeholder:text-slate-500"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="email" 
                    placeholder="E-mail" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2dbf64] focus:border-transparent transition-all placeholder:text-slate-500"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Senha" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2dbf64] focus:border-transparent transition-all placeholder:text-slate-500"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(129,140,248,0.39)] disabled:opacity-50 mt-4"
              >
                {loading ? 'Aguarde...' : 'Criar Conta'}
              </button>

              <div className="text-center mt-4 pb-2">
                <span className="text-slate-400 text-xs">Já tem uma conta? </span>
                <button type="button" onClick={() => { resetState(); setView('login'); }} className="text-[#2dbf64] hover:text-[#25a555] text-xs font-semibold transition-colors">Faça login</button>
              </div>
            </form>
          </motion.div>
        )}

        {view === 'reset' && (
          <motion.div 
            key="reset"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full p-2"
          >
            <button 
              onClick={() => { resetState(); setView('login'); }}
              className="absolute top-2 left-2 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <LogoDisplay 
              title="Recuperar Senha" 
              subtitle={<>Insira seu e-mail cadastrado e enviaremos<br/>instruções para redefinir sua senha.</>} 
            />

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4 mt-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span translate="no">{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-xs">
                  <CheckCircle size={14} className="shrink-0" />
                  <span translate="no">{success}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="email" 
                    placeholder="Seu E-mail" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1e232b] text-slate-200 border border-slate-700/50 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8] focus:border-transparent transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(129,140,248,0.39)] disabled:opacity-50 mt-4"
              >
                {loading ? 'Aguarde...' : 'Enviar link de recuperação'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
