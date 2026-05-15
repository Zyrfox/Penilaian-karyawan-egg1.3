'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { RatingGrade, RATING_SCALE } from '@/lib/types';
import {
  getManagerQuestions,
  getManagerDivision,
  MANAGER_DIVISION_MAP,
  ManagerQuestion,
} from '@/lib/utils/manager-questions';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ---- Helpers ----
function getPredikat(avg: number): string {
  const map: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
  return map[Math.round(avg)] || 'E';
}

function getScoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-600';
  if (score >= 3) return 'text-blue-600';
  if (score >= 2) return 'text-amber-600';
  if (score > 0) return 'text-red-500';
  return 'text-neutral-400';
}

function getGradeStyle(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'B': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'C': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'D': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'E': return 'bg-red-50 text-red-700 border-red-200';
    default:  return 'bg-white text-neutral-400 border-neutral-200';
  }
}

const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E'];
const GRADE_LABELS: Record<string, string> = {
  A: 'A – Excellent (5)',
  B: 'B – Good (4)',
  C: 'C – Satisfactory (3)',
  D: 'D – Poor (2)',
  E: 'E – Very Poor (1)',
};

const DIVISION_COLORS: Record<string, string> = {
  SDM:       'bg-violet-100 text-violet-700 border-violet-200',
  Keuangan:  'bg-blue-100 text-blue-700 border-blue-200',
  Inventory: 'bg-teal-100 text-teal-700 border-teal-200',
  Komersial: 'bg-amber-100 text-amber-700 border-amber-200',
  Lainnya:   'bg-neutral-100 text-neutral-600 border-neutral-200',
};

