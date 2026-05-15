'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { RatingCard } from '@/components/penilaian/RatingCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { canUserRate } from '@/lib/utils/validators';
import { isRamadan, calculateScoreWithBonus } from '@/lib/utils/calculations';
import { RATING_CATEGORIES } from '@/lib/utils/constants';
import { resolveRole, parseEmployeeId } from '@/lib/utils/roles';
import { RatingCategory, RatingGrade, RATING_SCALE } from '@/lib/types';


function getPredikat(avg: number): string {
  const rounded = Math.round(avg);
  const map: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
  return map[rounded] || 'E';
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white max-w-sm ${colors[type]} animate-fade-in`}>
      <span className="text-lg flex-shrink-0">{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <p className="text-sm font-semibold leading-snug">{message}</p>
      <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-lg leading-none flex-shrink-0">×</button>
    </div>
  );
}

function ConfirmModal({
  count,
  onConfirm,
  onCancel,
  submitting,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-5 mx-auto">
          <span className="text-2xl">📋</span>
        </div>
        <h2 className="text-xl font-extrabold text-center text-[#1a1a1a] mb-2">Konfirmasi Submit</h2>
        <p className="text-sm text-neutral-500 text-center mb-6">
          Anda akan menyimpan penilaian untuk <span className="font-bold text-neutral-900">{count} karyawan</span> ke server. 
          Pastikan semua nilai sudah benar sebelum melanjutkan.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-[#1a1a1a] text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              '✅ Ya, Simpan Sekarang'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PenilaianPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, any>>({});
  const [alreadyRatedIds, setAlreadyRatedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const ramadan = isRamadan();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    // 1. Ambil user dari JWT cookie via /api/auth/me
    let activeUser: any = null;
    try {
      const resMe = await fetch('/api/auth/me');
      if (!resMe.ok) {
        router.push('/login');
        return;
      }
      const dataMe = await resMe.json();
      if (!dataMe.success || !dataMe.user) {
        router.push('/login');
        return;
      }
      activeUser = dataMe.user;
      setCurrentUser(activeUser);
    } catch {
      router.push('/login');
      return;
    }

    try {
      const ts = Date.now();
      const [resMaster, resPenilaian] = await Promise.all([
        fetch(`/api/sheets/master-list?t=${ts}`),
        fetch(`/api/sheets/penilaian?t=${ts}`),
      ]);
      const dataMaster = await resMaster.json();
      const dataPenilaian = await resPenilaian.json();

      if (dataMaster.success) {
        let rateable = dataMaster.data.filter((emp: any) =>
          canUserRate(activeUser.role, activeUser.outlet, activeUser.id, emp.id, emp.outlet, emp.position).canRate
        );
        rateable = rateable.filter((v: any, i: number, self: any[]) =>
          i === self.findIndex((t) => t.id === v.id)
        );
        setEmployees(rateable);

        // Build employee map for later lookup
        const empMap: Record<string, any> = {};
        dataMaster.data.forEach((emp: any) => { empMap[emp.id] = emp; });
        setEmployeeMap(empMap);

        // Load drafts from localStorage
        const localDrafts: Record<string, any> = {};
        rateable.forEach((emp: any) => {
          const stored = localStorage.getItem(`rating_draft_${activeUser.id}_${emp.id}`);
          if (stored) {
            try { localDrafts[emp.id] = JSON.parse(stored); } catch { /* ignore */ }
          }
        });
        setDrafts(localDrafts);

        if (dataMaster.warnings && dataMaster.warnings.length > 0) {
          setWarnings(dataMaster.warnings);
        }
      }

      if (dataPenilaian.success) {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const ratedSet = new Set<string>();
        dataPenilaian.data.forEach((row: any) => {
          if (row.namaPenilai === activeUser.id) {
            const d = new Date(row.tanggal);
            if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
              if (row.karyawanDinilai && row.karyawanDinilai.trim() !== '') {
                ratedSet.add(row.karyawanDinilai);
              }
              if (row.karyawanDinilaiRaw && row.karyawanDinilaiRaw.trim() !== '') {
                ratedSet.add(row.karyawanDinilaiRaw);
              }
            }
          }
        });
        setAlreadyRatedIds(ratedSet);
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data karyawan. Coba refresh halaman.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = (employeeId: string, ratings: Record<RatingCategory, RatingGrade>) => {
    if (!currentUser) return;
    localStorage.setItem(`rating_draft_${currentUser.id}_${employeeId}`, JSON.stringify(ratings));
    setDrafts((prev) => ({ ...prev, [employeeId]: ratings }));
    showToast('Draft berhasil disimpan secara lokal! 💾', 'info');
  };

  const handleResetAll = () => {
    if (!currentUser) return;
    employees.forEach((emp) => {
      localStorage.removeItem(`rating_draft_${currentUser.id}_${emp.id}`);
    });
    setDrafts({});
    setExpandedId(null);
    showToast('Semua draft berhasil direset.', 'info');
  };

  const handleSubmitAll = () => {
    // Check if there are any drafts with filled data
    const hasDraftData = Object.values(drafts).some((d) => {
      if (!d) return false;
      return Object.values(d).some((v) => v && v !== '');
    });

    if (!hasDraftData) {
      showToast('Belum ada data penilaian yang diisi. Isi dan simpan draft terlebih dahulu.', 'error');
      return;
    }
    setShowConfirm(true);
  };

  const executeSubmit = async () => {
    if (!currentUser) return;
    setSubmitting(true);

    try {
      // Build rows from drafts
      const rows: any[][] = [];
      const now = new Date();
      const timestamp = now.toLocaleString('sv-SE'); // YYYY-MM-DD HH:mm:ss

      for (const emp of employees) {
        const ratings = drafts[emp.id];
        if (!ratings) continue;

        // Check if all required categories are filled
        const requiredCats = RATING_CATEGORIES.filter((c) => c.required);
        const missingRequired = requiredCats.filter((c) => !ratings[c.id] || ratings[c.id] === '');
        if (missingRequired.length > 0) {
          showToast(
            `${emp.name} belum lengkap. Kategori yang kosong: ${missingRequired.map((c) => c.label).join(', ')}`,
            'error'
          );
          setSubmitting(false);
          setShowConfirm(false);
          return;
        }

        // Check duplicate (already rated this month)
        const exactMatchRaw = `${emp.id}_${emp.name}`;
        if ((emp.id && alreadyRatedIds.has(emp.id)) || alreadyRatedIds.has(exactMatchRaw)) {
          continue; // skip already-rated employees
        }

        const empInfo = employeeMap[emp.id] || emp;
        const avg = calculateScoreWithBonus(ratings, ramadan);
        const predikat = getPredikat(avg);

        // Build the row as per sheet schema (columns A-W)
        const row = [
          timestamp,                                      // A: Tanggal
          `${currentUser.id}_${currentUser.name}`,        // B: Nama Penilai
          `${emp.id}_${empInfo.name}`,                    // C: Karyawan yang dinilai
          empInfo.position || '',             // D: Posisi
          empInfo.outlet || '',               // E: Outlet
          'Aktif',                            // F: Status
          ratings['komunikasi'] || '',        // G
          ratings['kerja_sama'] || '',        // H
          ratings['tanggung_jawab'] || '',    // I
          ratings['inisiatif'] || '',         // J
          ratings['penguasaan_sop'] || '',    // K
          ratings['ketelitian'] || '',        // L
          ratings['kemampuan_tool'] || '',    // M
          ratings['konsistensi'] || '',       // N
          ratings['kedisiplinan'] || '',      // O
          ratings['kepatuhan'] || '',         // P
          ratings['etika'] || '',             // Q
          ratings['lingkungan'] || '',        // R
          ratings['ramah_pelanggan'] || '',   // S
          ratings['sholat'] || '',            // T
          ratings['puasa'] || '',             // U
          avg.toFixed(2),                     // V: Total Point
          predikat,                           // W: Predikat
        ];
        rows.push(row);
      }

      if (rows.length === 0) {
        showToast('Tidak ada penilaian baru yang siap dikirim. Pastikan draft sudah diisi.', 'info');
        setSubmitting(false);
        setShowConfirm(false);
        return;
      }

      const res = await fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Clear drafts after success
        employees.forEach((emp) => {
          localStorage.removeItem(`rating_draft_${currentUser.id}_${emp.id}`);
        });
        setDrafts({});
        setExpandedId(null);
        setShowConfirm(false);
        showToast(`Berhasil menyimpan penilaian ${rows.length} karyawan ke server! 🎉`, 'success');
        // Refresh to update locked state
        setTimeout(() => checkAuthAndLoadData(), 1000);
      } else {
        showToast(data.error || 'Gagal menyimpan penilaian. Coba lagi.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan. Draft masih tersimpan, coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const draftCount = Object.values(drafts).filter((d) => d && Object.values(d).some((v) => v && v !== '')).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#e8ecf1] flex flex-col md:flex-row p-2 sm:p-4 md:p-6 gap-2 sm:gap-4 md:gap-6 font-sans overflow-hidden">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {showConfirm && (
        <ConfirmModal
          count={draftCount}
          onConfirm={executeSubmit}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}

      <Sidebar currentUser={currentUser} />

      <main className="flex-1 overflow-y-auto bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

        <div className="p-4 sm:p-8 md:p-12 h-full flex flex-col">
          <div className="mb-4 sm:mb-8 flex justify-between items-end relative z-10">
            <div>
              <h2 className="text-xl sm:text-3xl font-extrabold text-[#1a1a1a] tracking-tight mb-1 sm:mb-2">Penilaian Karyawan</h2>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium">Beri penilaian kinerja bulanan secara objektif dan akurat.</p>
            </div>
            {draftCount > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-sm font-bold text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {draftCount} draft tersimpan
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <div className="mb-4 sm:mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm relative z-10">
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

          {/* Ringkasan breakdown — hanya untuk role yang dikategorikan (direksi & manager) */}
          {employees.length > 0 && (currentUser?.role === 'direksi' || currentUser?.role === 'manager') && (() => {
            const counts = { sub: 0, spv: 0, staff: 0, freelance: 0 };
            employees.forEach((emp) => {
              const r = resolveRole({ id: emp.id, position: emp.position });
              const prefix = parseEmployeeId(emp.id || '').rolePrefix;
              if (r === 'sub_manager') counts.sub++;
              else if (r === 'supervisor') counts.spv++;
              else if (prefix === 'FRL') counts.freelance++;
              else if (r === null) counts.staff++;
            });
            const total = counts.sub + counts.spv + counts.staff + counts.freelance;
            return (
              <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2 text-xs relative z-10">
                <span className="font-bold text-neutral-500">Total: <span className="text-neutral-900">{total} orang</span></span>
                <span className="text-neutral-300">•</span>
                <span className="px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-bold">Sub-Manager: {counts.sub}</span>
                <span className="px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 font-bold">SPV: {counts.spv}</span>
                <span className="px-2 py-0.5 rounded-full border bg-neutral-100 text-neutral-700 border-neutral-200 font-bold">Staff: {counts.staff}</span>
                <span className="px-2 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200 font-bold">Freelance: {counts.freelance}</span>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 relative z-10">
            {employees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-neutral-300 rounded-2xl">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-2xl">🎉</div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">Semua Selesai!</h3>
                <p className="text-neutral-500 text-sm">Tidak ada karyawan yang perlu Anda nilai saat ini.</p>
              </div>
            ) : (() => {
              const role = currentUser?.role;
              // Auto-rate (Isi Cepat A/B/C/D/E) hanya untuk pilar manager.
              // Direksi, sub_manager, dan SPV harus pilih nilai per-kriteria.
              const hideQuickFill = role === 'direksi' || role === 'sub_manager' || role === 'supervisor';
              const renderCard = (emp: any) => (
                <RatingCard
                  key={emp.id}
                  employee={emp}
                  isExpanded={expandedId === emp.id}
                  isLocked={(emp.id && alreadyRatedIds.has(emp.id)) || alreadyRatedIds.has(`${emp.id}_${emp.name}`)}
                  isRamadan={ramadan}
                  draftRatings={drafts[emp.id] || null}
                  onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                  onSaveDraft={handleSaveDraft}
                  hideQuickFill={hideQuickFill}
                />
              );

              // Direksi & pilar Manager melihat banyak tipe karyawan sekaligus —
              // dikelompokkan supaya gampang dipilah saat menilai.
              const shouldCategorize = role === 'direksi' || role === 'manager';
              if (!shouldCategorize) {
                return <>{employees.map(renderCard)}</>;
              }

              const buckets: Record<string, any[]> = {
                'Sub-Manager': [],
                'Supervisor (SPV)': [],
                Staff: [],
                Freelance: [],
              };
              employees.forEach((emp) => {
                const r = resolveRole({ id: emp.id, position: emp.position });
                const prefix = parseEmployeeId(emp.id || '').rolePrefix;
                if (r === 'sub_manager') buckets['Sub-Manager'].push(emp);
                else if (r === 'supervisor') buckets['Supervisor (SPV)'].push(emp);
                else if (prefix === 'FRL') buckets.Freelance.push(emp);
                else if (r === null) buckets.Staff.push(emp);
                // pilar manager / direksi shouldn't end up here (canUserRate blocks);
                // skip them defensively kalau lolos.
              });

              const SECTION_STYLE: Record<string, string> = {
                'Sub-Manager': 'bg-amber-50 text-amber-700 border-amber-200',
                'Supervisor (SPV)': 'bg-blue-50 text-blue-700 border-blue-200',
                Staff: 'bg-neutral-100 text-neutral-700 border-neutral-200',
                Freelance: 'bg-teal-50 text-teal-700 border-teal-200',
              };

              return (
                <>
                  {Object.entries(buckets).map(([label, list]) =>
                    list.length === 0 ? null : (
                      <section key={label} className="space-y-2">
                        <div className="flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur-sm py-1.5 z-10">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${SECTION_STYLE[label]}`}>
                            {label}
                          </span>
                          <span className="text-xs font-bold text-neutral-400">{list.length} orang</span>
                          <div className="flex-1 h-px bg-neutral-200/70" />
                        </div>
                        <div className="space-y-2">{list.map(renderCard)}</div>
                      </section>
                    )
                  )}
                </>
              );
            })()}
          </div>

          {employees.length > 0 && (
            <div className="mt-3 sm:mt-6 pt-3 sm:pt-6 border-t border-neutral-200/50 flex justify-between items-center relative z-10 gap-2 sm:gap-4">
              <button
                onClick={handleResetAll}
                className="px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-red-600 bg-white hover:bg-red-50 border border-red-100 rounded-xl transition-all shadow-sm whitespace-nowrap"
              >
                Reset Draft
              </button>
              <button
                onClick={handleSubmitAll}
                disabled={draftCount === 0}
                className="flex-1 sm:flex-none px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-white bg-[#1a1a1a] hover:bg-black rounded-xl shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {draftCount > 0 ? `Simpan ${draftCount} Penilaian` : 'Simpan & Submit'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
