# TECHNICAL SPECIFICATION & CODE STANDARDS
**Employee Rating System - Next.js Implementation Guide**

---

## 1. PROJECT STRUCTURE

```
employee-rating-system/
├── app/
│   ├── layout.tsx (root layout)
│   ├── page.tsx (landing/dashboard)
│   ├── login/
│   │   └── page.tsx
│   ├── penilaian/
│   │   └── page.tsx
│   ├── rekapan/
│   │   └── page.tsx
│   ├── leaderboard/
│   │   └── page.tsx
│   └── api/
│       ├── sheets/
│       │   ├── master-list/route.ts
│       │   ├── penilaian/route.ts
│       │   └── append/route.ts
│       ├── auth/
│       │   ├── login/route.ts
│       │   └── logout/route.ts
│       └── health/route.ts
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx (if needed)
│   │   └── Footer.tsx
│   ├── penilaian/
│   │   ├── FilterSection.tsx
│   │   ├── RatingCard.tsx
│   │   ├── RatingCardExpanded.tsx
│   │   ├── RatingForm.tsx
│   │   ├── ActionSection.tsx
│   │   └── RatingCategoryDropdown.tsx
│   ├── rekapan/
│   │   ├── FilterSection.tsx
│   │   ├── RecapTable.tsx
│   │   ├── SummaryStats.tsx
│   │   └── ExportButton.tsx
│   ├── leaderboard/
│   │   ├── PeriodSelector.tsx
│   │   ├── LeaderboardTable.tsx
│   │   ├── OutletStats.tsx
│   │   └── MedalIcon.tsx
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ConfirmDialog.tsx
│   └── auth/
│       └── LoginForm.tsx
├── lib/
│   ├── api/
│   │   ├── sheets.ts (Google Sheets API client)
│   │   └── auth.ts (authentication helpers)
│   ├── utils/
│   │   ├── calculations.ts (rating calculations)
│   │   ├── transformers.ts (data transformations)
│   │   ├── validators.ts (form validation)
│   │   ├── constants.ts (constants & enums)
│   │   └── helpers.ts (utility functions)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSheetsData.ts
│   │   └── useLocalStorage.ts
│   └── types/
│       └── index.ts (TypeScript types)
├── styles/
│   └── globals.css
├── .env.local (environment variables)
├── .env.example (template)
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── README.md
```

---

## 2. TYPESCRIPT TYPES & INTERFACES

### 2.1 Authentication Types
```typescript
// lib/types/index.ts

export type UserRole = 'manager' | 'supervisor' | 'public';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  outlet?: string; // untuk supervisor
  loginTime: string;
}

export interface AuthToken {
  userId: string;
  role: UserRole;
  name: string;
  loginTime: string;
  expiryTime: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}
```

### 2.2 Employee & Organization Types
```typescript
export type OutletCode = 'BTMK' | 'BTMF' | 'TSF' | 'MBA' | 'EGC' | 'HCP' | 'FRC' | 'ENC';

export type EmployeeStatus = 'Aktif' | 'Tidak Aktif';

export interface Employee {
  id: string; // grammar: [DRK|MGR|SPV|FRL-]?[OUTLET-]NNN — lihat lib/utils/roles.ts parseEmployeeId
  name: string;
  position: string;
  outlet: OutletCode;
  status: EmployeeStatus;
}

export interface EmployeeForRating extends Employee {
  canRate: boolean; // apakah employee ini bisa dinilai oleh current penilai
  ratingStatus?: 'completed' | 'pending' | 'draft';
}
```

