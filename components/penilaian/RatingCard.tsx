'use client';

import React, { useState } from 'react';
import { RatingCategory, RatingGrade, RATING_SCALE } from '@/lib/types';
import { RATING_CATEGORIES } from '@/lib/utils/constants';

interface RatingCardProps {
  employee: any;
  isExpanded: boolean;
  isLocked: boolean;
  isRamadan: boolean;
  draftRatings: Record<RatingCategory, RatingGrade> | null;
  onToggleExpand: (id: string) => void;
  onSaveDraft: (id: string, ratings: Record<RatingCategory, RatingGrade>) => void;
}

// Color config per grade
const GRADE_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  A: { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'A – Excellent (5)' },
  B: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    label: 'B – Good (4)' },
  C: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   label: 'C – Satisfactory (3)' },
  D: { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500',  label: 'D – Poor (2)' },
  E: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500',     label: 'E – Very Poor (1)' },
};

const GRADE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'A', label: 'A – Excellent (5)' },
  { value: 'B', label: 'B – Good (4)' },
  { value: 'C', label: 'C – Satisfactory (3)' },
  { value: 'D', label: 'D – Poor (2)' },
  { value: 'E', label: 'E – Very Poor (1)' },
];

function getAvgGradeColor(avg: number) {
  if (avg >= 4.5) return 'text-emerald-600';
  if (avg >= 3.5) return 'text-blue-600';
  if (avg >= 2.5) return 'text-amber-600';
  if (avg >= 1.5) return 'text-orange-600';
  if (avg > 0) return 'text-red-600';
  return 'text-neutral-400';
}

interface GradeSelectProps {
  value: RatingGrade;
  onChange: (val: RatingGrade) => void;
  disabled?: boolean;
  includeEmpty?: boolean;
}

