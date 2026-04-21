'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { LeaderboardEntry, RatingRecord, Employee } from '@/lib/types';
import { normalizeLeaderboardScores } from '@/lib/utils/calculations';
import { Calendar, Share2, Check, Link } from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────── */
function getPredikat(score: number): string {
  const map: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
  return map[Math.round(score)] || 'E';
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

function getScoreColor(score: number) {
  if (score >= 4.5) return 'text-emerald-600';
  if (score >= 3.5) return 'text-blue-600';
  if (score >= 2.5) return 'text-amber-600';
  if (score > 0) return 'text-red-500';
  return 'text-neutral-400';
}

const RANK_STYLE: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-l-yellow-400',
  2: 'bg-gradient-to-r from-neutral-50 to-slate-50 border-l-4 border-l-slate-400',
  3: 'bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-l-orange-400',
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

/* ─── Share Button Component ────────────────────────────────── */
function ShareButton({ start, end }: { start: string; end: string }) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/leaderboard?start=${start}&end=${end}`
      : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] hover:bg-black text-white rounded-xl text-sm font-bold shadow-md hover:-translate-y-0.5 transition-all"
      >
        <Share2 className="w-4 h-4" />
        Bagikan Link
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-5 mx-auto">
              <Share2 className="w-6 h-6 text-white" />
            </div>

            <h2 className="text-xl font-extrabold text-center text-[#1a1a1a] mb-1">Bagikan Leaderboard</h2>
            <p className="text-sm text-neutral-500 text-center mb-6">
              Siapapun yang membuka link ini akan melihat leaderboard periode yang sama tanpa perlu login.
            </p>

            {/* URL Box */}
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-5">
              <Link className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span className="text-xs text-neutral-600 font-medium flex-1 truncate">{shareUrl}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-all"
              >
                Tutup
              </button>
              <button
                onClick={handleCopy}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#1a1a1a] text-white hover:bg-black'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Link Disalin!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Salin Link
                  </>
                )}
              </button>
            </div>

            {/* Info */}
            <p className="text-xs text-neutral-400 text-center mt-4">
              🔓 Halaman leaderboard dapat diakses tanpa login
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const defaultRange = getDefaultDateRange();

  // Read date range from URL params (so shared links work)
  const [dateRange, setDateRange] = useState({
    start: searchParams.get('start') || defaultRange.start,
    end: searchParams.get('end') || defaultRange.end,
  });
  const [activeQuick, setActiveQuick] = useState(() => {
    // If URL has custom params, mark as Custom
    if (searchParams.get('start') || searchParams.get('end')) return 'Custom';
    return 'Bulan Ini';
  });

  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);

  // Sync URL params whenever dateRange changes
  const updateUrl = useCallback((start: string, end: string) => {
    const params = new URLSearchParams();
    params.set('start', start);
    params.set('end', end);
    router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
  }, [router]);

  const loadData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const [resMaster, resPenilaian] = await Promise.all([
        fetch('/api/sheets/master-list'),
        fetch(`/api/sheets/penilaian?startDate=${start}&endDate=${end}`),
      ]);
      const dataMaster = await resMaster.json();
      const dataPenilaian = await resPenilaian.json();

      if (dataMaster.success && dataPenilaian.success) {
        const normalized = normalizeLeaderboardScores(
          dataPenilaian.data as RatingRecord[],
          dataMaster.data as Employee[]
        );
        setLeaderboardData(normalized);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount with URL params
  useEffect(() => {
    loadData(dateRange.start, dateRange.end);
  }, []);

  const handleQuickRange = (range: typeof QUICK_RANGES[0]) => {
    const val = range.getValue();
    setDateRange(val);
    setActiveQuick(range.label);
    updateUrl(val.start, val.end);
    loadData(val.start, val.end);
  };

  const handleCustomRange = () => {
    setActiveQuick('Custom');
    updateUrl(dateRange.start, dateRange.end);
    loadData(dateRange.start, dateRange.end);
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const formatDateLabel = () => {
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} – ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  };

  return (
    <div className="h-screen bg-[#e8ecf1] flex flex-col md:flex-row p-4 sm:p-6 gap-4 md:gap-6 font-sans overflow-hidden">
      <Sidebar currentUser={null} />

      <main className="flex-1 overflow-y-auto bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

        <div className="p-8 sm:p-12 h-full flex flex-col relative z-10">

          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#1a1a1a] tracking-tight mb-2">Leaderboard Karyawan</h1>
              <p className="text-sm text-neutral-500 font-medium">Penilaian Karyawan Terbaik – Fair Output Assessment</p>
            </div>
            {/* Share Button */}
            <div className="flex-shrink-0">
              <ShareButton start={dateRange.start} end={dateRange.end} />
            </div>
          </div>

          {/* Date Filter */}
          <div className="mb-6 bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Filter Periode</span>
            </div>

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

            <p className="text-xs text-neutral-400 mt-3 font-medium">
              Menampilkan data: <span className="font-bold text-neutral-600">{formatDateLabel()}</span>
            </p>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex-1 flex flex-col">
              {leaderboardData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center">
                  <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-5 text-4xl">🏆</div>
                  <h3 className="text-lg font-extrabold text-neutral-800 mb-2">Belum ada karyawan yang dinilai bulan ini</h3>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Belum ada data penilaian untuk periode <span className="font-semibold text-neutral-700">{formatDateLabel()}</span>.
                    Coba pilih rentang waktu yang berbeda.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-[#f8fafc] border-b border-neutral-100">
                      <tr>
                        <th className="px-6 py-4 font-extrabold text-neutral-400 uppercase tracking-widest text-xs w-20 text-center">Rank</th>
                        <th className="px-6 py-4 font-extrabold text-neutral-400 uppercase tracking-widest text-xs">Nama Karyawan</th>
                        <th className="px-6 py-4 font-extrabold text-neutral-400 uppercase tracking-widest text-xs hidden md:table-cell">Posisi</th>
                        <th className="px-6 py-4 font-extrabold text-neutral-400 uppercase tracking-widest text-xs text-center">Outlet</th>
                        <th className="px-6 py-4 font-extrabold text-neutral-400 uppercase tracking-widest text-xs text-center">Score</th>
                        <th className="px-6 py-4 font-extrabold text-neutral-400 uppercase tracking-widest text-xs text-center">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {leaderboardData.map((row) => (
                        <tr
                          key={row.employeeId}
                          className={`hover:brightness-[0.97] transition-all ${RANK_STYLE[row.rank] || 'bg-white'}`}
                        >
                          <td className="px-6 py-5 text-center font-bold text-2xl">
                            {getRankMedal(row.rank)}
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-extrabold text-[#1a1a1a] text-base">{row.employeeName}</div>
                            <div className="md:hidden text-xs font-semibold text-neutral-400 mt-0.5">{row.position}</div>
                          </td>
                          <td className="px-6 py-5 text-neutral-500 font-medium hidden md:table-cell">{row.position}</td>
                          <td className="px-6 py-5 text-center">
                            <span className="px-3.5 py-1.5 bg-[#f1f5f9] text-neutral-700 rounded-xl text-xs font-bold border border-neutral-200">
                              {row.outlet}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className={`font-extrabold text-xl ${getScoreColor(row.normalizedScore)}`}>
                              {row.normalizedScore.toFixed(2)}
                            </div>
                            <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mt-0.5">
                              Raw: {row.rawAverage.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            {(() => {
                              const grade = getPredikat(row.normalizedScore);
                              return (
                                <span className={`inline-flex items-center justify-center w-11 h-11 rounded-full text-lg font-extrabold border-2 ${getPredikatStyle(grade)}`}>
                                  {grade}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
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

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner />
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}
