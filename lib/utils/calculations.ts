import { RatingCategory, RatingGrade, RATING_SCALE, RatingRecord, Employee, LeaderboardEntry, OutletCode } from '@/lib/types';
import { RATING_CATEGORIES } from './constants';

export function gradeToPoint(grade: RatingGrade): number {
  return RATING_SCALE[grade] || 0;
}

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

export function calculateAverageScore(
  ratings: Record<RatingCategory, RatingGrade>,
  isRamadan: boolean = false
): number {
  const values = Object.entries(ratings)
    .filter(([categoryId, grade]) => {
      if (!grade) return false;
      const category = RATING_CATEGORIES.find(c => c.id === categoryId as RatingCategory);
      // Filter out non-required categories yang kosong
      return category?.required || !!grade;
    })
    .map(([, grade]) => gradeToPoint(grade as RatingGrade));

  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Perhitungan score dengan logika bonus-only untuk kriteria opsional (Ibadah).
 *
 * - Kriteria WAJIB: selalu ikut rata-rata jika diisi
 * - Kriteria OPSIONAL (Ibadah) di luar Ramadan:
 *     • Jika TIDAK diisi → tidak berpengaruh sama sekali
 *     • Jika DIISI dan nilainya ≥ rata-rata wajib → masuk sebagai bonus (menaikkan score)
 *     • Jika DIISI dan nilainya < rata-rata wajib → diabaikan (tidak menurunkan score)
 * - Pada periode Ramadan, Ibadah diperlakukan sebagai wajib (ikut rata-rata biasa)
 */
export function calculateScoreWithBonus(
  ratings: Record<string, string>,
  isRamadanPeriod: boolean
): number {
  // 1. Hitung rata-rata dari kriteria WAJIB saja
  const requiredValues = Object.entries(ratings)
    .filter(([id, val]) => {
      if (!val || val === '' || val === '-') return false;
      const cat = RATING_CATEGORIES.find(c => c.id === id);
      if (!cat) return false;
      // Saat Ramadan, IBADAH juga wajib
      if (isRamadanPeriod) return true;
      return cat.required;
    })
    .map(([, val]) => RATING_SCALE[val as RatingGrade] || 0);

  if (requiredValues.length === 0) return 0;
  const requiredAvg = requiredValues.reduce((a, b) => a + b, 0) / requiredValues.length;

  // 2. Jika bukan Ramadan, cek kriteria opsional sebagai bonus
  if (!isRamadanPeriod) {
    const optionalIds = RATING_CATEGORIES
      .filter(c => !c.required)
      .map(c => c.id);

    const bonusValues = optionalIds
      .map(id => {
        const val = ratings[id];
        if (!val || val === '' || val === '-') return null; // tidak diisi → skip
        const point = RATING_SCALE[val as RatingGrade] || 0;
        return point >= requiredAvg ? point : null; // hanya jika ≥ rata-rata wajib
      })
      .filter((v): v is number => v !== null);

    if (bonusValues.length > 0) {
      // Gabungkan: semua required + optional yang lolos sebagai bonus
      const allValues = [...requiredValues, ...bonusValues];
      return allValues.reduce((a, b) => a + b, 0) / allValues.length;
    }
  }

  return requiredAvg;
}

export function calculateTotalPoints(
  ratings: Record<RatingCategory, RatingGrade>,
  isRamadan: boolean = false
): number {
  // totalPoints = dibulatkan dari rata-rata (skala 1-5)
  return Math.round(calculateAverageScore(ratings, isRamadan));
}

export function calculatePredikat(avgScore: number): RatingGrade {
  // avgScore sudah dalam skala 1-5
  return pointToGrade(avgScore);
}

export function isRamadan(): boolean {
  // Example for 2026: Feb 28 - Mar 29
  const now = new Date();
  return (now.getMonth() === 1 && now.getDate() >= 28) ||
         (now.getMonth() === 2 && now.getDate() <= 29);
}

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
    // totalPoint dari sheet sudah dalam skala 1-5, tidak perlu dibagi 5 lagi
    const rawAverage = records.reduce((sum, r) => sum + r.totalPoint, 0) / records.length;
    const employee = employees.find(e => e.id === empId);
    return {
      employeeId: empId,
      outlet: employee?.outlet || 'BTM' as OutletCode, // default fallback
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
  const globalAvg = outletAverages.size > 0 
    ? Array.from(outletAverages.values()).reduce((a, b) => a + b, 0) / outletAverages.size
    : 0;

  // Calculate normalized scores — simple average, no outlet normalization
  const normalized = employeeScores.map((score, index) => {
    const employee = employees.find(e => e.id === score.employeeId);
    
    return {
      rank: index + 1, // will be re-sorted
      employeeId: score.employeeId,
      employeeName: employee?.name || score.employeeId,
      outlet: score.outlet,
      position: employee?.position || 'Unknown',
      ratingCount: score.ratingCount,
      rawAverage: score.rawAverage,
      normalizedScore: score.rawAverage, // = rata-rata semua penilai, tanpa normalisasi
      totalPoints: Math.round(score.rawAverage)
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
