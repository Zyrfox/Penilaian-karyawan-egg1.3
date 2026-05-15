import { RatingGrade, RatingCategory } from '@/lib/types';
import { RATING_CATEGORIES } from './constants';
import { resolveRole } from './roles';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRatingForm(
  ratings: Record<RatingCategory, RatingGrade>,
  isRamadan: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];

  RATING_CATEGORIES.forEach(category => {
    const value = ratings[category.id];
    
    // Check required fields
    if (category.required && !value) {
      errors.push({
        field: category.id,
        message: `${category.label} harus diisi`
      });
    }

    // For Ramadan, sholat and puasa become required
    if (isRamadan && ['sholat', 'puasa'].includes(category.id) && !value) {
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

  // Resolve ratee role. null = staff/freelance (non-penilai).
  const rateeRole = resolveRole({ id: rateeEmployeeId, position: rateePosition });
  const rateeIsNonPenilai = rateeRole === null;

  if (raterRole === 'manager') {
    // Pilar manager: rate siapapun di scope BTMK/BTMF/TSF KECUALI sesama
    // pilar manager dan direksi. Boleh menilai sub_manager, supervisor,
    // staff, dan freelance.
    if (['BTMK', 'BTMF', 'TSF'].includes(rateeOutlet)) {
      if (rateeRole !== 'manager' && rateeRole !== 'direksi') {
        return { canRate: true };
      }
    }
    return { canRate: false, reason: 'Pilar manager tidak bisa menilai sesama pilar manager atau direksi, dan scope-nya BTMK/BTMF/TSF' };
  }

  if (raterRole === 'direksi') {
    // Direksi via /penilaian: hanya sub_manager / SPV / staff / freelance.
    // Pilar manager dinilai terpisah via /penilaian-manager (form spesifik
    // divisi SDM/Keuangan/Inventory/Komersial) — tidak boleh nyasar ke list
    // di /penilaian. Sesama direksi & self-rate juga diblok.
    if (rateeRole !== 'direksi' && rateeRole !== 'manager') {
      return { canRate: true };
    }
    return { canRate: false, reason: 'Pilar manager dinilai via /penilaian-manager (bukan di /penilaian) dan direksi tidak menilai sesama direksi' };
  }

  if (raterRole === 'supervisor' || raterRole === 'sub_manager') {
    // Supervisor & sub_manager (manager khusus): scope = outlet sendiri
    // (BTMK + BTMF digabung), hanya boleh menilai staff/freelance
    // (non-penilai). TIDAK boleh rate SPV lain, sub_manager, pilar
    // manager, atau direksi.
    //
    // Sub-manager dengan outlet HQ-level (EGG, ENC) bukan terikat outlet
    // operasional sendiri — scope-nya grup BTMK+BTMF (di bawah Manager
    // Komersial). Berlaku untuk:
    //   - KMI-EGG-001 (Kepala Media & Informasi)
    //   - OPR-ENC-001 (Manager Operasional Easee n Co — belum punya staff
    //     di ENC, sementara overlap dengan ops BTMK+BTMF).
    const HQ_SUB_MANAGER_OUTLETS = ['EGG', 'ENC'];
    const isBTMGroup = ['BTMK', 'BTMF'].includes(raterOutlet) && ['BTMK', 'BTMF'].includes(rateeOutlet);
    const isSameOutlet = raterOutlet === rateeOutlet;
    const isHqGroupScope = raterRole === 'sub_manager' && HQ_SUB_MANAGER_OUTLETS.includes(raterOutlet)
                           && ['BTMK', 'BTMF'].includes(rateeOutlet);

    if (isSameOutlet || isBTMGroup || isHqGroupScope) {
      if (rateeIsNonPenilai) {
        return { canRate: true };
      }
    }
    const label = raterRole === 'supervisor' ? 'Supervisor' : 'Manager khusus';
    return { canRate: false, reason: `${label} hanya bisa menilai staff/freelance di outlet mereka sendiri (BTMK & BTMF digabung)` };
  }

  return { canRate: false, reason: 'Role tidak dikenali' };
}