function GradeSelect({ value, onChange, disabled, includeEmpty }: GradeSelectProps) {
  const config = value && GRADE_CONFIG[value] ? GRADE_CONFIG[value] : null;

  return (
    <div className="relative w-full sm:min-w-[180px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RatingGrade)}
        disabled={disabled}
        className={`
          w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl text-sm font-bold
          border-2 focus:outline-none cursor-pointer transition-all duration-150
          disabled:opacity-60 disabled:cursor-not-allowed
          ${config
            ? `${config.bg} ${config.text} ${config.border}`
            : 'bg-white text-neutral-400 border-neutral-200 hover:border-neutral-300'
          }
        `}
      >
        <option value="" disabled className="text-neutral-400 bg-white font-normal">Pilih Nilai</option>
        {GRADE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-neutral-900 font-normal">
            {opt.label}
          </option>
        ))}
        {includeEmpty && (
          <option value="-" className="bg-white text-neutral-900 font-normal">– (Tidak dinilai)</option>
        )}
      </select>
      {/* Custom chevron */}
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        {config ? (
          <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        ) : (
          <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  SOFT_SKILL: 'Soft Skill',
  HARD_SKILL: 'Hard Skill',
  ATTITUDE: 'Attitude',
  IBADAH: 'Ibadah',
};

const SECTION_COLORS: Record<string, string> = {
  SOFT_SKILL: 'text-violet-600',
  HARD_SKILL: 'text-blue-600',
  ATTITUDE: 'text-teal-600',
  IBADAH: 'text-amber-600',
};

export function RatingCard({
  employee,
  isExpanded,
  isLocked,
  isRamadan,
  draftRatings,
  onToggleExpand,
  onSaveDraft,
}: RatingCardProps) {
  const [ratings, setRatings] = useState<Record<string, RatingGrade>>(() => {
    if (draftRatings) return draftRatings;
    const initial: any = {};
    RATING_CATEGORIES.forEach((c) => (initial[c.id] = ''));
    return initial;
  });

  const handleRatingChange = (categoryId: string, value: RatingGrade) => {
    if (isLocked) return;
    setRatings((prev) => ({ ...prev, [categoryId]: value }));
  };

  const handleSaveDraftClick = () => {
    onSaveDraft(employee.id, ratings as Record<RatingCategory, RatingGrade>);
  };

  // Calculate live average
  const values = Object.entries(ratings)
    .filter(([id, val]) => {
      const isReq =
        RATING_CATEGORIES.find((c) => c.id === id)?.required ||
        (isRamadan && ['sholat', 'puasa'].includes(id));
      return isReq && val !== '' && (val as string) !== '-';
    })
    .map(([, val]) => RATING_SCALE[val as RatingGrade] || 0);

  const rawAvg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const gradeMap: any = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
  const avgGrade = gradeMap[Math.round(rawAvg)] || '-';
  const avgColor = getAvgGradeColor(rawAvg);

  // Tampilkan Ibadah selalu — opsional jika bukan Ramadan, wajib jika Ramadan
  const sections = ['SOFT_SKILL', 'HARD_SKILL', 'ATTITUDE', 'IBADAH'];

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        isExpanded
          ? 'border-[#1a1a1a]/20 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)]'
          : 'border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300'
      }`}
    >
      {/* Card Header */}
      <div
        className={`px-4 sm:px-5 py-3 sm:py-4 cursor-pointer flex justify-between items-center transition-colors ${
          isExpanded ? 'bg-[#f8fafc]' : 'bg-white hover:bg-neutral-50'
        }`}
        onClick={() => onToggleExpand(employee.id)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <span className="font-extrabold text-neutral-600 text-sm">{employee.name.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-[#1a1a1a] text-sm sm:text-base leading-snug" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>{employee.name}</h3>
            <p className="text-xs text-neutral-500 truncate">
              {employee.outlet} – {employee.position}
              {isLocked && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-semibold">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  Sudah dinilai
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-2">
          {rawAvg > 0 && (
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Rata-rata</div>
              <div className={`font-extrabold text-lg leading-tight ${avgColor}`}>
                {rawAvg.toFixed(1)} <span className="text-sm">| {avgGrade}</span>
              </div>
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
        <div className="bg-white border-t border-neutral-100 p-5">
          {isLocked && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <div>
                <p className="font-bold">Sudah Dinilai Periode Ini</p>
                <p className="text-amber-700 mt-0.5 text-xs">Karyawan ini sudah Anda nilai bulan ini. Hubungi manager untuk revisi.</p>
              </div>
            </div>
          )}

          <div className="space-y-7">
            {sections.map((section) => {
              const cats = RATING_CATEGORIES.filter((c) => c.section === section);
              return (
                <div key={section}>
                  <h4 className={`text-xs font-extrabold uppercase tracking-widest mb-3 ${SECTION_COLORS[section]}`}>
                    {SECTION_LABELS[section]}
                  </h4>
                  <div className="space-y-3">
                    {cats.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                      >
                        <label className="text-sm font-semibold text-neutral-700 flex-1">
                          {cat.label}
                          {section === 'IBADAH' && !isRamadan && (
                            <span className="ml-2 text-neutral-400 font-normal text-xs">(Opsional)</span>
                          )}
                        </label>
                        <GradeSelect
                          value={ratings[cat.id] as RatingGrade}
                          onChange={(v) => handleRatingChange(cat.id, v)}
                          disabled={isLocked}
                          includeEmpty={section === 'IBADAH'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Average Display */}
          {rawAvg > 0 && (
            <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center gap-3">
              <div className="text-xs font-bold text-neutral-500">Preview Rata-rata:</div>
              <div className={`font-extrabold text-base ${avgColor}`}>
                {rawAvg.toFixed(2)} / 5.00 &nbsp;|&nbsp; Predikat: {avgGrade}
              </div>
            </div>
          )}

          {!isLocked && (
            <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveDraftClick}
                className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-sm font-bold transition-all"
              >
                💾 Simpan Draft Lokal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
