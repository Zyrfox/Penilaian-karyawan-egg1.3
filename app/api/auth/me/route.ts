import { verifyToken } from '@/lib/api/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token tidak valid atau sudah kedaluwarsa' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: decoded.userId,
        name: decoded.name,
        role: decoded.role,
        outlet: decoded.outlet,
        position: (decoded as any).position || '',
        loginTime: decoded.loginTime,
      },
    });
  } catch (error) {
    console.error('/api/auth/me error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memverifikasi sesi.' },
      { status: 500 }
    );
  }
}
