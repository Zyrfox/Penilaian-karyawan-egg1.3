import { getMasterList } from '@/lib/api/sheets';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const employees = await getMasterList();
    
    // Check for duplicate IDs
    const idMap = new Map<string, number[]>();
    employees.forEach((emp: any) => {
      if (emp.id && emp.id.trim() !== '') {
        const id = emp.id.trim();
        if (!idMap.has(id)) {
          idMap.set(id, []);
        }
        idMap.get(id)!.push(emp._rowNumber);
      }
    });

    const duplicates: string[] = [];
    for (const [id, rows] of idMap.entries()) {
      if (rows.length > 1) {
        duplicates.push(`ID ganda terdeteksi: ${id} berada di baris ${rows.join(' dan ')}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: employees,
      warnings: duplicates.length > 0 ? duplicates : undefined
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
