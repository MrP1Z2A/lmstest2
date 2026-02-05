
import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole, email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
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

  const handleSignIn = () => {
    setError('');
    // Special Parent Login Logic
    if (username === 'parent1' && password === '12345') {
      window.location.href = 'https://smspa1.vercel.app';
    } else if (username === 'user1' && password === '123456') {
      onLogin(UserRole.STUDENT, 'alex@edu.com');
    } else if (username === 'teacher1' && password === '123456') {
      onLogin(UserRole.TEACHER, 'sarah@edu.com');
    } else {
      setError('Invalid credentials. (Hint: parent@gmail.com / EDU-2026-001)');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-['Segoe_UI',sans-serif]">
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(15, 38, 36, 0.9), rgba(10, 26, 25, 0.95)), url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920')`
        }}
      />
      
      <div 
        ref={glowRef}
        className="fixed inset-0 z-1 pointer-events-none opacity-50"
        style={{
          background: `radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(78, 165, 157, 0.3), transparent 35%)`
        }}
      />

      <div className="relative z-10 w-full max-w-[400px] px-6 animate-fadeIn">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-[#4ea59d] rounded-[28px] flex items-center justify-center shadow-2xl shadow-[#4ea59d]/40 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <i className="fa-solid fa-graduation-cap text-4xl text-white"></i>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic drop-shadow-lg">
            EduSphere
          </h1>
          <p className="text-[#4ea59d] text-sm font-bold uppercase tracking-[0.3em] mt-2 opacity-80">
            NextGen Learning Portal
          </p>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10">
          <h2 className="text-center text-xl font-black mb-8 text-[#0f2624] uppercase tracking-tight">
            Authenticate Account
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-[#4ea59d] uppercase tracking-widest mb-1.5 block ml-1">Identity (User ID)</label>
              <div className="relative group">
                <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4ea59d] transition-colors z-10"></i>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="parent@gmail.com"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-inner outline-none focus:border-[#4ea59d] focus:ring-4 focus:ring-[#4ea59d]/10 transition-all text-base font-semibold text-[#0f2624] placeholder-slate-400"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-[#4ea59d] uppercase tracking-widest mb-1.5 block ml-1">Access Key</label>
              <div className="relative group">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4ea59d] transition-colors z-10"></i>
                <input 
                  type={passwordVisible ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="EDU-2026-001"
                  className="w-full pl-12 pr-12 py-3 rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-inner outline-none focus:border-[#4ea59d] focus:ring-4 focus:ring-[#4ea59d]/10 transition-all text-base font-semibold text-[#0f2624] placeholder-slate-400"
                />
                <button 
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#4ea59d] transition-colors"
                >
                  <i className={`fa-solid ${passwordVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-xl mt-6 border border-red-100 flex items-center gap-3 animate-shake">
              <i className="fa-solid fa-circle-exclamation text-red-500 text-sm"></i>
              <p className="text-red-500 text-[10px] font-bold tracking-tight">{error}</p>
            </div>
          )}

          <button 
            onClick={handleSignIn}
            className="w-full mt-8 py-4 bg-[#4ea59d] text-white border-none rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-[#4ea59d]/30 hover:bg-[#3d8780] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
          >
            Sign In
          </button>
        </div>
        <p className="mt-10 text-center text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
          &copy; 2025 EduSphere Global Academy
        </p>
      </div>
    </div>
  );
};

export default Login;
