'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, ChevronDown, Search, User } from 'lucide-react';
import { VALID_CREDENTIALS } from '@/lib/utils/constants';

interface EmployeeOption {
  id: string;
  name: string;
  outlet: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<EmployeeOption | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/sheets/master-list');
        const data = await res.json();
        if (data.success && data.data) {
          const validUsers: EmployeeOption[] = data.data.filter((emp: any) =>
            Object.keys(VALID_CREDENTIALS).includes(emp.id)
          );

          if (!validUsers.find((u) => u.id === 'admin.media@easygoing.id')) {
            validUsers.push({ id: 'admin.media@easygoing.id', name: 'Admin Media', outlet: 'BTM' });
          }

          // Ensure unique IDs in case spreadsheet has duplicates
          const uniqueUsers = Array.from(new Map(validUsers.map(u => [u.id, u])).values());

          setEmployees(uniqueUsers);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setFetchingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.outlet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (emp: EmployeeOption) => {
    setSelectedUser(emp);
    setDropdownOpen(false);
    setSearchQuery('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Silakan pilih Pengguna terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser.id, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/penilaian');
        router.refresh();
      } else {
        setError(data.message || 'Gagal login. Periksa password.');
      }
    } catch {
      setError('Terjadi kesalahan koneksi server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (id: string) => {
    if (id.startsWith('MGR') || id === 'admin.media@easygoing.id' || id.startsWith('FRC') || id.startsWith('EGC-001')) return 'Manager';
    return 'Supervisor';
  };

  const getRoleColor = (id: string) => {
    if (id.startsWith('MGR') || id === 'admin.media@easygoing.id') 
      return 'bg-violet-100 text-violet-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="min-h-screen bg-[#e8ecf1] relative flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/40 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-neutral-200/50 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-white/50 p-8 sm:p-10">

          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-neutral-900/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1a1a1a] mb-2">Login ERS</h1>
            <p className="text-neutral-500 font-medium text-sm">Masuk untuk memulai penilaian karyawan</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Custom User Picker */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-800">Pilih Pengguna</label>

              {fetchingUsers ? (
                <div className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl text-sm text-neutral-400 flex items-center shadow-sm">
                  <span className="w-4 h-4 mr-3 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin flex-shrink-0" />
                  Memuat data pengguna...
                </div>
              ) : (
                <div ref={dropdownRef} className="relative">
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 bg-white border rounded-2xl text-sm font-medium transition-all duration-200 shadow-sm text-left ${
                      dropdownOpen
                        ? 'border-[#1a1a1a] ring-2 ring-[#1a1a1a]/10'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {selectedUser ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-neutral-600 text-xs">{selectedUser.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate">{selectedUser.name}</p>
                          <p className="text-xs text-neutral-400">{selectedUser.outlet} · {selectedUser.id}</p>
                        </div>
                        <span className={`ml-auto flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleColor(selectedUser.id)}`}>
                          {getRoleLabel(selectedUser.id)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-neutral-400">
                        <User className="w-5 h-5 flex-shrink-0" />
                        <span>-- Pilih Akun Anda --</span>
                      </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-neutral-400 flex-shrink-0 ml-2 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Panel */}
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)] z-50 overflow-hidden">
                      {/* Search */}
                      <div className="p-2 border-b border-neutral-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input
                            ref={searchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama atau ID..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10 focus:border-neutral-300 transition-all"
                          />
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="max-h-56 overflow-y-auto">
                        {filteredEmployees.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-neutral-400">
                            Tidak ada pengguna ditemukan
                          </div>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => handleSelectUser(emp)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors ${
                                selectedUser?.id === emp.id ? 'bg-neutral-50' : ''
                              }`}
                            >
                              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                                <span className="font-bold text-neutral-600 text-sm">{emp.name.charAt(0)}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-neutral-900 truncate">{emp.name}</p>
                                <p className="text-xs text-neutral-400">{emp.outlet} · {emp.id}</p>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleColor(emp.id)}`}>
                                {getRoleLabel(emp.id)}
                              </span>
                              {selectedUser?.id === emp.id && (
                                <span className="text-[#1a1a1a] ml-1 flex-shrink-0">✓</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-800" htmlFor="password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] transition-all duration-200 shadow-sm"
                  placeholder="Masukkan Password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-start">
                <span className="mr-2 flex-shrink-0">🚨</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || fetchingUsers || !selectedUser}
              className="w-full flex justify-center items-center py-4 rounded-2xl shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] text-sm font-bold text-white bg-[#1a1a1a] hover:bg-black hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                'Masuk ke Sistem'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
