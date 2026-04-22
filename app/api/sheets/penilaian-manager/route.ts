import { getManagerRatings } from '@/lib/api/sheets';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await getManagerRatings(startDate, endDate);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching manager ratings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch manager ratings', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}
