import { getMasterList } from '@/lib/api/sheets';
import { ROLE_PASSWORDS } from '@/lib/utils/constants';
import { resolveRole, outletFromId } from '@/lib/utils/roles';
import { signToken } from '@/lib/api/auth';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/types';

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

    let masterList: any[] = [];
    try {
      masterList = await getMasterList();
    } catch {
      // Jika sheets tidak bisa diakses, fallback ke mode terbatas
    }

    const empData = masterList.find((e: any) => e.id === username);

    const role = resolveRole({ id: username, position: empData?.position });
    if (!role) {
      return NextResponse.json(
        { success: false, message: 'Username tidak ditemukan atau tidak memiliki akses sebagai penilai' },
        { status: 401 }
      );
    }

    const expectedPassword = ROLE_PASSWORDS[role];

    if (password !== expectedPassword) {
      return NextResponse.json(
        { success: false, message: 'Password salah' },
        { status: 401 }
      );
    }

    const displayName = empData?.name || username;
    const displayPosition = empData?.position || '';
    const outlet = empData?.outlet || outletFromId(username);

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

