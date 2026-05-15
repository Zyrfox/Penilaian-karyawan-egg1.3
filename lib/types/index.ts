export type UserRole = 'manager' | 'sub_manager' | 'supervisor' | 'direksi' | 'public';
export type ManagerDivision = 'SDM' | 'Keuangan' | 'Inventory' | 'Komersial' | 'Lainnya';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  outlet?: string;
  loginTime: string;
}

export interface AuthToken {
  userId: string;
  role: UserRole;
  name: string;
  outlet?: string;
  position?: string;
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

export type OutletCode = 'EGG' | 'BTMK' | 'BTMF' | 'TSF' | 'MBA' | 'EGC' | 'HCP' | 'FRC' | 'ENC';

export type EmployeeStatus = 'Aktif' | 'Tidak Aktif';

export interface Employee {
  id: string; // format: [OUTLET]-[NUMBER]
  name: string;
  position: string;
  outlet: OutletCode;
  status: EmployeeStatus;
}

export interface EmployeeForRating extends Employee {
  canRate: boolean;
  ratingStatus?: 'completed' | 'pending' | 'draft';
}

export type RatingGrade = 'A' | 'B' | 'C' | 'D' | 'E' | '';

export interface RatingValue {
  grade: RatingGrade;
  point: number;
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
  penilaiByteName: string;
  employeeId: string;
  ratings: Record<RatingCategory, RatingGrade>;
  savedAt: string;
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
  namaPenilaiRaw?: string;
  karyawanDinilai: string;
  karyawanDinilaiRaw?: string;
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

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

export interface SheetRow {
  [key: string]: any;
}

export interface SheetsError {
  code: string;
  message: string;
  status: number;
}
