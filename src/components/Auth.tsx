import React, { useState, useEffect } from 'react';
import { 
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { AlertCircle, Home, LogOut, User as UserIcon } from 'lucide-react';

interface AuthProps {
  user?: User | null;
}

export const Auth: React.FC<AuthProps> = ({ user: propUser }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propUser !== undefined) {
      setCurrentUser(propUser);
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setCurrentUser(user);
      });
      return () => unsubscribe();
    }
  }, [propUser]);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/calendar');
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        const tokens = { access_token: credential.accessToken };
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
          
          // Dispatch a custom event so App.tsx can re-check connection immediately
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  if (currentUser) {
    return (
      <div className="flex items-center justify-between gap-3 px-2 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <UserIcon size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]" translate="no">
              {currentUser.displayName || 'Usuário'}
            </span>
            <span className="text-[10px] text-slate-500 truncate max-w-[120px]" translate="no">
              {currentUser.email}
            </span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <div className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-xs mb-2">
              <AlertCircle size={14} />
              <span translate="no">{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl border border-white/10 shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-lg">Entrar com Google</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
