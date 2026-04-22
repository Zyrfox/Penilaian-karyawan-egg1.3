import { RatingCategoryMeta, OutletCode } from '@/lib/types';

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

export const VALID_OUTLETS: OutletCode[] = ['BTM', 'BTMF', 'TSF', 'MBA', 'EGC', 'HCP', 'FRC'];

export const OUTLET_NAMES: Record<OutletCode, string> = {
  BTM: 'Back To Mie Kitchen',
  BTMF: 'Back To Mie Forest',
  TSF: 'Taman Sari Forest',
  MBA: 'Motoright Berkah Auto',
  EGC: 'EGC',
  HCP: 'Healthopia Clinic',
  FRC: 'Franchise'
};

export const MANAGERS = ['MGR-001', 'MGR-002', 'MGR-003', 'MGR-004', 'FRC-001', 'EGC-001', 'admin.media@easygoing.id'];
export const SUPERVISORS = ['BTM-003', 'BTM-010', 'BTMF-001', 'TSF-001', 'TSF-002', 'TSF-004', 'TSF-008', 'TSF-011', 'EGC-002'];
export const DIRECTORS = ['DRK-001', 'DRK-002', 'DRK-003', 'DRK-004', 'DRK-005', 'DRK-006'];

export const VALID_CREDENTIALS: Record<string, string> = {
  // --- Admin ---
  'admin.media@easygoing.id': 'EGG_MANAGER2026',
  // --- Manager (password berbeda dari SPV) ---
  'MGR-001': 'EGG_MANAGER2026',
  'MGR-002': 'EGG_MANAGER2026',
  'MGR-003': 'EGG_MANAGER2026',
  'MGR-004': 'EGG_MANAGER2026',
  'FRC-001': 'EGG_MANAGER2026',
  'EGC-001': 'EGG_MANAGER2026',
  // --- Supervisor ---
  'BTM-003': 'EGG2026',
  'BTM-010': 'EGG2026',
  'BTMF-001': 'EGG2026',
  'TSF-001': 'EGG2026',
  'TSF-002': 'EGG2026',
  'TSF-004': 'EGG2026',
  'TSF-008': 'EGG2026',
  'TSF-011': 'EGG2026',
  'EGC-002': 'EGG2026',
  // --- Direksi ---
  'DRK-001': 'EGG_DIREKSI2026',
  'DRK-002': 'EGG_DIREKSI2026',
  'DRK-003': 'EGG_DIREKSI2026',
  'DRK-004': 'EGG_DIREKSI2026',
  'DRK-005': 'EGG_DIREKSI2026',
  'DRK-006': 'EGG_DIREKSI2026',
};

export const PENILAIAN_TARGETS: Record<string, string[]> = {
  manager: ['BTM', 'BTMF', 'TSF'],
};

// Google Sheets Configuration
export const GOOGLE_SHEETS = {
  ID: process.env.GOOGLE_SHEETS_ID || 'your-sheet-id-placeholder',
  MASTER_LIST_RANGE: 'Master_List!A1:E1000',
  PENILAIAN_RANGE: 'DB_Penilaian New!A1:W1000',
  PENILAIAN_APPEND_RANGE: 'DB_Penilaian New!A:W',
  // Sheet penilaian manager oleh direksi
  PENILAIAN_MGR_RANGE: 'DB_Penilaian MGR!A1:W1000',
  PENILAIAN_MGR_APPEND_RANGE: 'DB_Penilaian MGR!A:W',
  // Sheet rekap manager
  REKAP_MGR_RANGE: 'Rekap Nilai MGR!A1:Z1000',
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

export const VALID_POSITIONS_BY_OUTLET: Record<OutletCode, string[]> = {
  BTM: [
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
