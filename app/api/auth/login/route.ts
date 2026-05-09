import { getMasterList } from '@/lib/api/sheets';
import { MANAGERS, SUPERVISORS, DIRECTORS, PENILAI_KHUSUS, ROLE_PASSWORDS } from '@/lib/utils/constants';
import { signToken } from '@/lib/api/auth';
import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Username dan password tidak boleh kosong' },
        { status: 401 }
      );
    }

    // ── 1. Ambil data dari Master List (Google Sheets) ──────────────────────
    let masterList: any[] = [];
    try {
      masterList = await getMasterList();
    } catch {
      // Jika sheets tidak bisa diakses, fallback ke mode terbatas
    }

    const empData = masterList.find((e: any) => e.id === username);

    // ── 2. Tentukan role berdasarkan prioritas ──────────────────────────────
    let role: UserRole | null = null;
    let expectedPassword = '';

    if (DIRECTORS.includes(username)) {
      // Direksi: hardcoded list
      role = 'direksi';
      expectedPassword = ROLE_PASSWORDS.direksi;

    } else if (username === 'admin.media@easygoing.id' || (empData && (empData.id.startsWith('MGR-') || empData.position?.toUpperCase().includes('MANAGER')))) {
      // ✅ DINAMIS: Manager
      role = 'manager';
      expectedPassword = ROLE_PASSWORDS.manager;

    } else if (PENILAI_KHUSUS.includes(username) || (empData && (empData.id.startsWith('SPV-') || (empData.position && empData.position.toUpperCase().includes('SPV'))))) {
      // ✅ DINAMIS: SPV atau posisi di sheet mengandung kata "SPV"
      role = 'supervisor';
      expectedPassword = ROLE_PASSWORDS.supervisor;

    } else {
      return NextResponse.json(
        { success: false, message: 'Username tidak ditemukan atau tidak memiliki akses sebagai penilai' },
        { status: 401 }
      );
    }

    // ── 3. Validasi password ────────────────────────────────────────────────
    if (password !== expectedPassword) {
      return NextResponse.json(
        { success: false, message: 'Password salah' },
        { status: 401 }
      );
    }

    // ── 4. Buat token & response ────────────────────────────────────────────
    const displayName = empData?.name || username;
    const displayPosition = empData?.position || '';
    const outlet = empData?.outlet || username.split('-')[0];

    const user: User = {
      id: username,
      name: displayName,
      role,
      outlet,
      loginTime: new Date().toISOString(),
    };

    const token = await signToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      outlet: user.outlet,
      position: displayPosition,
      loginTime: user.loginTime,
    });

    const response = NextResponse.json(
      { success: true, user, token },
      { status: 200 }
    );

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 jam
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server. Coba lagi.' },
      { status: 500 }
    );
  }
}

