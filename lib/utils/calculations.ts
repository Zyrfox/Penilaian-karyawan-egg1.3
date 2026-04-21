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

  // Calculate normalized scores
  const normalized = employeeScores.map((score, index) => {
    const outletAvg = outletAverages.get(score.outlet) || globalAvg;
    const normalizedScore = (score.rawAverage - outletAvg) + globalAvg;
    const employee = employees.find(e => e.id === score.employeeId);
    
    return {
      rank: index + 1, // will be re-sorted
      employeeId: score.employeeId,
      employeeName: employee?.name || score.employeeId,
      outlet: score.outlet,
      position: employee?.position || 'Unknown',
      ratingCount: score.ratingCount,
      rawAverage: score.rawAverage,
      normalizedScore,
      totalPoints: Math.round(normalizedScore)
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