### 2.3 Rating Types
```typescript
export type RatingGrade = 'A' | 'B' | 'C' | 'D' | 'E' | '';

export interface RatingValue {
  grade: RatingGrade;
  point: number; // 5, 4, 3, 2, 1, 0
}

export const RATING_SCALE: Record<RatingGrade, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
  '': 0
};

export type RatingCategory = 
  | 'komunikasi'
  | 'kerja_sama'
  | 'tanggung_jawab'
  | 'inisiatif'
  | 'penguasaan_sop'
  | 'ketelitian'
  | 'kemampuan_tool'
  | 'konsistensi'
  | 'kedisiplinan'
  | 'kepatuhan'
  | 'etika'
  | 'lingkungan'
  | 'ramah_pelanggan'
  | 'sholat'
  | 'puasa';

export interface RatingCategoryMeta {
  id: RatingCategory;
  label: string;
  section: 'SOFT_SKILL' | 'HARD_SKILL' | 'ATTITUDE' | 'IBADAH';
  required: boolean;
  displayOrder: number;
}

export interface RatingDraft {
  penilaiByteName: string; // employee ID of rater
  employeeId: string; // employee ID being rated
  ratings: Record<RatingCategory, RatingGrade>;
  savedAt: string; // ISO timestamp
}

export interface RatingSubmission {
  tanggal: string;
  namaPenilai: string;
  karyawanDinilai: string;
  posisi: string;
  outlet: OutletCode;
  status: EmployeeStatus;
  ratings: Record<RatingCategory, RatingGrade>;
  totalPoint: number;
  predikat: RatingGrade;
}

export interface RatingRecord {
  tanggal: string;
  namaPenilai: string;
  karyawanDinilai: string;
  posisi: string;
  outlet: OutletCode;
  status: EmployeeStatus;
  komunikasi: RatingGrade;
  kerja_sama: RatingGrade;
  tanggung_jawab: RatingGrade;
  inisiatif: RatingGrade;
  penguasaan_sop: RatingGrade;
  ketelitian: RatingGrade;
  kemampuan_tool: RatingGrade;
  konsistensi: RatingGrade;
  kedisiplinan: RatingGrade;
  kepatuhan: RatingGrade;
  etika: RatingGrade;
  lingkungan: RatingGrade;
  ramah_pelanggan: RatingGrade;
  sholat: RatingGrade;
  puasa: RatingGrade;
  totalPoint: number;
  predikat: RatingGrade;
}
```

### 2.4 Rekapan & Leaderboard Types
```typescript
export interface RaterDetail {
  raterId: string;
  raterName: string;
  averageScore: number;
  submittedDate: string;
}

export interface RecapRow {
  no: number;
  employeeId: string;
  employeeName: string;
  outlet: OutletCode;
  position: string;
  raters: RaterDetail[];
  averageScore: number;
  totalPoints: number;
  isExpanded: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  employeeId: string;
  employeeName: string;
  outlet: OutletCode;
  position: string;
  ratingCount: number;
  rawAverage: number;
  normalizedScore: number;
  totalPoints: number;
}

export interface OutletStats {
  outlet: OutletCode;
  averageScore: number;
  totalEmployees: number;
  totalRatings: number;
}
```

### 2.5 API Response Types
```typescript
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string; // error code for specific handling
}

export interface SheetRow {
  [key: string]: any;
}

export interface SheetsError {
  code: string;
  message: string;
  status: number;
}
```

---

## 3. CONSTANTS & CONFIGURATION

