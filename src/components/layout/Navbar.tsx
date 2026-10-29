/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian - Neo-luxury Floating Navigation Bar
 */

import React, { useState } from 'react';
import { useBank } from '../../context/BankContext';
import { formatINR, maskAccountNumber } from '../../lib/money';
import {
  Copy,
  Check,
  LogOut,
  ChevronDown,
  Menu,
  X,
  LogIn,
  Bell,
  Sparkles,
  ShieldCheck,
  Building2,
  User,
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
}

/** Modern floral-spiral mark inspired by Lisso */
export const MeridianMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
    <path
      d="M16 2.5C18.5 7 21 11.5 25.5 13.5C21 15.5 18.5 20 16 29.5C13.5 20 11 15.5 6.5 13.5C11 11.5 13.5 7 16 2.5Z"
      fill="#141517"
    />
    <circle cx="16" cy="16" r="3.2" fill="#fec94a" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ currentPath }) => {
  const { currentAccount, accounts, switchAccount, logout, queueItems } = useBank();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [businessMode, setBusinessMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', path: '#/dashboard', match: ['#/dashboard', '#/', ''] },
    { id: 'transfer', label: 'Transfers', path: '#/transfer-pay', match: ['#/transfer-pay'] },
    {
      id: 'queue',
      label: 'Queue',
      path: '#/processing',
      match: ['#/processing', '#/queue'],
      badge: queueItems.length > 0 ? queueItems.length : undefined,
    },
    { id: 'history', label: 'History', path: '#/transactions', match: ['#/transactions', '#/history', '#/recent-stack'] },
    { id: 'analytics', label: 'Analytics', path: '#/analytics', match: ['#/analytics'] },
    { id: 'search', label: 'Search Lab', path: '#/search-lab', match: ['#/search-lab'] },
  ];

  const isActive = (match: string[]) =>
    match.some((m) => currentPath === m || (m !== '' && m !== '#/' && currentPath.startsWith(m)));

  const handleCopy = () => {
    if (!currentAccount) return;
    navigator.clipboard.writeText(currentAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const initial = currentAccount?.holder?.[0] ?? 'M';

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 py-2 bg-[#f4efe9]/85 backdrop-blur-md border-b border-[#e8e2d8]/60 transition-all">
      <div className="mx-auto max-w-7xl bg-white/95 backdrop-blur-xl rounded-full pl-4 pr-2.5 py-1.5 flex items-center justify-between gap-3 shadow-[0_4px_20px_-4px_rgba(20,21,23,0.06)] border border-white/90">
        {/* Brand */}
        <a href="#/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-transform group-hover:scale-105">
            <MeridianMark className="w-5 h-5" />
          </div>
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-950">Banking Simulator</span>
        </a>

        {/* Center Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium" aria-label="Primary">
          {tabs.map((t) => {
            const active = isActive(t.match);
            return (
              <a
                key={t.id}
                href={t.path}
                aria-current={active ? 'page' : undefined}
                className={`relative px-4 py-2 rounded-full transition-all duration-150 flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#141517] text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#f4efe9]'
                }`}
              >
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                      active ? 'bg-[#fec94a] text-[#141517]' : 'bg-[#141517] text-white'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Section: Segmented toggle, Notification bell, User pill */}
        <div className="flex items-center gap-2.5">
          {/* Segmented Private / Business Toggle */}
          <div className="hidden sm:inline-flex p-1 bg-[#f4efe9] rounded-full text-xs font-semibold">
            <button
              onClick={() => setBusinessMode(false)}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1.5 ${
                !businessMode
                  ? 'bg-[#141517] text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <User className="w-3 h-3" />
              Private
            </button>
            <button
              onClick={() => setBusinessMode(true)}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1.5 ${
                businessMode
                  ? 'bg-[#141517] text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Building2 className="w-3 h-3" />
              Corporate
            </button>
          </div>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 rounded-full bg-[#141517] text-white hover:bg-neutral-800 flex items-center justify-center transition-colors"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-neutral-200" />
              {queueItems.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#fec94a] ring-2 ring-[#141517]" />
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl p-4 z-50 shadow-[0_20px_50px_-15px_rgba(20,21,23,0.18)] border border-neutral-100 rise-in">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="text-sm font-semibold text-neutral-900">Notifications</span>
                    <span className="text-[11px] font-medium bg-[#f4efe9] text-neutral-600 px-2 py-0.5 rounded-full">
                      {queueItems.length} Pending
                    </span>
                  </div>
                  <div className="py-2 space-y-2">
                    {queueItems.length > 0 ? (
                      queueItems.slice(0, 3).map((item) => (
                        <div key={item.id} className="p-2.5 rounded-2xl bg-[#fcfbf9] border border-neutral-100 text-xs">
                          <div className="font-semibold text-neutral-900 flex items-center justify-between">
                            <span>{item.type}</span>
                            <span className="text-emerald-700 font-bold">{formatINR(item.amount)}</span>
                          </div>
                          <p className="text-neutral-500 mt-0.5 truncate">{item.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-neutral-500 py-3 text-center">All transactions are settled & verified.</p>
                    )}
                  </div>
                  <a
                    href="#/processing"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs font-semibold text-neutral-900 hover:text-neutral-600 pt-2 border-t border-neutral-100"
                  >
                    Open Processing Queue &rarr;
                  </a>
                </div>
              </>
            )}
          </div>

          {currentAccount ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-[#f4efe9] hover:bg-[#e8e2d8] rounded-full pl-1.5 pr-3 py-1.5 transition-colors"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="w-8 h-8 rounded-full bg-[#fec94a] text-[#141517] flex items-center justify-center text-sm font-bold shadow-sm">
                  {initial}
                </span>
                <span className="text-xs font-semibold text-neutral-900 max-w-[85px] truncate hidden sm:inline">
                  {currentAccount.holder.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl p-3 z-50 shadow-[0_24px_50px_-15px_rgba(20,21,23,0.2)] border border-neutral-100 rise-in">
                    <div className="px-3 pt-2 pb-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Switch Customer
                    </div>
                    <div className="space-y-1 mt-1 max-h-72 overflow-y-auto">
                      {accounts.map((acc) => {
                        const current = acc.id === currentAccount.id;
                        return (
                          <button
                            key={acc.id}
                            onClick={() => {
                              switchAccount(acc.id);
                              setMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-colors ${
                              current ? 'bg-[#fec94a]/30 border border-[#fec94a]/50' : 'hover:bg-[#f4efe9]'
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                current ? 'bg-[#141517] text-[#fec94a]' : 'bg-[#f4efe9] text-neutral-800'
                              }`}
                            >
                              {acc.holder[0]}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-semibold text-neutral-900 truncate">{acc.holder}</span>
                              <span className="block text-[11px] text-neutral-500 tabular-nums">{acc.accountNumber}</span>
                            </span>
                            <span className="text-xs font-bold tabular-nums text-neutral-900">{formatINR(acc.balance)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-neutral-100">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a
              href="#/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#141517] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </a>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-9 h-9 rounded-full bg-[#141517] text-white flex items-center justify-center"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden mx-auto max-w-7xl mt-2 bg-white rounded-3xl p-3 shadow-xl border border-neutral-100 rise-in">
          <div className="space-y-1">
            {tabs.map((t) => {
              const active = isActive(t.match);
              return (
                <a
                  key={t.id}
                  href={t.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold ${
                    active ? 'bg-[#141517] text-white' : 'text-neutral-700 hover:bg-[#f4efe9]'
                  }`}
                >
                  <span>{t.label}</span>
                  {t.badge !== undefined && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#fec94a] text-[#141517] text-[10px] font-bold flex items-center justify-center">
                      {t.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
