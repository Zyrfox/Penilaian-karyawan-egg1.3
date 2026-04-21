import { getMasterList } from '@/lib/api/sheets';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employees = await getMasterList();
    return NextResponse.json({
      success: true,
      data: employees
    });
  } catch (error: any) {
    console.error('Error fetching master list:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch master list',
      code: 'FETCH_ERROR'
    }, { status: 500 });
  }
}