### 3.1 Rating Constants
```typescript
// lib/utils/constants.ts

export const RATING_CATEGORIES: RatingCategoryMeta[] = [
  // SOFT SKILL
  { id: 'komunikasi', label: 'Komunikasi dengan rekan & atasan', section: 'SOFT_SKILL', required: true, displayOrder: 1 },
  { id: 'kerja_sama', label: 'Kerja sama tim', section: 'SOFT_SKILL', required: true, displayOrder: 2 },
  { id: 'tanggung_jawab', label: 'Tangung jawab & manajemen waktu', section: 'SOFT_SKILL', required: true, displayOrder: 3 },
  { id: 'inisiatif', label: 'Inisiatif & penyelesaian masalah', section: 'SOFT_SKILL', required: true, displayOrder: 4 },
  
  // HARD SKILL
  { id: 'penguasaan_sop', label: 'Penguasaan tugas dan SOP', section: 'HARD_SKILL', required: true, displayOrder: 5 },
  { id: 'ketelitian', label: 'Ketelitian & kecepatan kerja', section: 'HARD_SKILL', required: true, displayOrder: 6 },
  { id: 'kemampuan_tool', label: 'Kemampuan menggunakan alat dan sistem', section: 'HARD_SKILL', required: true, displayOrder: 7 },
  { id: 'konsistensi', label: 'Konsistensi Hasil kerja', section: 'HARD_SKILL', required: true, displayOrder: 8 },
  
  // ATTITUDE
  { id: 'kedisiplinan', label: 'Kedisiplinan dan kehadiran', section: 'ATTITUDE', required: true, displayOrder: 9 },
  { id: 'kepatuhan', label: 'Kepatuhan aturan & arahan', section: 'ATTITUDE', required: true, displayOrder: 10 },
  { id: 'etika', label: 'Etika & Profesionalitas', section: 'ATTITUDE', required: true, displayOrder: 11 },
  { id: 'lingkungan', label: 'Tanggung jawab lingkungan', section: 'ATTITUDE', required: true, displayOrder: 12 },
  { id: 'ramah_pelanggan', label: 'Ramah terhadap pelanggan', section: 'ATTITUDE', required: true, displayOrder: 13 },
  
  // IBADAH (not required, only show during Ramadan)
  { id: 'sholat', label: 'Melaksanakan sholat', section: 'IBADAH', required: false, displayOrder: 14 },
  { id: 'puasa', label: 'Melaksanakan Puasa', section: 'IBADAH', required: false, displayOrder: 15 },
];

export const VALID_OUTLETS: OutletCode[] = ['BTMK', 'BTMF', 'TSF', 'MBA', 'EGC', 'HCP', 'FRC', 'ENC'];

export const OUTLET_NAMES: Record<OutletCode, string> = {
  BTMK: 'Back To Mie Kitchen',
  BTMF: 'Back To Mie Forest',
  TSF: 'Taman Sari Forest',
  MBA: 'Motoright Berkah Auto',
  EGC: 'EGC',
  HCP: 'Healthopia Clinic',
  FRC: 'Franchise',
  ENC: 'Easee n Co'
};

// Exception slots: tetap ada untuk override IDs yang tidak mengikuti konvensi prefix.
// Di skema saat ini ketiganya kosong karena role detection sepenuhnya prefix-based.
export const MANAGERS: string[] = [];
export const SUPERVISORS: string[] = [];
export const PENILAI_KHUSUS: string[] = [];
export const DIRECTORS = ['DRK-001', 'DRK-002', 'DRK-003', 'DRK-004', 'DRK-005', 'DRK-006'];

// Password per role — single source of truth, tidak ada lagi tabel VALID_CREDENTIALS.
export const ROLE_PASSWORDS = {
  supervisor: 'EGG2026',
  manager:    'EGG_MANAGER2026',
  direksi:    'EGG_DIREKSI2026',
} as const;

export const PENILAIAN_TARGETS: Record<string, string[]> = {
  manager: ['BTMK', 'BTMF', 'TSF'], // manager hanya nilai ke 3 outlet ini
  // supervisor di-compute dari outlet user; BTMK & BTMF digabung satu scope
};

// Google Sheets Configuration
export const GOOGLE_SHEETS = {
  ID: process.env.GOOGLE_SHEETS_ID,
  MASTER_LIST_RANGE: 'Master_List!A1:E1000',
  PENILAIAN_RANGE: 'DB_Penilaian New!A1:W1000',
  PENILAIAN_APPEND_RANGE: 'DB_Penilaian New!A:W'
};

// Pagination
export const PAGINATION = {
  RECAP_PAGE_SIZE: 10,
  LEADERBOARD_PAGE_SIZE: 20
};

// Token
export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'super-secret-key',
  EXPIRY: '24h'
};

// Toast
export const TOAST_CONFIG = {
  DURATION: 4000,
  POSITION: 'top-right' as const
};
```

