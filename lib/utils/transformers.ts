import { RatingRecord, Employee, RecapRow, RaterDetail, SheetRow } from '@/lib/types';
import { RATING_CATEGORIES } from './constants';

export function transformToEmployees(sheetRows: any[][]): Employee[] {
  if (!sheetRows || sheetRows.length < 2) return [];
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

export function transformToRatingRecords(sheetRows: any[][]): RatingRecord[] {
  if (!sheetRows || sheetRows.length < 2) return [];
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
      namaPenilai: row[1]?.split('_')[0] || row[1],
      karyawanDinilai: row[2]?.split('_')[0] || row[2],
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
      totalPoint: parseFloat(row[21]) || 0,
      predikat: row[22]
    }));
}

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
      // totalPoint sudah dalam skala 1–5 (rata-rata nilai A/B/C/D/E)
      // JANGAN dibagi 5 lagi — itu menyebabkan B(4.23) menjadi 0.86 (E)
      const averageScore = ratingRecords.reduce((sum, r) => sum + r.totalPoint, 0) / ratingRecords.length;
      const totalPoints = Math.round(averageScore);

      return {
        no: rowNo++,
        employeeId: empId,
        employeeName: employee?.name || empId,
        outlet: employee?.outlet || 'BTM',
        position: employee?.position || 'Unknown',
        raters: ratingRecords.map(r => ({
          raterId: r.namaPenilai,
          raterName: r.namaPenilai,
          averageScore: r.totalPoint, // sudah skala 1–5
          submittedDate: r.tanggal
        })),
        averageScore,
        totalPoints,
        isExpanded: false
      } as RecapRow;
    })
    .sort((a, b) => b.averageScore - a.averageScore);
}
