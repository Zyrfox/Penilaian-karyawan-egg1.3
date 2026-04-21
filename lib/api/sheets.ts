import { google } from 'googleapis';
import { GOOGLE_SHEETS } from '../utils/constants';

function getGoogleAuth() {
  const accountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Make sure to parse newlines in private key securely
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: accountEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function getMasterList() {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS.ID,
      range: GOOGLE_SHEETS.MASTER_LIST_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return [];

    return rows
      .slice(1)
      .filter(row => row[1] && row[1].trim() !== '') // Hanya ambil row yang memiliki "Nama Lengkap"
      .map((row) => ({
        id: row[0] || '',
        name: row[1] || '',
        position: row[2] || '',
        outlet: row[3] || '',
        status: row[4] || 'Aktif',
      }));
  } catch (error: any) {
    console.error('getSheetsError (MasterList):', error);
    throw new Error('Gagal mengambil data dari server. Coba lagi.');
  }
}

export async function getPenilaianData(startDate?: string, endDate?: string) {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS.ID,
      range: GOOGLE_SHEETS.PENILAIAN_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return [];

    let data = rows.slice(1).map((row) => ({
      tanggal: row[0],
      namaPenilai: row[1],
      karyawanDinilai: row[2],
      posisi: row[3],
      outlet: row[4],
      status: row[5],
      komunikasi: row[6],
      kerja_sama: row[7],
      tanggung_jawab: row[8],
      inisiatif: row[9],
      penguasaan_sop: row[10],
      ketelitian: row[11],
      kemampuan_tool: row[12],
      konsistensi: row[13],
      kedisiplinan: row[14],
      kepatuhan: row[15],
      etika: row[16],
      lingkungan: row[17],
      ramah_pelanggan: row[18],
      sholat: row[19] || '',
      puasa: row[20] || '',
      totalPoint: parseFloat(row[21]) || 0,
      predikat: row[22] || 'E',
    }));

    if (startDate && endDate) {
      data = data.filter((d) => {
        const date = new Date(d.tanggal);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    }

    return data;
  } catch (error: any) {
    console.error('getSheetsError (PenilaianData):', error);
    throw new Error('Gagal mengambil data penilaian. Coba lagi.');
  }
}

export async function appendRatings(rows: any[][]) {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS.ID,
      range: GOOGLE_SHEETS.PENILAIAN_APPEND_RANGE,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
  } catch (error: any) {
    console.error('appendSheetsError:', error);
    throw new Error('Gagal menyimpan penilaian ke server. Coba lagi.');
  }
}
