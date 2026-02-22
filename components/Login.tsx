import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { isSupabaseConfigured, supabase } from '../src/supabaseClient';

interface LoginProps {
  onLogin: (role: UserRole, email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.setProperty('--x', `${e.clientX}px`);
        glowRef.current.style.setProperty('--y', `${e.clientY}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Authentication service is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify environment variables.');
      }

      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setError('Account created! Please check your email to verify.');
        setIsRegister(false);
        return;
      }

      // --------------------
      // SIGN IN
      // --------------------
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      // --------------------
      // FETCH ROLE FROM public.profiles
      // --------------------
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      // --------------------
      // ROLE-BASED REDIRECT
      // --------------------
      if (profile.role === 'parent') {
        window.location.href = 'https://smspa1.vercel.app';
        return;
      }

      // Default: STUDENT
      onLogin(UserRole.STUDENT, data.user.email || email);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-['Segoe_UI',sans-serif]">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(15, 38, 36, 0.9), rgba(10, 26, 25, 0.95)), url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920')",
        }}
      />

      <div
        ref={glowRef}
        className="fixed inset-0 z-1 pointer-events-none opacity-50"
        style={{
          background:
            'radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(78, 165, 157, 0.3), transparent 35%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[400px] px-6">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-[#4ea59d] rounded-[28px] flex items-center justify-center shadow-2xl mb-6">
            <i className="fa-solid fa-graduation-cap text-4xl text-white"></i>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            EduSphere
          </h1>
          <p className="text-[#4ea59d] text-sm font-bold uppercase tracking-[0.3em] mt-2">
            NextGen Learning Portal
          </p>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
          <h2 className="text-center text-xl font-black mb-8 text-[#0f2624] uppercase">
            {isRegister ? 'Create Account' : 'Authenticate Account'}
          </h2>

          {!isSupabaseConfigured && (
            <p className="text-amber-600 text-xs text-center mb-4">
              Auth backend is not configured for this deployment.
            </p>
          )}

          <div className="mb-4">
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border bg-[#f8fafc] text-black caret-black"
            />
          </div>

          <div className="mb-4 relative">
            <input
              type={passwordVisible ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border bg-[#f8fafc] text-black caret-black"
            />
            <button
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <i className={`fa-solid ${passwordVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center mb-3">{error}</p>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full py-4 bg-[#4ea59d] text-white rounded-2xl font-black uppercase"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Sign In'}
          </button>

          <p className="mt-6 text-center text-[#4ea59d] text-sm">
            {isRegister ? 'Already have an account?' : 'No account yet?'}{' '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-[#4ea59d] font-bold"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>

        <p className="mt-10 text-center text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
          © 2025 EduSphere Global Academy
        </p>
      </div>
    </div>
  );
};

export default Login;
