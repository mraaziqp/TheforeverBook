import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  Mail, 
  Lock, 
  Users, 
  ArrowRight, 
  UserPlus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  auth, 
  signInWithGoogle 
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: displayName || email.split('@')[0]
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess?.();
    } catch (err: any) {
      console.error("Auth error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized. Please go to Firebase Console > Authentication > Settings > Authorized Domains and add: " + window.location.hostname);
      } else if (err.code === 'auth/invalid-continue-uri') {
        setError("Authentication configuration error (invalid-continue-uri). This often means the Firebase API Key or Auth Domain is incorrect, or the current domain is not whitelisted.");
      } else if (err.code === 'auth/invalid-api-key') {
        setError("Invalid Firebase API Key. Please check your environment variables or firebase-applet-config.json.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Sign-in method not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable Email/Password.");
      } else if (err.code === 'auth/configuration-not-found') {
        setError("Firebase configuration error. If you are on Vercel, make sure you have added the VITE_FIREBASE_* environment variables.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid credentials. Please double check your email and password, or 'Join Studio' if you haven't created an account yet.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(`${err.code}: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      console.error("Google Auth error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized. Please go to Firebase Console > Authentication > Settings > Authorized Domains and add: " + window.location.hostname);
      } else if (err.code === 'auth/invalid-continue-uri') {
        setError("Authentication configuration error (invalid-continue-uri). This often means the Firebase API Key or Auth Domain is incorrect, or the current domain is not whitelisted.");
      } else if (err.code === 'auth/invalid-api-key') {
        setError("Invalid Firebase API Key. Please check your environment variables or firebase-applet-config.json.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Google sign-in is not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable Google.");
      } else if (err.code === 'auth/invalid-credential') {
        setError("Google authentication failed (invalid-credential). This can happen if the Firebase configuration is incorrect or the session is invalid. Try refreshing the page.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(`${err.code}: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-6 border border-indigo-500/20">
          {mode === 'login' ? <LogIn className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
        </div>
        <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
          {mode === 'login' ? 'Studio Access' : 'Create Studio'}
        </h1>
        <p className="text-zinc-500 text-sm">
          {mode === 'login' ? 'Sign in to access your professional workspace' : 'Join our professional photo editing community'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleAuth} className="space-y-4">
        {mode === 'signup' && (
          <div className="relative group">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
              required
            />
          </div>
        )}

        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
            required
          />
        </div>

        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
            required
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="my-8 flex items-center gap-4 text-zinc-700">
        <div className="h-px flex-1 bg-white/5"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Or continue with</span>
        <div className="h-px flex-1 bg-white/5"></div>
      </div>

      <button 
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-4 glass-dark border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/5 transition-all"
      >
        <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-50" />
        Google Auth
      </button>

      <p className="mt-8 text-center text-xs text-zinc-500">
        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
        <button 
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
        >
          {mode === 'login' ? 'Join Studio' : 'Sign In'}
        </button>
      </p>
    </div>
  );
};
