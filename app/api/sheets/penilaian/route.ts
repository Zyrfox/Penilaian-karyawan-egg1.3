import { getPenilaianData } from '@/lib/api/sheets';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    const data = await getPenilaianData(startDate, endDate);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching penilaian:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch penilaian data',
      code: 'FETCH_ERROR'
    }, { status: 500 });
  }
}
