import type { RecapRow } from '@/lib/types';

const PREDIKAT_MAP: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };

function getPredikat(avg: number): string {
  return PREDIKAT_MAP[Math.round(avg)] || 'E';
}

type SummaryRow = {
  No: number;
  'Nama Karyawan': string;
  Outlet: string;
  Posisi: string;
  'Jumlah Penilai': number;
  'Rata-rata Score': string;
  Predikat: string;
};

type DetailRow = {
  'Nama Karyawan': string;
  Outlet: string;
  Posisi: string;
  'Nama Penilai': string;
  'Tanggal Dinilai': string;
  Score: string;
};

export function buildSummaryRows(data: RecapRow[]): SummaryRow[] {
  return data.map((row) => ({
    No: row.no,
    'Nama Karyawan': row.employeeName,
    Outlet: row.outlet,
    Posisi: row.position,
    'Jumlah Penilai': row.raters.length,
    'Rata-rata Score': row.averageScore.toFixed(2),
    Predikat: getPredikat(row.averageScore),
  }));
}

export function buildDetailRows(data: RecapRow[]): DetailRow[] {
  const rows: DetailRow[] = [];
  for (const row of data) {
    for (const rater of row.raters) {
      rows.push({
        'Nama Karyawan': row.employeeName,
        Outlet: row.outlet,
        Posisi: row.position,
        'Nama Penilai': rater.raterName,
        'Tanggal Dinilai': rater.submittedDate ? rater.submittedDate.split(' ')[0] : '',
        Score: rater.averageScore.toFixed(2),
      });
    }
  }
  return rows;
}

function escapeCsvField(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h])).join(','));
  }
  return lines.join('\r\n');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildFilename(base: string, dateRange: { start: string; end: string }, ext: string): string {
  return `${base}_${dateRange.start}_to_${dateRange.end}.${ext}`;
}

export function exportRecapToCsv(
  data: RecapRow[],
  dateRange: { start: string; end: string }
): void {
  const summary = buildSummaryRows(data);
  const detail = buildDetailRows(data);

  const parts: string[] = [];
  parts.push('Rekapan Nilai Karyawan');
  parts.push(`Periode: ${dateRange.start} sampai ${dateRange.end}`);
  parts.push('');
  parts.push('== SUMMARY ==');
  parts.push(rowsToCsv(summary as unknown as Record<string, string | number>[]));
  parts.push('');
  parts.push('== DETAIL PER PENILAI ==');
  parts.push(rowsToCsv(detail as unknown as Record<string, string | number>[]));

  const csv = '﻿' + parts.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, buildFilename('Rekapan_Nilai', dateRange, 'csv'));
}

export async function exportRecapToXlsx(
  data: RecapRow[],
  dateRange: { start: string; end: string }
): Promise<void> {
  const XLSX = await import('xlsx');

  const summary = buildSummaryRows(data);
  const detail = buildDetailRows(data);

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  const wsDetail = XLSX.utils.json_to_sheet(detail);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail per Penilai');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, buildFilename('Rekapan_Nilai', dateRange, 'xlsx'));
}
