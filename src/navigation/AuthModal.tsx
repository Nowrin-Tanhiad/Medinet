import { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Shield, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../utils/api.ts';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  patient_uid?: string;
  is_profile_completed?: boolean;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set default mode on modal open: Signup first time, Login second time onwards
  useEffect(() => {
    if (isOpen) {
      const hasVisitedBefore = localStorage.getItem('mediconnect_has_opened_auth');
      if (!hasVisitedBefore) {
        setIsLoginMode(false); // Open Signup form first time
        localStorage.setItem('mediconnect_has_opened_auth', 'true');
      } else {
        setIsLoginMode(true); // Open Login form second time onwards
      }
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isLoginMode && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);

    const endpoint = isLoginMode ? getApiUrl('login.php') : getApiUrl('signup.php');
    const payload = isLoginMode
      ? { email, password }
      : { name, email, password, confirm_password: confirmPassword, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.user) {
        setSuccessMsg(data.message || 'Success!');
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
        }, 800);
      } else {
        setErrorMsg(data.message || 'An error occurred. Please check your credentials.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Failed to connect to PHP backend API: ' + (err.message || err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/60 backdrop-blur-md p-4 animate-fade-in">
      {/* Light Blue & White Aesthetic Container matching Website Theme */}
      <div className="relative w-full max-w-md bg-white border border-blue-100 rounded-[28px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,102,255,0.18)] text-[#0A192F]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-[#0066FF] transition-colors p-2 rounded-full hover:bg-blue-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0066FF]/10 text-[#0066FF] mb-3 border border-[#0066FF]/20 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-[#0A192F] tracking-tight">
            {isLoginMode ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {isLoginMode ? 'Sign in to access Bangladesh Healthcare Network' : 'Join MediConnect to manage healthcare & referrals'}
          </p>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}



        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Rahman Islam"
                  className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0A192F] font-medium focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anisur@medinet.com"
                className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0A192F] font-medium focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0A192F] font-medium focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
              />
            </div>
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066FF]" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0A192F] font-medium focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-[#0A192F] mb-1.5 uppercase tracking-wider">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#F4F8FF] border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0A192F] font-medium focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all cursor-pointer"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0066FF] hover:bg-[#0055E0] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_16px_rgba(0,102,255,0.3)] transition-all cursor-pointer disabled:opacity-50 mt-3"
          >
            {isLoading ? 'Processing...' : isLoginMode ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center text-xs font-medium text-slate-500">
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-[#0066FF] font-extrabold hover:underline ml-1"
          >
            {isLoginMode ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