### 3.2 User Defined Constants
```typescript
// lib/utils/constants.ts - continued

// Valid Positions untuk setiap outlet
export const VALID_POSITIONS_BY_OUTLET: Record<OutletCode, string[]> = {
  BTMK: [
    'SPV Komersial', 'SPV Keuangan',
    'Kepala Media & Informasi', 'Senior Staff Support', 'Senior Staff Cashier',
    'Staff Waiters', 'Staff Kitchen', 'Staff Cassier', 'Staff support'
  ],
  BTMF: [
    'SPV General Affair Kitchen',
    'Staff Kitchen', 'Staff Cashier', 'Staff support'
  ],
  TSF: [
    'SPV Wahana', 'SPV Kebersihan dan Ketertiban', 'SPV General Affair & Keamanan', 'SPV Satwa',
    'Staff'
  ],
  MBA: [
    'Staff Mekanik'
  ],
  EGC: [
    'Manager Konstruksi', 'SPV Konstruksi', 'Staff Proyek'
  ],
  HCP: [
    'Apoteker', 'Bidan', 'Admin', 'Asisten Dokter', 'Labolatorium'
  ],
  FRC: [
    'Manager Rentcar'
  ]
};
```

---

## 4. UTILITY FUNCTIONS

### 4.1 Calculation Functions
```typescript
// lib/utils/calculations.ts

import { RatingCategory, RatingGrade, RATING_SCALE } from '@/lib/types';
import { RATING_CATEGORIES } from './constants';

/**
 * Convert rating grade to numeric value
 */
export function gradeToPoint(grade: RatingGrade): number {
  return RATING_SCALE[grade] || 0;
}

/**
 * Convert numeric value to grade
 */
export function pointToGrade(point: number): RatingGrade {
  const rounded = Math.round(point);
  const mapping: Record<number, RatingGrade> = {
    5: 'A',
    4: 'B',
    3: 'C',
    2: 'D',
    1: 'E'
  };
  return mapping[rounded] || 'E';
}

/**
 * Calculate average score from ratings
 */
export function calculateAverageScore(
  ratings: Record<RatingCategory, RatingGrade>,
  isRamadan: boolean = false
): number {
  const values = Object.entries(ratings)
    .filter(([categoryId, grade]) => {
      if (!grade || grade === '') return false;
      const category = RATING_CATEGORIES.find(c => c.id === categoryId as RatingCategory);
      // Filter out non-required categories yang kosong
      return category?.required || grade !== '';
    })
    .map(([, grade]) => gradeToPoint(grade as RatingGrade));

  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate total points from ratings
 * Formula: average * 5 (to get 0-25 scale)
 */
export function calculateTotalPoints(
  ratings: Record<RatingCategory, RatingGrade>,
  isRamadan: boolean = false
): number {
  const average = calculateAverageScore(ratings, isRamadan);
  return Math.round(average * 5);
}

/**
 * Calculate predikat from total points
 */
export function calculatePredikat(totalPoints: number): RatingGrade {
  const average = totalPoints / 5;
  return pointToGrade(average);
}

/**
 * Check if today is Ramadan
 * Simplified: check if current month has mostly ramadan
 * In production, use proper hijri calendar library
 */
export function isRamadan(): boolean {
  const now = new Date();
  // TODO: implement proper hijri calendar check
  // For now, hardcode atau gunakan library
  return false;
}

/**
 * Normalize scores across outlets to ensure fairness
 * Algorithm:
 * 1. Calculate average score per outlet
 * 2. Calculate global average
 * 3. For each employee: normalized = (rawAvg - outletAvg) + globalAvg
 */
export function normalizeLeaderboardScores(
  ratingRecords: RatingRecord[],
  employees: Employee[]
): LeaderboardEntry[] {
  // Group by employee
  const byEmployee = new Map<string, RatingRecord[]>();
  ratingRecords.forEach(record => {
    const key = record.karyawanDinilai;
    if (!byEmployee.has(key)) byEmployee.set(key, []);
    byEmployee.get(key)!.push(record);
  });

  // Calculate raw averages per employee
  const employeeScores = Array.from(byEmployee.entries()).map(([empId, records]) => {
    const rawAverage = records.reduce((sum, r) => sum + r.totalPoint / 5, 0) / records.length;
    const employee = employees.find(e => e.id === empId);
    return {
      employeeId: empId,
      outlet: employee?.outlet || 'UNKNOWN' as OutletCode,
      ratingCount: records.length,
      rawAverage
    };
  });

  // Group by outlet and calculate outlet averages
  const byOutlet = new Map<OutletCode, typeof employeeScores>();
  employeeScores.forEach(score => {
    const key = score.outlet;
    if (!byOutlet.has(key)) byOutlet.set(key, []);
    byOutlet.get(key)!.push(score);
  });

  const outletAverages = new Map<OutletCode, number>();
  byOutlet.forEach((scores, outlet) => {
    const avg = scores.reduce((sum, s) => sum + s.rawAverage, 0) / scores.length;
    outletAverages.set(outlet, avg);
  });

  // Calculate global average
  const globalAvg = Array.from(outletAverages.values()).reduce((a, b) => a + b, 0) / outletAverages.size;

  // Calculate normalized scores
  const normalized = employeeScores.map((score, index) => {
    const outletAvg = outletAverages.get(score.outlet) || globalAvg;
    const normalizedScore = (score.rawAverage - outletAvg) + globalAvg;
    const employee = employees.find(e => e.id === score.employeeId);
    
    return {
      rank: index + 1, // will be re-sorted
      employeeId: score.employeeId,
      employeeName: employee?.name || 'Unknown',
      outlet: score.outlet,
      position: employee?.position || 'Unknown',
      ratingCount: score.ratingCount,
      rawAverage: score.rawAverage,
      normalizedScore,
      totalPoints: Math.round(normalizedScore * 5)
    };
  });

  // Sort by normalized score DESC
  normalized.sort((a, b) => b.normalizedScore - a.normalizedScore);

  // Assign ranks
  return normalized.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}
```

