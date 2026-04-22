'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Calendar, ChevronDown, ChevronUp, Users } from 'lucide-react';

function getPredikat(avg: number): string {
  const map: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
  return map[Math.round(avg)] || 'E';
}

function getPredikatStyle(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'B': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'C': return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'D': return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'E': return 'bg-red-100 text-red-700 border-red-300';
    default:  return 'bg-neutral-100 text-neutral-500 border-neutral-300';
  }
}

function getScoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-600';
  if (score >= 3) return 'text-blue-600';
  if (score >= 2) return 'text-amber-600';
  if (score > 0) return 'text-red-500';
  return 'text-neutral-400';
}

const DIVISION_COLORS: Record<string, string> = {
  SDM:       'bg-violet-100 text-violet-700 border-violet-200',
  Keuangan:  'bg-blue-100 text-blue-700 border-blue-200',
  Inventory: 'bg-teal-100 text-teal-700 border-teal-200',
  Komersial: 'bg-amber-100 text-amber-700 border-amber-200',
  Lainnya:   'bg-neutral-100 text-neutral-600 border-neutral-200',
};

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

const QUICK_RANGES = [
  { label: 'Bulan Ini', getValue: () => getDefaultDateRange() },
  {
    label: 'Bulan Lalu', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      return { start: fmt(start), end: fmt(end) };
    }
  },
  {
    label: '3 Bulan Terakhir', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      return { start: fmt(start), end: fmt(end) };
    }
  },
  {
    label: 'Tahun Ini', getValue: () => {
      const now = new Date();
      return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
    }
  },
];

interface ManagerRecap {
  managerId: string;
  managerName: string;
  divisi: string;
  raters: { raterId: string; raterName: string; averageScore: number; submittedDate: string }[];
  averageScore: number;
  isExpanded: boolean;
}

