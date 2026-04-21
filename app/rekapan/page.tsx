'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';

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
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { groupByEmployeeForRecap } from '@/lib/utils/transformers';
import { Employee, RatingRecord, RecapRow } from '@/lib/types';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function RekapanPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recapData, setRecapData] = useState<RecapRow[]>([]);
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
        if (user.role !== 'manager') {
          alert('Akses Ditolak: Hanya manager yang bisa mengakses halaman rekapan.');
          router.push('/penilaian');
          return;
        }
        setCurrentUser(user);
        loadData(dateRange.start, dateRange.end);
      } catch {
        router.push('/login');
      }
    }
    initAuth();
  }, []);

  const loadData = async (start: string, end: string) => {
    setLoading(true);
    try {
      const [resMaster, resPenilaian] = await Promise.all([
        fetch('/api/sheets/master-list'),
        fetch(`/api/sheets/penilaian?startDate=${start}&endDate=${end}`),
      ]);
      const dataMaster = await resMaster.json();
      const dataPenilaian = await resPenilaian.json();

      if (dataMaster.success && dataPenilaian.success) {
        const grouped = groupByEmployeeForRecap(
          dataPenilaian.data as RatingRecord[],
          dataMaster.data as Employee[]
        );
        setRecapData(grouped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRange = (range: typeof QUICK_RANGES[0]) => {
    const val = range.getValue();
    setDateRange(val);
    setActiveQuick(range.label);
    loadData(val.start, val.end);
  };

  const handleCustomRange = () => {
    setActiveQuick('Custom');
    loadData(dateRange.start, dateRange.end);
  };

  const toggleExpand = (employeeId: string) => {
    setRecapData((prev) =>
      prev.map((row) =>
        row.employeeId === employeeId ? { ...row, isExpanded: !row.isExpanded } : row
      )
    );
  };

  const formatDateLabel = () => {
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} – ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const totalDinilai = recapData.length;
  const avgScore = totalDinilai > 0
    ? recapData.reduce((s, r) => s + r.averageScore, 0) / totalDinilai
    : 0;

  return (
    <div className="h-screen bg-[#e8ecf1] flex flex-col md:flex-row p-4 sm:p-6 gap-4 md:gap-6 font-sans overflow-hidden">
      <Sidebar currentUser={currentUser} />

      <main className="flex-1 overflow-y-auto bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

        <div className="p-8 sm:p-12 h-full flex flex-col relative z-10">

          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#1a1a1a] tracking-tight mb-2">Rekapan Nilai Karyawan</h1>
              <p className="text-sm text-neutral-500 font-medium">Lihat dan ekspor hasil penilaian karyawan dari semua penilai.</p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button className="px-5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 transition-all">
                Ekspor CSV
              </button>
              <button className="px-5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 transition-all">
                Ekspor PDF
              </button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="mb-6 bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Filter Rentang Waktu</span>
            </div>
            
            {/* Quick Options */}
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => handleQuickRange(r)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeQuick === r.label
                      ? 'bg-[#1a1a1a] text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom Date */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-bold text-neutral-500 block mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => { setDateRange((p) => ({ ...p, start: e.target.value })); setActiveQuick('Custom'); }}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-neutral-500 block mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => { setDateRange((p) => ({ ...p, end: e.target.value })); setActiveQuick('Custom'); }}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 bg-white"
                />
              </div>
              <button
                onClick={handleCustomRange}
                className="px-5 py-2.5 bg-[#1a1a1a] text-white text-sm font-bold rounded-xl hover:bg-black transition-all shadow-sm"
              >
                Terapkan
              </button>
            </div>

            {/* Active period label */}
            <p className="text-xs text-neutral-400 mt-3 font-medium">
              Menampilkan data: <span className="font-bold text-neutral-600">{formatDateLabel()}</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-white/60 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Total Dinilai</p>
              <p className="text-3xl font-extrabold text-[#1a1a1a]">{totalDinilai}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-white/60 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Rata-rata Score</p>
              <p className={`text-3xl font-extrabold ${avgScore >= 4 ? 'text-emerald-600' : avgScore >= 3 ? 'text-blue-600' : avgScore > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>
                {avgScore > 0 ? avgScore.toFixed(2) : '–'}
              </p>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex-1 flex flex-col">
              {recapData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center">
                  <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-5 text-4xl">📊</div>
                  <h3 className="text-lg font-extrabold text-neutral-800 mb-2">Belum ada karyawan yang dinilai</h3>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Belum ada data penilaian untuk periode <span className="font-semibold text-neutral-700">{formatDateLabel()}</span>.
                    Coba pilih rentang waktu yang berbeda atau tunggu penilai mengisi penilaian.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#f8fafc] border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4 font-bold text-neutral-500 w-16">No</th>
                        <th className="px-6 py-4 font-bold text-neutral-500">Nama</th>
                        <th className="px-6 py-4 font-bold text-neutral-500">Outlet</th>
                        <th className="px-6 py-4 font-bold text-neutral-500">Posisi</th>
                        <th className="px-6 py-4 font-bold text-neutral-500 text-center w-28">Rata²</th>
                        <th className="px-6 py-4 font-bold text-neutral-500 text-center w-28">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {recapData.map((row) => (
                        <React.Fragment key={row.employeeId}>
                          <tr
                            className={`hover:bg-neutral-50 transition-colors cursor-pointer ${row.isExpanded ? 'bg-blue-50/40' : 'bg-white'}`}
                            onClick={() => toggleExpand(row.employeeId)}
                          >
                            <td className="px-6 py-4 font-medium text-neutral-500">{row.no}</td>
                            <td className="px-6 py-4 font-bold text-[#1a1a1a]">
                              <div className="flex items-center gap-2">
                                <span>{row.employeeName}</span>
                                {row.isExpanded
                                  ? <ChevronUp className="w-4 h-4 text-neutral-400" />
                                  : <ChevronDown className="w-4 h-4 text-neutral-300" />
                                }
                              </div>
                              <p className="text-xs text-neutral-400 font-normal mt-0.5">{row.raters.length} penilai</p>
                            </td>
                            <td className="px-6 py-4 font-medium text-neutral-600">{row.outlet}</td>
                            <td className="px-6 py-4 text-neutral-500">{row.position}</td>
                            <td className={`px-6 py-4 text-center font-extrabold text-lg ${row.averageScore >= 4 ? 'text-emerald-600' : row.averageScore >= 3 ? 'text-blue-600' : row.averageScore >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                              {row.averageScore.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {(() => {
                                const grade = getPredikat(row.averageScore);
                                return (
                                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-base font-extrabold border-2 ${getPredikatStyle(grade)}`}>
                                    {grade}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                          {row.isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0 bg-blue-50/20 border-b border-neutral-100">
                                <div className="py-4 px-6 md:px-16">
                                  <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest mb-3">Detail per Penilai</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {row.raters.map((rater, idx) => (
                                      <div key={idx} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex justify-between items-center text-sm">
                                        <div>
                                          <p className="font-bold text-neutral-800">{rater.raterName}</p>
                                          <p className="text-xs font-medium text-neutral-400 mt-0.5">
                                            {rater.submittedDate ? rater.submittedDate.split(' ')[0] : '-'}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className={`font-extrabold text-lg ${rater.averageScore >= 4 ? 'text-emerald-600' : rater.averageScore >= 3 ? 'text-blue-600' : 'text-amber-600'}`}>
                                            {rater.averageScore.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