### 4.2 Validation Functions
```typescript
// lib/utils/validators.ts

import { RatingGrade, RatingCategory } from '@/lib/types';
import { RATING_CATEGORIES } from './constants';
import { isManager, isSupervisor } from './roles';

export interface ValidationError {
  field: string;
  message: string;
}

// Catatan: validasi login (username/password) sekarang dilakukan server-side di
// app/api/auth/login/route.ts memakai resolveRole() + ROLE_PASSWORDS — tidak ada
// lagi tabel VALID_CREDENTIALS atau validateLoginCredentials di sini.

/**
 * Validate rating form before submission
 */
export function validateRatingForm(
  ratings: Record<RatingCategory, RatingGrade>,
  isRamadan: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];

  RATING_CATEGORIES.forEach(category => {
    const value = ratings[category.id];
    
    // Check required fields
    if (category.required && (!value || value === '')) {
      errors.push({
        field: category.id,
        message: `${category.label} harus diisi`
      });
    }

    // For Ramadan, sholat and puasa become required
    if (isRamadan && ['sholat', 'puasa'].includes(category.id) && (!value || value === '')) {
      errors.push({
        field: category.id,
        message: `${category.label} harus diisi saat Ramadan`
      });
    }

    // Validate rating value
    if (value && !['A', 'B', 'C', 'D', 'E'].includes(value)) {
      errors.push({
        field: category.id,
        message: `${category.label} nilai tidak valid`
      });
    }
  });

  return errors;
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (startDate > endDate) {
    errors.push({
      field: 'dateRange',
      message: 'Tanggal awal harus lebih awal dari tanggal akhir'
    });
  }

  return errors;
}

/**
 * Check if user can rate another employee.
 * Role gating untuk "tidak bisa menilai manager/SPV lain" menggunakan helper
 * isManager / isSupervisor dari lib/utils/roles.ts (data-driven via prefix ID
 * & posisi), bukan array hardcoded.
 */
export function canUserRate(
  raterRole: string,
  raterOutlet: string,
  raterEmployeeId: string,
  rateeEmployeeId: string,
  rateeOutlet: string,
  rateePosition?: string
): { canRate: boolean; reason?: string } {
  if (raterEmployeeId === rateeEmployeeId) {
    return { canRate: false, reason: 'Tidak bisa menilai diri sendiri' };
  }

  const ratee = { id: rateeEmployeeId, position: rateePosition };

  // Manager menilai semua karyawan di BTMK, BTMF, TSF — kecuali sesama manager
  if (raterRole === 'manager') {
    if (['BTMK', 'BTMF', 'TSF'].includes(rateeOutlet)) {
      if (!isManager(ratee)) return { canRate: true };
    }
    return { canRate: false, reason: 'Manager hanya bisa menilai outlet BTMK, BTMF, TSF' };
  }

  // Supervisor menilai outlet sendiri (BTMK & BTMF digabung satu scope) — kecuali sesama SPV
  if (raterRole === 'supervisor') {
    const isBTMGroup = ['BTMK', 'BTMF'].includes(raterOutlet) && ['BTMK', 'BTMF'].includes(rateeOutlet);
    const isSameOutlet = raterOutlet === rateeOutlet;
    if (isSameOutlet || isBTMGroup) {
      if (!isSupervisor(ratee)) return { canRate: true };
    }
    return { canRate: false, reason: 'Supervisor hanya bisa menilai outlet mereka sendiri (BTMK & BTMF digabung)' };
  }

  return { canRate: false, reason: 'Role tidak dikenali' };
}
```