export default function RekapManagerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recapData, setRecapData] = useState<ManagerRecap[]>([]);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [activeQuick, setActiveQuick] = useState('Bulan Ini');

  useEffect(() => {
    async function initAuth() {
      try {
        const resMe = await fetch('/api/auth/me');
        if (!resMe.ok) { router.push('/login'); return; }
        const dataMe = await resMe.json();
        if (!dataMe.success || !dataMe.user) { router.push('/login'); return; }
        const user = dataMe.user;
        if (user.role !== 'direksi') {
          alert('Akses Ditolak: Halaman ini hanya untuk Direksi.');
          router.push('/penilaian'); return;
        }
        setCurrentUser(user);
        loadData(dateRange.start, dateRange.end);
      } catch { router.push('/login'); }
    }
    initAuth();
  }, []);

  const loadData = async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/penilaian-manager?startDate=${start}&endDate=${end}`);
      const data = await res.json();

      if (data.success) {
        // Group by manager
        const grouped = new Map<string, any[]>();
        data.data.forEach((row: any) => {
          const key = row.managerDinilai;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(row);
        });

        const recap: ManagerRecap[] = Array.from(grouped.entries()).map(([mgrRaw, rows]) => {
          const [managerId, ...nameParts] = mgrRaw.split('_');
          const managerName = nameParts.join('_') || managerId;
          const avgScore = rows.reduce((sum: number, r: any) => sum + r.totalPoint, 0) / rows.length;
          return {
            managerId,
            managerName,
            divisi: rows[0]?.divisi || 'Lainnya',
            raters: rows.map((r: any) => {
              const [raterId, ...raterNameParts] = (r.namaPenilai || '').split('_');
              return {
                raterId,
                raterName: raterNameParts.join('_') || raterId,
                averageScore: r.totalPoint,
                submittedDate: r.tanggal,
              };
            }),
            averageScore: avgScore,
            isExpanded: false,
          };
        }).sort((a, b) => b.averageScore - a.averageScore);

        setRecapData(recap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (managerId: string) => {
    setRecapData((prev) => prev.map((r) => r.managerId === managerId ? { ...r, isExpanded: !r.isExpanded } : r));
  };

  const handleQuickRange = (range: typeof QUICK_RANGES[0]) => {
    const val = range.getValue();
    setDateRange(val);
    setActiveQuick(range.label);
    loadData(val.start, val.end);
  };

  const formatDateLabel = () => {
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} – ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const totalDinilai = recapData.length;
  const avgScore = totalDinilai > 0 ? recapData.reduce((s, r) => s + r.averageScore, 0) / totalDinilai : 0;

  return (
    <div className="min-h-screen bg-[#e8ecf1] flex flex-col md:flex-row p-3 sm:p-4 md:p-6 gap-3 md:gap-6 font-sans">
      <Sidebar currentUser={currentUser} />

      <main className="flex-1 min-w-0 bg-white/70 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
        <div className="p-4 sm:p-6 md:p-10 flex flex-col relative z-10">

          {/* Header */}
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold mb-3">
              <span>👔</span> Rekap Khusus Direksi
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1a1a1a] tracking-tight mb-1">Rekap Penilaian Manager</h1>
            <p className="text-xs sm:text-sm text-neutral-500">Lihat hasil penilaian kinerja seluruh manager dari penilaian direksi.</p>
          </div>

          {/* Date Filter */}
          <div className="mb-4 bg-white rounded-2xl border border-neutral-100 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Filter Rentang Waktu</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_RANGES.map((r) => (
                <button key={r.label} onClick={() => handleQuickRange(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeQuick === r.label ? 'bg-[#1a1a1a] text-white shadow-md' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-bold text-neutral-500 block mb-1">Dari Tanggal</label>
                <input type="date" value={dateRange.start}
                  onChange={(e) => { setDateRange((p) => ({ ...p, start: e.target.value })); setActiveQuick('Custom'); }}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 bg-white" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-neutral-500 block mb-1">Sampai Tanggal</label>
                <input type="date" value={dateRange.end}
                  onChange={(e) => { setDateRange((p) => ({ ...p, end: e.target.value })); setActiveQuick('Custom'); }}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 bg-white" />
              </div>
              <button onClick={() => { setActiveQuick('Custom'); loadData(dateRange.start, dateRange.end); }}
                className="px-5 py-2 bg-[#1a1a1a] text-white text-sm font-bold rounded-xl hover:bg-black transition-all shadow-sm">
                Terapkan
              </button>
            </div>
            <p className="text-xs text-neutral-400 mt-3">Menampilkan data: <span className="font-bold text-neutral-600">{formatDateLabel()}</span></p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/80 backdrop-blur-sm p-3 sm:p-5 rounded-2xl border border-white/60 shadow-sm">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Manager Dinilai</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a]">{totalDinilai}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3 sm:p-5 rounded-2xl border border-white/60 shadow-sm">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Rata-rata Score</p>
              <p className={`text-2xl sm:text-3xl font-extrabold ${getScoreColor(avgScore)}`}>
                {avgScore > 0 ? avgScore.toFixed(2) : '–'}
              </p>
            </div>
          </div>

          {/* Card List */}
          {loading ? (
            <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
              {recapData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-3xl">👔</div>
                  <h3 className="text-base font-extrabold text-neutral-800 mb-2">Belum ada manager yang dinilai</h3>
                  <p className="text-sm text-neutral-500">Belum ada data penilaian manager untuk periode <span className="font-semibold text-neutral-700">{formatDateLabel()}</span>.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {recapData.map((row, i) => {
                    const grade = getPredikat(row.averageScore);
                    return (
                      <div key={row.managerId}>
                        <button onClick={() => toggleExpand(row.managerId)}
                          className={`w-full text-left px-4 py-4 transition-colors ${row.isExpanded ? 'bg-blue-50/40' : 'bg-white hover:bg-neutral-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-extrabold text-white">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-extrabold text-[#1a1a1a] text-sm">{row.managerName}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${DIVISION_COLORS[row.divisi] || DIVISION_COLORS.Lainnya}`}>{row.divisi}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Users className="w-3 h-3 text-neutral-400" />
                                <span className="text-[11px] text-neutral-400">{row.raters.length} penilai</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <p className={`font-extrabold text-base ${getScoreColor(row.averageScore)}`}>{row.averageScore.toFixed(2)}</p>
                              </div>
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold border-2 ${getPredikatStyle(grade)}`}>{grade}</span>
                              {row.isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-300" />}
                            </div>
                          </div>
                        </button>
                        {row.isExpanded && (
                          <div className="bg-blue-50/20 border-t border-neutral-100 px-4 py-3">
                            <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest mb-2">Detail per Penilai</p>
                            <div className="space-y-2">
                              {row.raters.map((rater, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex justify-between items-center">
                                  <div>
                                    <p className="font-bold text-neutral-800 text-xs">{rater.raterName}</p>
                                    <p className="text-[11px] text-neutral-400 mt-0.5">{rater.submittedDate ? rater.submittedDate.split(' ')[0] : '-'}</p>
                                  </div>
                                  <p className={`font-extrabold text-base ${getScoreColor(rater.averageScore)}`}>{rater.averageScore.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
