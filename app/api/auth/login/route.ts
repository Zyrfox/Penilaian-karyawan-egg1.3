import { validateLoginCredentials } from '@/lib/utils/validators';
import { VALID_CREDENTIALS, MANAGERS, DIRECTORS } from '@/lib/utils/constants';
import { signToken } from '@/lib/api/auth';
import { getMasterList } from '@/lib/api/sheets';
import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const validationErrors = validateLoginCredentials(username, password);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, message: validationErrors[0].message },
        { status: 401 }
      );
    }

    const role: UserRole = DIRECTORS.includes(username) ? 'direksi' : MANAGERS.includes(username) ? 'manager' : 'supervisor';
    const outlet = username.split('-')[0];

    // Ambil nama asli dari Master List
    let displayName = username;
    let displayPosition = '';
    try {
      const masterList = await getMasterList();
      const empData = masterList.find((e: any) => e.id === username);
      if (empData) {
        displayName = empData.name;
        displayPosition = empData.position;
      }
    } catch {
      // Jika gagal, fallback ke username
    }

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
      maxAge: 60 * 60 * 24, // 24 hours
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
