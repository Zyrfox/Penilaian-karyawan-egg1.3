import { ManagerDivision } from '@/lib/types';

export interface ManagerQuestion {
  id: string;
  label: string;
  required: boolean;
}

// ============================================================
// 4 Pertanyaan GENERAL — berlaku untuk semua manager
// ============================================================
export const GENERAL_MANAGER_QUESTIONS: ManagerQuestion[] = [
  {
    id: 'mngr_kepemimpinan',
    label: 'Kepemimpinan & Tanggung Jawab',
    required: true,
  },
  {
    id: 'mngr_komunikasi',
    label: 'Disiplin & Profesionalisme',
    required: true,
  },
  {
    id: 'mngr_target',
    label: 'Komunikasi & Koordinasi',
    required: true,
  },
  {
    id: 'mngr_integritas',
    label: 'Problem Solving & Inisiatif',
    required: true,
  },
];

// ============================================================
// 3 Pertanyaan SPESIFIK per divisi
// ============================================================
export const SPECIFIC_MANAGER_QUESTIONS: Record<ManagerDivision, ManagerQuestion[]> = {
  SDM: [
    {
      id: 'sdm_rekrutmen',
      label: 'Efektivitas rekrutmen & pengembangan karyawan',
      required: false,
    },
    {
      id: 'sdm_administrasi',
      label: 'Kerapian pencatatan data karyawan & absensi',
      required: false,
    },
    {
      id: 'sdm_budaya',
      label: 'Pengelolaan kedisiplinan & budaya perusahaan',
      required: false,
    },
  ],
  Keuangan: [
    {
      id: 'keu_laporan',
      label: 'Keakuratan laporan keuangan & transparansi',
      required: false,
    },
    {
      id: 'keu_anggaran',
      label: 'Pengendalian anggaran & efisiensi biaya',
      required: false,
    },
    {
      id: 'keu_arus_kas',
      label: 'Manajemen arus kas & kepatuhan regulasi',
      required: false,
    },
  ],
  Inventory: [
    {
      id: 'inv_stok',
      label: 'Akurasi stok & sistem pengadaan barang',
      required: false,
    },
    {
      id: 'inv_distribusi',
      label: 'Efisiensi distribusi & pengelolaan vendor',
      required: false,
    },
    {
      id: 'inv_sop',
      label: 'Kepatuhan SOP penyimpanan & minimisasi kerugian stok',
      required: false,
    },
  ],
  Komersial: [
    {
      id: 'kom_target',
      label: 'Efektivitas pengelolaan area outlet & channel penjualan',
      required: false,
    },
    {
      id: 'kom_strategi',
      label: 'Strategi pemasaran & pengelolaan outlet/channel',
      required: false,
    },
    {
      id: 'kom_mitra',
      label: 'Hubungan dengan mitra/franchise & pengembangan layanan baru',
      required: false,
    },
  ],
  Lainnya: [
    {
      id: 'lain_kinerja',
      label: 'Kinerja operasional divisi yang dipimpin',
      required: false,
    },
    {
      id: 'lain_inovasi',
      label: 'Inovasi & inisiatif program kerja',
      required: false,
    },
    {
      id: 'lain_kolaborasi',
      label: 'Kolaborasi lintas departemen',
      required: false,
    },
  ],
};

// Mapping ID manager ke divisinya (untuk pertanyaan spesifik divisi).
// Pilar manager HQ (MGR-NNN) punya divisi SDM/Keuangan/Inventory/Komersial.
// Manager outlet-scoped (MGR-XXX-NNN) default 'Lainnya' — hanya pertanyaan general.
export const MANAGER_DIVISION_MAP: Record<string, ManagerDivision> = {
  'MGR-001': 'SDM',
  'MGR-002': 'Keuangan',
  'MGR-003': 'Inventory',
  'MGR-004': 'Komersial',
};

// Ambil seluruh pertanyaan untuk satu manager (4 general + 3 spesifik = 7 total)
export function getManagerQuestions(managerId: string): ManagerQuestion[] {
  const division = MANAGER_DIVISION_MAP[managerId] || 'Lainnya';
  return [
    ...GENERAL_MANAGER_QUESTIONS,
    ...SPECIFIC_MANAGER_QUESTIONS[division],
  ];
}

export function getManagerDivision(managerId: string): ManagerDivision {
  return MANAGER_DIVISION_MAP[managerId] || 'Lainnya';
}
