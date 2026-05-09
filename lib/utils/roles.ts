import { DIRECTORS, MANAGERS, SUPERVISORS, PENILAI_KHUSUS } from './constants';

export type Role = 'direksi' | 'manager' | 'supervisor';
export type RolePrefix = 'DRK' | 'MGR' | 'SPV' | 'FRL';

export interface ParsedId {
  rolePrefix?: RolePrefix;
  outlet?: string;
  number?: string;
}

export interface RoleSubject {
  id: string;
  position?: string;
}

const ID_PATTERN = /^(?:(DRK|MGR|SPV|FRL)-)?(?:([A-Z]+)-)?(\d+)$/;

const ADMIN_ALIAS = 'admin.media@easygoing.id';

export function parseEmployeeId(id: string): ParsedId {
  if (!id) return {};
  const match = id.match(ID_PATTERN);
  if (!match) return {};
  const [, rolePrefix, outlet, number] = match;
  return {
    rolePrefix: rolePrefix as RolePrefix | undefined,
    outlet: outlet || undefined,
    number,
  };
}

export function resolveRole({ id, position }: RoleSubject): Role | null {
  if (!id) return null;
  const pos = (position || '').toUpperCase();
  const parsed = parseEmployeeId(id);

  if (parsed.rolePrefix === 'DRK' || DIRECTORS.includes(id)) return 'direksi';

  if (
    id === ADMIN_ALIAS ||
    parsed.rolePrefix === 'MGR' ||
    pos.includes('MANAGER') ||
    MANAGERS.includes(id)
  ) {
    return 'manager';
  }

  if (
    parsed.rolePrefix === 'SPV' ||
    pos.includes('SPV') ||
    SUPERVISORS.includes(id) ||
    PENILAI_KHUSUS.includes(id)
  ) {
    return 'supervisor';
  }

  return null;
}

export const isDireksi = (s: RoleSubject) => resolveRole(s) === 'direksi';
export const isManager = (s: RoleSubject) => resolveRole(s) === 'manager';
export const isSupervisor = (s: RoleSubject) => resolveRole(s) === 'supervisor';

export function outletFromId(id: string): string {
  return parseEmployeeId(id).outlet || '';
}

// Migrasi konvensi lama: outlet code `BTM` (Back To Mie Kitchen) di-rename jadi `BTMK`
// untuk menghilangkan ambiguitas dengan ID staff `BTM-xxx`. Helper ini dipanggil di
// parser sheet sehingga sisa kode hanya pernah melihat bentuk canonical.
export function normalizeOutletCode(raw: string): string {
  if (!raw) return raw;
  return raw === 'BTM' ? 'BTMK' : raw;
}

// Mengganti token `BTM` di dalam ID — hanya kalau berdiri sendiri sebagai segmen outlet
// (di antara dash atau di awal). Contoh: `BTM-001` → `BTMK-001`, `SPV-BTM-001` →
// `SPV-BTMK-001`, `FRL-BTM-001` → `FRL-BTMK-001`. Tidak menyentuh `BTMF-001`/`BTMK-001`.
export function normalizeEmployeeId(id: string): string {
  if (!id) return id;
  return id.replace(/(^|-)BTM(?=-|$)/g, '$1BTMK');
}
