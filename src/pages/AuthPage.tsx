/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian - Luxury Neo-Fintech Authentication
 */

import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { formatINR } from '../lib/money';
import { MeridianMark } from '../components/layout/Navbar';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register, accounts } = useBank();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [credential, setCredential] = useState<string>('aman@banksimulator.demo');
  const [password, setPassword] = useState<string>('Demo@1234');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [holderName, setHolderName] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!credential.trim()) {
      setAuthError('Please enter your email or account number.');
      return;
    }
    const ok = login(credential.trim());
    if (!ok) {
      setAuthError('Customer profile not found. Select one of the demo customer profiles below.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!holderName.trim()) {
      setAuthError('Please provide your full legal name.');
      return;
    }
    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      setAuthError('Please provide a valid email address.');
      return;
    }
    if (registerPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      register(holderName, registerEmail);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (customerEmail: string) => {
    login(customerEmail);
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3 text-sm rounded-full bg-[#f4efe9] border border-neutral-200/50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:bg-white';
  const iconCls = 'w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400';
  const labelCls = 'block text-xs font-semibold text-neutral-700 mb-1 pl-1';
  const primaryBtn =
    'w-full pl-6 pr-2 py-2 rounded-full bg-[#141517] hover:bg-neutral-800 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-between shadow-sm disabled:opacity-60';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-10 selection:bg-[#fec94a]">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Brand Side Panel */}
        <section className="lg:col-span-5 bg-[#141517] text-white rounded-[2rem] p-8 sm:p-10 flex flex-col justify-between min-h-[340px] lg:min-h-[580px] relative overflow-hidden shadow-2xl rise-in">
          <div className="flex items-center gap-2.5 z-10">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
              <MeridianMark className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">Banking Simulator</span>
          </div>

          <div className="relative z-10 my-auto py-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fec94a] bg-neutral-800/80 px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen Banking Platform
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">
              Intelligent treasury, instant liquidity.
            </h1>
            <p className="text-neutral-400 mt-3 text-sm leading-relaxed">
              Enterprise-grade digital banking simulation with automated FIFO clearing, atomic double-entry ledger, and AI-powered copilot.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Reserve Verified
            </span>
            <span className="tabular-nums font-mono text-[11px]">v8.3 · Invariant Locked</span>
          </div>
        </section>

        {/* Auth Form Panel */}
        <section className="lg:col-span-7 porcelain-card p-7 sm:p-10 flex flex-col justify-center shadow-lg rise-in">
          {/* Toggle pill */}
          <div className="grid grid-cols-2 p-1 bg-[#f4efe9] rounded-full text-xs font-semibold mb-6 max-w-xs">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setAuthError('');
              }}
              className={`py-2 rounded-full transition-all duration-150 ${
                mode === 'LOGIN' ? 'bg-[#141517] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setAuthError('');
              }}
              className={`py-2 rounded-full transition-all duration-150 ${
                mode === 'REGISTER' ? 'bg-[#141517] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Open Account
            </button>
          </div>

          <h2 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            {mode === 'LOGIN' ? 'Welcome back' : 'Open a new account'}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 mb-5">
            {mode === 'LOGIN'
              ? 'Enter your customer email or 12-digit account number.'
              : 'New accounts receive a welcome credit of ₹10,000 and unique 12-digit account number.'}
          </p>

          {authError && (
            <div role="alert" className="mb-4 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {mode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="cred" className={labelCls}>
                  Email or Account Number
                </label>
                <div className="relative">
                  <Mail className={iconCls} />
                  <input
                    id="cred"
                    type="text"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="aman@banksimulator.demo"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pw" className={labelCls}>
                  Password
                </label>
                <div className="relative">
                  <Lock className={iconCls} />
                  <input
                    id="pw"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${inputCls} pr-11`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" className={`${primaryBtn} mt-3`}>
                <span>Sign in to Banking Simulator</span>
                <span className="w-8 h-8 rounded-full bg-[#fec94a] text-[#141517] flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="rname" className={labelCls}>
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className={iconCls} />
                  <input
                    id="rname"
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="Vikram Malhotra"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="remail" className={labelCls}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={iconCls} />
                  <input
                    id="remail"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="vikram@banksimulator.demo"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rpw" className={labelCls}>
                  Password
                </label>
                <div className="relative">
                  <Lock className={iconCls} />
                  <input
                    id="rpw"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className={`${primaryBtn} mt-3`}>
                <span>{isSubmitting ? 'Opening account…' : 'Open Account & Claim ₹10,000'}</span>
                <span className="w-8 h-8 rounded-full bg-[#fec94a] text-[#141517] flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </form>
          )}

          {/* Quick Demo Customer Sign In */}
          <div className="mt-7 pt-5 border-t border-neutral-100">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2.5">
              Or Fast-Sign In As Demo Customer:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accounts.slice(0, 6).map((acc, i) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  className="text-left p-2.5 rounded-2xl bg-[#f4efe9] hover:bg-[#fec94a]/30 border border-neutral-200/40 transition-colors"
                >
                  <div className="text-xs font-semibold text-neutral-900 truncate">{acc.holder}</div>
                  <div className="text-[11px] text-neutral-500 tabular-nums truncate">{formatINR(acc.balance)}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
