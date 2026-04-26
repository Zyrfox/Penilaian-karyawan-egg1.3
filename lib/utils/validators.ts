import { RatingGrade, RatingCategory, Employee, EmployeeStatus, OutletCode } from '@/lib/types';
import { RATING_CATEGORIES, VALID_CREDENTIALS, MANAGERS, SUPERVISORS, VALID_OUTLETS, PENILAI_KHUSUS } from './constants';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateLoginCredentials(
  username: string,
  password: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!username || username.trim() === '') {
    errors.push({ field: 'username', message: 'Username tidak boleh kosong' });
  }

  if (!password || password.trim() === '') {
    errors.push({ field: 'password', message: 'Password tidak boleh kosong' });
  }

  if (username && password && !VALID_CREDENTIALS[username]) {
    errors.push({ field: 'username', message: 'Username tidak ditemukan' });
  }

  if (username && password && VALID_CREDENTIALS[username] !== password) {
    errors.push({ field: 'password', message: 'Password salah' });
  }

  return errors;
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
  rateeRole?: string
): { canRate: boolean; reason?: string } {
  // Cannot rate self
  if (raterEmployeeId === rateeEmployeeId) {
    return { canRate: false, reason: 'Tidak bisa menilai diri sendiri' };
  }

  // Manager can rate everyone in BTM, BTMF, TSF
  if (raterRole === 'manager') {
    if (['BTM', 'BTMF', 'TSF'].includes(rateeOutlet)) {
      // But cannot rate other managers
      if (!MANAGERS.includes(rateeEmployeeId)) {
        return { canRate: true };
      }
    }
    return { canRate: false, reason: 'Manager hanya bisa menilai outlet BTM, BTMF, TSF' };
  }

  // Supervisor can only rate people in their outlet (BTM and BTMF are considered the same scope)
  if (raterRole === 'supervisor') {
    const isBTMGroup = ['BTM', 'BTMF'].includes(raterOutlet) && ['BTM', 'BTMF'].includes(rateeOutlet);
    const isSameOutlet = raterOutlet === rateeOutlet;

    if (isSameOutlet || isBTMGroup) {
      // Cannot rate themselves or other supervisors
      const isRateeSPV = SUPERVISORS.includes(rateeEmployeeId) || 
                         PENILAI_KHUSUS.includes(rateeEmployeeId) || 
                         (rateeRole && rateeRole.toUpperCase().includes('SPV'));
                         
      if (!isRateeSPV && raterEmployeeId !== rateeEmployeeId) {
        return { canRate: true };
      }
    }
    return { canRate: false, reason: 'Supervisor hanya bisa menilai outlet mereka sendiri (BTM & BTMF digabung)' };
  }

  return { canRate: false, reason: 'Role tidak dikenali' };
}
