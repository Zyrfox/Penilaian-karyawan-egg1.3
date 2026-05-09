import { RatingGrade, RatingCategory } from '@/lib/types';
import { RATING_CATEGORIES } from './constants';
import { isManager, isSupervisor } from './roles';

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

  const ratee = { id: rateeEmployeeId, position: rateePosition };

  if (raterRole === 'manager') {
    if (['BTMK', 'BTMF', 'TSF'].includes(rateeOutlet)) {
      if (!isManager(ratee)) {
        return { canRate: true };
      }
    }
    return { canRate: false, reason: 'Manager hanya bisa menilai outlet BTMK, BTMF, TSF' };
  }

  if (raterRole === 'supervisor') {
    const isBTMGroup = ['BTMK', 'BTMF'].includes(raterOutlet) && ['BTMK', 'BTMF'].includes(rateeOutlet);
    const isSameOutlet = raterOutlet === rateeOutlet;

    if (isSameOutlet || isBTMGroup) {
      if (!isSupervisor(ratee)) {
        return { canRate: true };
      }
    }
    return { canRate: false, reason: 'Supervisor hanya bisa menilai outlet mereka sendiri (BTMK & BTMF digabung)' };
  }

  return { canRate: false, reason: 'Role tidak dikenali' };
}
