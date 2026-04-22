import { appendManagerRatings } from '@/lib/api/sheets';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid rows format', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    await appendManagerRatings(rows);

    return NextResponse.json({ success: true, data: { count: rows.length } });
  } catch (error: any) {
    console.error('Error appending manager ratings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to append manager ratings', code: 'APPEND_ERROR' },
      { status: 500 }
    );
  }
}
