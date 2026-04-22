'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Trophy, LogOut, Building2, Briefcase, BarChart3 } from 'lucide-react';
import { User as UserType } from '@/lib/types';

interface SidebarProps {
  currentUser: UserType | null;
}

export function Sidebar({ currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', path: '/penilaian', icon: LayoutDashboard },
    { name: 'Rekap Nilai', path: '/rekapan', icon: CheckSquare, restrictedTo: ['manager', 'direksi'] },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Nilai Manager', path: '/penilaian-manager', icon: Briefcase, restrictedTo: ['direksi'] },
    { name: 'Rekap Manager', path: '/rekap-manager', icon: BarChart3, restrictedTo: ['direksi'] },
  ];


  return (
    <aside className="w-full md:w-64 flex-shrink-0 flex md:flex-col bg-white md:rounded-[2rem] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:h-full overflow-x-auto md:overflow-hidden border border-neutral-100 mb-4 md:mb-0 transition-all">
      
      {/* Brand */}
      <div className="p-4 md:p-8 flex items-center space-x-3 md:border-b-0 border-r border-neutral-100 md:border-r-0 flex-shrink-0">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center -rotate-3">
          <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
        <div className="hidden sm:block">
          <h2 className="font-extrabold text-lg md:text-xl text-[#1a1a1a]">ERS</h2>
          <p className="text-[9px] md:text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Easy Going</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 md:px-6 py-2 md:py-0 flex md:flex-col md:space-y-2 md:mt-4 overflow-x-auto items-center md:items-stretch hide-scrollbar">
        <div className="hidden md:block text-xs font-bold text-neutral-400 mb-4 px-2 tracking-wider">MAIN MENU</div>
        {navItems.map((item) => {
          if (item.restrictedTo && currentUser && !item.restrictedTo.includes(currentUser.role)) {
            return null;
          }
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-2 md:space-x-3 px-3 py-2 md:px-4 md:py-3.5 rounded-xl md:rounded-2xl transition-all duration-200 font-semibold text-xs md:text-sm whitespace-nowrap mx-1 md:mx-0 ${
                isActive
                  ? 'bg-[#1a1a1a] text-white shadow-md'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
              <span className={isActive ? 'block' : 'hidden sm:block'}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profile & Logout */}
      {currentUser && (
        <div className="p-2 md:p-6 md:border-t border-l border-neutral-100 md:border-l-0 flex items-center md:flex-col flex-shrink-0">
          <div className="flex items-center space-x-3 md:mb-6 px-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-200 border-2 border-white shadow-sm flex items-center justify-center">
              <span className="font-bold text-neutral-600 text-xs md:text-sm">{currentUser.name.charAt(0)}</span>
            </div>
            <div className="hidden md:block flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate">{currentUser.name}</p>
              <p className="text-xs font-medium text-neutral-400 truncate capitalize">{currentUser.role}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center md:justify-start space-x-2 md:space-x-3 px-2 py-2 md:px-4 md:py-3 md:w-full text-xs md:text-sm font-semibold text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl md:rounded-2xl transition-colors ml-2 md:ml-0"
            title="Keluar Sistem"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:block">Keluar Sistem</span>
          </button>
        </div>
      )}
    </aside>
  );
}
