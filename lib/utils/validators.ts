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

  // Resolve ratee role — null means staff or freelance (i.e. ratable, non-penilai).
  // Any non-null value (manager/sub_manager/supervisor/direksi) means the ratee is
  // a penilai-tier user and is generally NOT ratable by lower or equal tiers.
  const rateeRole = resolveRole({ id: rateeEmployeeId, position: rateePosition });
  const rateeIsNonPenilai = rateeRole === null;

  if (raterRole === 'manager') {
    // Pillar manager: rate everyone in BTMK/BTMF/TSF except other manager-tier users.
    // Penilai-tier (sub_manager, supervisor) and other pillar managers cannot be rated
    // by pillar managers (they are evaluated separately via Direksi).
    if (['BTMK', 'BTMF', 'TSF'].includes(rateeOutlet)) {
      if (rateeIsNonPenilai) {
        return { canRate: true };
      }
    }
    return { canRate: false, reason: 'Manager hanya bisa menilai staff/freelance di outlet BTMK, BTMF, TSF' };
  }

  if (raterRole === 'supervisor' || raterRole === 'sub_manager') {
    // Supervisor and sub-manager share the same scope: only staff/freelance in their
    // own outlet (BTMK + BTMF grouped as one scope).
    const isBTMGroup = ['BTMK', 'BTMF'].includes(raterOutlet) && ['BTMK', 'BTMF'].includes(rateeOutlet);
    const isSameOutlet = raterOutlet === rateeOutlet;

    if (isSameOutlet || isBTMGroup) {
      // Block rating of any penilai-tier user (other SPV, sub_manager, manager, direksi).
      if (rateeIsNonPenilai) {
        return { canRate: true };
      }
    }
    const label = raterRole === 'supervisor' ? 'Supervisor' : 'Manager khusus';
    return { canRate: false, reason: `${label} hanya bisa menilai staff/freelance di outlet mereka sendiri (BTMK & BTMF digabung)` };
  }

  return { canRate: false, reason: 'Role tidak dikenali' };
}