// ---- Toast ----
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-blue-600' };
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white max-w-sm ${colors[type]}`}>
      <span className="text-lg flex-shrink-0">{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <p className="text-sm font-semibold leading-snug">{message}</p>
      <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-lg leading-none flex-shrink-0">×</button>
    </div>
  );
}

// ---- ConfirmModal ----
function ConfirmModal({ count, onConfirm, onCancel, submitting }: { count: number; onConfirm: () => void; onCancel: () => void; submitting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-5 mx-auto">
          <span className="text-2xl">📋</span>
        </div>
        <h2 className="text-xl font-extrabold text-center text-[#1a1a1a] mb-2">Konfirmasi Submit</h2>
        <p className="text-sm text-neutral-500 text-center mb-6">
          Anda akan menyimpan penilaian untuk <span className="font-bold text-neutral-900">{count} manager</span> ke server.
          Pastikan semua nilai sudah benar sebelum melanjutkan.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={submitting}
            className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-all disabled:opacity-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-[#1a1a1a] text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
            ) : '✅ Ya, Simpan Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Interface for manager draft ----
interface ManagerDraft {
  grades: Record<string, RatingGrade>;    // questionId -> grade
  alasan: string;                         // catatan gabungan
}

// ---- Manager Card ----
function ManagerCard({
  manager,
  isExpanded,
  isLocked,
  draft,
  onToggleExpand,
  onSaveDraft,
}: {
  manager: any;
  isExpanded: boolean;
  isLocked: boolean;
  draft: ManagerDraft | null;
  onToggleExpand: (id: string) => void;
  onSaveDraft: (id: string, draft: ManagerDraft) => void;
}) {
  const division = getManagerDivision(manager.id);
  const questions = getManagerQuestions(manager.id);

  const [grades, setGrades] = useState<Record<string, RatingGrade>>(() => {
    if (draft?.grades) return draft.grades;
    const init: any = {};
    questions.forEach((q) => (init[q.id] = ''));
    return init;
  });

  const [alasan, setAlasan] = useState<string>(draft?.alasan || '');

  const handleGrade = (qId: string, val: RatingGrade) => {
    if (isLocked) return;
    setGrades((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSaveDraft = () => onSaveDraft(manager.id, { grades, alasan });

  // Live average
  const filledValues = questions
    .map((q) => RATING_SCALE[grades[q.id] as RatingGrade] || 0)
    .filter((v) => v > 0);
  const rawAvg = filledValues.length > 0 ? filledValues.reduce((a, b) => a + b, 0) / filledValues.length : 0;
  const avgColor = getScoreColor(rawAvg);

  const generalQs = questions.slice(0, 4);
  const specificQs = questions.slice(4);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${isExpanded ? 'border-[#1a1a1a]/20 shadow-lg' : 'border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300'}`}>
      {/* Header */}
      <div
        className={`px-4 sm:px-5 py-3 sm:py-4 cursor-pointer flex justify-between items-center transition-colors ${isExpanded ? 'bg-[#f8fafc]' : 'bg-white hover:bg-neutral-50'}`}
        onClick={() => onToggleExpand(manager.id)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
            <span className="font-extrabold text-white text-sm">{manager.name?.charAt(0) || 'M'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] sm:text-xs font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                {manager.id}
              </span>
              <h3 className="font-extrabold text-[#1a1a1a] text-sm sm:text-base leading-snug" style={{wordBreak:'break-word'}}>{manager.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${DIVISION_COLORS[division]}`}>{division}</span>
            </div>
            <p className="text-xs text-neutral-500 truncate mt-0.5">{manager.position} · {manager.outlet}</p>
            {isLocked && (
              <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">🔒 Sudah dinilai periode ini</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
          {rawAvg > 0 && (
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Rata-rata</div>
              <div className={`font-extrabold text-lg ${avgColor}`}>{rawAvg.toFixed(1)}</div>
            </div>
          )}
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'bg-neutral-900 text-white rotate-180' : 'bg-neutral-100 text-neutral-500'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Body */}
      {isExpanded && (
        <div className="bg-white border-t border-neutral-100 p-4 sm:p-5">
          {isLocked && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
              <span>🔒</span>
              <div>
                <p className="font-bold">Sudah Dinilai Periode Ini</p>
                <p className="text-amber-700 mt-0.5 text-xs">Manager ini sudah Anda nilai. Hubungi admin untuk revisi.</p>
              </div>
            </div>
          )}

          {/* General Questions */}
          <div className="mb-6">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600 mb-3">Pertanyaan General</h4>
            <div className="space-y-4">
              {generalQs.map((q, idx) => (
                <QuestionRow key={q.id} q={q} idx={idx + 1} grade={grades[q.id] as RatingGrade} onGrade={handleGrade} disabled={isLocked} />
              ))}
            </div>
          </div>

          {/* Specific Questions — optional */}
          {division !== 'Lainnya' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${division === 'SDM' ? 'text-violet-600' : division === 'Keuangan' ? 'text-blue-600' : division === 'Inventory' ? 'text-teal-600' : 'text-amber-600'}`}>
                  Pertanyaan Spesifik – {division}
                </h4>
                <span className="text-[10px] text-neutral-400 font-medium">(Opsional)</span>
              </div>
              <div className="space-y-4">
                {specificQs.map((q, idx) => (
                  <QuestionRow key={q.id} q={q} idx={idx + 5} grade={grades[q.id] as RatingGrade} onGrade={handleGrade} disabled={isLocked} />
                ))}
              </div>
            </div>
          )}

          {/* Single combined alasan */}
          <div className="mb-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 block mb-2">Alasan / Catatan <span className="font-normal normal-case">(Opsional)</span></label>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              disabled={isLocked}
              placeholder="Tuliskan catatan atau alasan umum penilaian untuk manager ini..."
              rows={3}
              className="w-full px-3 py-2 text-xs text-neutral-700 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 resize-none placeholder:text-neutral-400 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Live avg */}
          {rawAvg > 0 && (
            <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center gap-3">
              <div className="text-xs font-bold text-neutral-500">Preview Rata-rata:</div>
              <div className={`font-extrabold text-base ${avgColor}`}>
                {rawAvg.toFixed(2)} / 5.00 &nbsp;|&nbsp; Predikat: {getPredikat(rawAvg)}
              </div>
            </div>
          )}

          {!isLocked && (
            <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end">
              <button onClick={handleSaveDraft}
                className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-sm font-bold transition-all">
                💾 Simpan Draft Lokal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Question Row ----
function QuestionRow({ q, idx, grade, onGrade, disabled }: {
  q: ManagerQuestion;
  idx: number;
  grade: RatingGrade;
  onGrade: (id: string, v: RatingGrade) => void;
  disabled?: boolean;
}) {
  const gradeStyle = grade && (grade as string) !== '' ? getGradeStyle(grade) : 'bg-white text-neutral-400 border-neutral-200';
  return (
    <div className="bg-neutral-50 rounded-xl p-3 sm:p-4 border border-neutral-100">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[11px] font-extrabold text-neutral-600 flex-shrink-0 mt-0.5">{idx}</span>
          <label className="text-sm font-semibold text-neutral-700 leading-snug">{q.label}</label>
        </div>
        <div className="relative w-full sm:w-48 flex-shrink-0">
          <select
            value={grade || ''}
            onChange={(e) => onGrade(q.id, e.target.value as RatingGrade)}
            disabled={disabled}
            className={`w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-bold border-2 focus:outline-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed ${gradeStyle}`}
          >
            <option value="" disabled className="text-neutral-400 bg-white font-normal">Pilih Nilai</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g} className="bg-white text-neutral-900 font-normal">{GRADE_LABELS[g]}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function PenilaianManagerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [alreadyRatedIds, setAlreadyRatedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, ManagerDraft>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => setToast({ message, type }), []);

  useEffect(() => { checkAuthAndLoadData(); }, []);

  const checkAuthAndLoadData = async () => {
    let activeUser: any = null;
    try {
      const resMe = await fetch('/api/auth/me');
      if (!resMe.ok) { router.push('/login'); return; }
      const dataMe = await resMe.json();
      if (!dataMe.success || !dataMe.user) { router.push('/login'); return; }
      activeUser = dataMe.user;
      if (activeUser.role !== 'direksi') {
        alert('Akses Ditolak: Halaman ini hanya untuk Direksi.');
        router.push('/penilaian'); return;
      }
      setCurrentUser(activeUser);
    } catch { router.push('/login'); return; }

    try {
      const ts = Date.now();
      const [resMaster, resMgrRatings] = await Promise.all([
        fetch(`/api/sheets/master-list?t=${ts}`),
        fetch(`/api/sheets/penilaian-manager?t=${ts}`),
      ]);
      const dataMaster = await resMaster.json();
      const dataMgrRatings = await resMgrRatings.json();

      if (dataMaster.success) {
        // Filter hanya manager (ID yang ada di MANAGER_DIVISION_MAP)
        const managerIds = Object.keys(MANAGER_DIVISION_MAP);
        const managerList = dataMaster.data.filter((e: any) => managerIds.includes(e.id));
        setManagers(managerList);

        // Load drafts
        const localDrafts: Record<string, ManagerDraft> = {};
        managerList.forEach((m: any) => {
          const stored = localStorage.getItem(`mgr_draft_${activeUser.id}_${m.id}`);
          if (stored) {
            try { localDrafts[m.id] = JSON.parse(stored); } catch {}
          }
        });
        setDrafts(localDrafts);

        if (dataMaster.warnings && dataMaster.warnings.length > 0) {
          setWarnings(dataMaster.warnings);
        }
      }

      if (dataMgrRatings.success) {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const ratedSet = new Set<string>();
        dataMgrRatings.data.forEach((row: any) => {
          if (row.namaPenilai === activeUser.id) {
            const d = new Date(row.tanggal);
            if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
              ratedSet.add(row.managerDinilai);
            }
          }
        });
        setAlreadyRatedIds(ratedSet);
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data. Coba refresh halaman.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = (managerId: string, draftData: ManagerDraft) => {
    if (!currentUser) return;
    localStorage.setItem(`mgr_draft_${currentUser.id}_${managerId}`, JSON.stringify(draftData));
    setDrafts((prev) => ({ ...prev, [managerId]: draftData }));
    showToast('Draft berhasil disimpan secara lokal! 💾', 'info');
  };

  const draftCount = Object.entries(drafts).filter(([, d]) =>
    d && Object.values(d.grades).some((v) => v && (v as string) !== '')
  ).length;

  const handleSubmitAll = () => {
    if (draftCount === 0) { showToast('Belum ada data penilaian yang diisi.', 'error'); return; }
    setShowConfirm(true);
  };

  const executeSubmit = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    try {
      const rows: any[][] = [];
      const now = new Date();
      const timestamp = now.toLocaleString('sv-SE');

      for (const mgr of managers) {
        const draft = drafts[mgr.id];
        if (!draft) continue;
        const questions = getManagerQuestions(mgr.id);
        const division = getManagerDivision(mgr.id);
        const generalQs = questions.slice(0, 4);
        const specificQs = questions.slice(4);

        // Only require 4 general questions
        const generalFilled = generalQs.every((q) => draft.grades[q.id] && (draft.grades[q.id] as string) !== '');
        if (!generalFilled) {
          showToast(`${mgr.name}: isi 4 pertanyaan general terlebih dahulu.`, 'error');
          setSubmitting(false); setShowConfirm(false); return;
        }
        if (alreadyRatedIds.has(mgr.id)) continue;

        // Average: general (wajib) + specific yang diisi
        const filledVals = questions
          .map((q) => RATING_SCALE[draft.grades[q.id] as RatingGrade] || 0)
          .filter((v) => v > 0);
        const avg = filledVals.length > 0 ? filledVals.reduce((a, b) => a + b, 0) / filledVals.length : 0;
        const predikat = getPredikat(avg);

        // Helper: get specific grade by division column
        const sp = (idx: number) => division !== 'Lainnya' ? (draft.grades[specificQs[idx]?.id] || '') : '';
        const sdm  = division === 'SDM'       ? [sp(0), sp(1), sp(2)] : ['', '', ''];
        const keu  = division === 'Keuangan'  ? [sp(0), sp(1), sp(2)] : ['', '', ''];
        const inv  = division === 'Inventory' ? [sp(0), sp(1), sp(2)] : ['', '', ''];
        const kom  = division === 'Komersial' ? [sp(0), sp(1), sp(2)] : ['', '', ''];

        const row = [
          timestamp,                               // A: Tanggal
          `${currentUser.id}_${currentUser.name}`, // B: Nama Penilai
          `${mgr.id}_${mgr.name}`,                 // C: Manager Dinilai
          division,                                // D: Divisi
          draft.grades[generalQs[0].id] || '',     // E: G1
          draft.grades[generalQs[1].id] || '',     // F: G2
          draft.grades[generalQs[2].id] || '',     // G: G3
          draft.grades[generalQs[3].id] || '',     // H: G4
          ...sdm,                                  // I-K: S1-S3 SDM
          ...keu,                                  // L-N: S1-S3 Keuangan
          ...inv,                                  // O-Q: S1-S3 Inventory
          ...kom,                                  // R-T: S1-S3 Komersial
          draft.alasan || '',                      // U: Alasan/Catatan
          avg.toFixed(2),                          // V: Total Point
          predikat,                                // W: Predikat
        ];
        rows.push(row);
      }

      if (rows.length === 0) {
        showToast('Tidak ada penilaian baru yang siap dikirim.', 'info');
        setSubmitting(false); setShowConfirm(false); return;
      }

      const res = await fetch('/api/sheets/append-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        managers.forEach((m) => localStorage.removeItem(`mgr_draft_${currentUser.id}_${m.id}`));
        setDrafts({});
        setExpandedId(null);
        setShowConfirm(false);
        showToast(`Berhasil menyimpan penilaian ${rows.length} manager ke server! 🎉`, 'success');
        setTimeout(() => checkAuthAndLoadData(), 1000);
      } else {
        showToast(data.error || 'Gagal menyimpan penilaian.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan. Draft masih tersimpan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8ecf1] flex flex-col md:flex-row p-3 sm:p-4 md:p-6 gap-3 md:gap-6 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showConfirm && (
        <ConfirmModal count={draftCount} onConfirm={executeSubmit} onCancel={() => setShowConfirm(false)} submitting={submitting} />
      )}

      <Sidebar currentUser={currentUser} />

      <main className="flex-1 min-w-0 bg-white/70 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

        <div className="p-4 sm:p-6 md:p-10 flex flex-col min-h-full relative z-10">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold mb-3">
              <span>👔</span> Khusus Direksi
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1a1a1a] tracking-tight mb-1">Penilaian Kinerja Manager</h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">Beri penilaian kinerja bulanan untuk setiap manager dengan 7 pertanyaan per orang.</p>

            {draftCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-sm font-bold text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {draftCount} draft manager tersimpan
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm relative z-10">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold text-red-900 mb-1">Peringatan Data (Perbaiki di Google Sheets)</p>
                <ul className="list-disc pl-5 space-y-1 text-red-700">
                  {warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Manager Cards */}
          <div className="flex-1 space-y-3">
            {managers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-neutral-300 rounded-2xl">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-2xl">👔</div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">Tidak ada data manager</h3>
                <p className="text-neutral-500 text-sm">Data manager tidak ditemukan di Master List.</p>
              </div>
            ) : (
              managers.map((mgr) => (
                <ManagerCard
                  key={mgr.id}
                  manager={mgr}
                  isExpanded={expandedId === mgr.id}
                  isLocked={alreadyRatedIds.has(mgr.id)}
                  draft={drafts[mgr.id] || null}
                  onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                  onSaveDraft={handleSaveDraft}
                />
              ))
            )}
          </div>

          {/* Submit Bar */}
          {managers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-neutral-200/50 flex justify-between items-center gap-4">
              <button
                onClick={() => {
                  if (!currentUser) return;
                  managers.forEach((m) => localStorage.removeItem(`mgr_draft_${currentUser.id}_${m.id}`));
                  setDrafts({});
                  setExpandedId(null);
                  showToast('Semua draft berhasil direset.', 'info');
                }}
                className="px-5 py-2.5 text-sm font-bold text-red-600 bg-white hover:bg-red-50 border border-red-100 rounded-xl transition-all shadow-sm"
              >
                Reset Semua Draft
              </button>
              <button
                onClick={handleSubmitAll}
                disabled={draftCount === 0}
                className="px-6 py-3 text-sm font-bold text-white bg-[#1a1a1a] hover:bg-black rounded-xl shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
              >
                {draftCount > 0 ? `Simpan ${draftCount} Penilaian Manager ke Server` : 'Simpan & Submit ke Server'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
