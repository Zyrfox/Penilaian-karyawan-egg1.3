export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return d.toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' });
  }
  
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatTime(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function getMonthYear(date: Date = new Date()): string {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function getDateRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
}

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getOutletFromEmployeeId(empId: string): string {
  if (!empId) return '';
  const match = empId.match(/^([A-Z]+)-/);
  return match ? match[1] : '';
}

export function isManager(employeeId: string): boolean {
  if (!employeeId) return false;
  return employeeId.startsWith('MGR-') || employeeId === 'FRC-001' || employeeId === 'EGC-001';
}

export function isSupervisor(employeeId: string): boolean {
  if (!employeeId) return false;
  return (
    employeeId.startsWith('SPV') ||
    ['BTM-003', 'BTM-010', 'BTMF-001', 'TSF-001', 'TSF-002', 'TSF-008', 'TSF-011', 'EGC-002'].includes(employeeId)
  );
}

export function extractNameFromRaw(raw: string | undefined): string {
  if (!raw) return '';
  const idx = raw.indexOf('_');
  if (idx === -1) return '';
  return raw.slice(idx + 1).trim();
}

export function resolveDisplayName(
  id: string,
  raw: string | undefined,
  employees: { id: string; name: string }[]
): string {
  const employee = employees.find((e) => e.id === id);
  if (employee?.name) return employee.name;
  const fromRaw = extractNameFromRaw(raw);
  if (fromRaw) return fromRaw;
  return id;
}