### 4.3 Data Transformation Functions
```typescript
// lib/utils/transformers.ts

import { RatingRecord, Employee, RecapRow, RaterDetail } from '@/lib/types';

/**
 * Transform sheet rows to typed Employee objects
 */
export function transformToEmployees(sheetRows: any[][]): Employee[] {
  const [headers, ...dataRows] = sheetRows;
  
  return dataRows
    .filter(row => row && row.length > 0)
    .map(row => ({
      id: row[0],
      name: row[1],
      position: row[2],
      outlet: row[3],
      status: row[4]
    }));
}

/**
 * Transform sheet rows to typed RatingRecord objects
 */
export function transformToRatingRecords(sheetRows: any[][]): RatingRecord[] {
  const [headers, ...dataRows] = sheetRows;
  
  const categoryIndexMap: Record<string, number> = {
    komunikasi: 6,
    kerja_sama: 7,
    tanggung_jawab: 8,
    inisiatif: 9,
    penguasaan_sop: 10,
    ketelitian: 11,
    kemampuan_tool: 12,
    konsistensi: 13,
    kedisiplinan: 14,
    kepatuhan: 15,
    etika: 16,
    lingkungan: 17,
    ramah_pelanggan: 18,
    sholat: 19,
    puasa: 20
  };

  return dataRows
    .filter(row => row && row.length > 0)
    .map(row => ({
      tanggal: row[0],
      namaPenilai: row[1],
      karyawanDinilai: row[2],
      posisi: row[3],
      outlet: row[4],
      status: row[5],
      komunikasi: row[categoryIndexMap.komunikasi],
      kerja_sama: row[categoryIndexMap.kerja_sama],
      tanggung_jawab: row[categoryIndexMap.tanggung_jawab],
      inisiatif: row[categoryIndexMap.inisiatif],
      penguasaan_sop: row[categoryIndexMap.penguasaan_sop],
      ketelitian: row[categoryIndexMap.ketelitian],
      kemampuan_tool: row[categoryIndexMap.kemampuan_tool],
      konsistensi: row[categoryIndexMap.konsistensi],
      kedisiplinan: row[categoryIndexMap.kedisiplinan],
      kepatuhan: row[categoryIndexMap.kepatuhan],
      etika: row[categoryIndexMap.etika],
      lingkungan: row[categoryIndexMap.lingkungan],
      ramah_pelanggan: row[categoryIndexMap.ramah_pelanggan],
      sholat: row[categoryIndexMap.sholat],
      puasa: row[categoryIndexMap.puasa],
      totalPoint: parseFloat(row[21]),
      predikat: row[22]
    }));
}

/**
 * Group rating records by employee for recap display
 */
export function groupByEmployeeForRecap(
  records: RatingRecord[],
  employees: Employee[]
): RecapRow[] {
  const grouped = new Map<string, RatingRecord[]>();
  
  records.forEach(record => {
    const key = record.karyawanDinilai;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(record);
  });

  let rowNo = 1;
  return Array.from(grouped.entries())
    .map(([empId, ratingRecords]) => {
      const employee = employees.find(e => e.id === empId);
      const averageScore = ratingRecords.reduce((sum, r) => sum + (r.totalPoint / 5), 0) / ratingRecords.length;
      const totalPoints = Math.round(averageScore * 5);

      return {
        no: rowNo++,
        employeeId: empId,
        employeeName: employee?.name || empId,
        outlet: employee?.outlet || 'UNKNOWN',
        position: employee?.position || 'Unknown',
        raters: ratingRecords.map(r => ({
          raterId: r.namaPenilai,
          raterName: r.namaPenilai,
          averageScore: r.totalPoint / 5,
          submittedDate: r.tanggal
        })),
        averageScore,
        totalPoints,
        isExpanded: false
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);
}
```

### 4.4 Helper Functions
```typescript
// lib/utils/helpers.ts

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return d.toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' });
  }
  
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function getMonthYear(date: Date = new Date()): string {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function getDateRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ID parsing & role detection telah dipindahkan ke lib/utils/roles.ts:
//   parseEmployeeId(id)              → { rolePrefix, outlet, number }
//   resolveRole({ id, position })    → 'direksi' | 'manager' | 'supervisor' | null
//   isManager / isSupervisor / isDireksi
//   outletFromId(id)
//   normalizeOutletCode(s)           — BTM → BTMK
//   normalizeEmployeeId(s)           — BTM-001 → BTMK-001, SPV-BTM-001 → SPV-BTMK-001
//
// helpers.ts hanya re-export getOutletFromEmployeeId = outletFromId untuk
// kompatibilitas. Regex naive `^([A-Z]+)-` TIDAK benar untuk ID compound
// seperti MGR-FRC-001 / SPV-BTMK-001 / FRL-BTMK-001 — selalu pakai parseEmployeeId.
```

---

## 5. API ROUTES IMPLEMENTATION GUIDE

### 5.1 GET /api/sheets/master-list

```typescript
// app/api/sheets/master-list/route.ts

import { getMasterList } from '@/lib/api/sheets';
import { ApiResponse, Employee } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse<ApiResponse<Employee[]>>> {
  try {
    const employees = await getMasterList();
    return NextResponse.json({
      success: true,
      data: employees
    });
  } catch (error: any) {
    console.error('Error fetching master list:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch master list',
      code: 'FETCH_ERROR'
    }, { status: 500 });
  }
}
```

### 5.2 GET /api/sheets/penilaian

```typescript
// app/api/sheets/penilaian/route.ts

import { getPenilaianData } from '@/lib/api/sheets';
import { ApiResponse, RatingRecord } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<RatingRecord[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const data = await getPenilaianData(startDate || undefined, endDate || undefined);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching penilaian:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch penilaian data',
      code: 'FETCH_ERROR'
    }, { status: 500 });
  }
}
```

### 5.3 POST /api/sheets/append

```typescript
// app/api/sheets/append/route.ts

import { appendRatings } from '@/lib/api/sheets';
import { ApiResponse } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{count: number}>>> {
  try {
    const body = await request.json();
    const { rows } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid rows format',
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }

    await appendRatings(rows);

    return NextResponse.json({
      success: true,
      data: { count: rows.length }
    });
  } catch (error: any) {
    console.error('Error appending ratings:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to append ratings',
      code: 'APPEND_ERROR'
    }, { status: 500 });
  }
}
```

---

## 6. NEXT.JS & ENVIRONMENT SETUP

### 6.1 next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
```

### 6.2 tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### 6.3 tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        "primary-dark": "#1E40AF",
      },
    },
  },
  plugins: [],
};

export default config;
```

### 6.4 .env.local (example)
```
GOOGLE_SHEETS_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

---

## 7. KEY IMPLEMENTATION NOTES

1. **Draft Saving:** Gunakan localStorage dengan key `rating_draft_${userId}_${employeeId}`
2. **Timestamp:** Selalu gunakan ISO format (new Date().toISOString())
3. **Error Handling:** Jangan expose technical errors ke user, gunakan friendly messages
4. **Performance:** Implement React.memo untuk card components, lazy load halaman
5. **Validation:** Validate di frontend (UX) dan backend (security)
6. **Auth:** Check token di setiap protected route
7. **Data Consistency:** Sebelum append, check apakah data sudah ada (prevent duplicate)

---

**END OF TECHNICAL SPECIFICATION**
