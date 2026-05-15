import { DIRECTORS, MANAGERS, SUPERVISORS, PENILAI_KHUSUS, VALID_OUTLETS } from './constants';

// Role tiers (internal):
// - direksi     : top-level
// - manager     : pillar manager (MGR- prefix) — rates everyone in BTMK/BTMF/TSF except other manager-tier
// - sub_manager : specialised/department manager (e.g. KMI-, OPR-, ANM-) — manager-tier login but
//                 rates like supervisor: only staff/freelance in their own outlet scope
// - supervisor  : SPV- prefix — only staff/freelance in their own outlet scope
export type Role = 'direksi' | 'manager' | 'sub_manager' | 'supervisor';

export interface ParsedId {
  rolePrefix?: string;   // any alphabetic role prefix (DRK/MGR/SPV/FRL/KMI/OPR/ANM/…)
  outlet?: string;       // outlet code (BTMK, BTMF, TSF, …)
  number?: string;
}

export interface RoleSubject {
  id: string;
  position?: string;
}

// Pattern accepts up to two alphabetic segments before the numeric tail.
// Examples:
//   MGR-001         → seg1='MGR', seg2=undefined
//   MGR-FRC-001     → seg1='MGR', seg2='FRC'
//   SPV-BTMK-001    → seg1='SPV', seg2='BTMK'
//   KMI-BTMK-001    → seg1='KMI', seg2='BTMK'
//   BTMK-001        → seg1='BTMK', seg2=undefined  (single segment = outlet)
//   DRK-001         → seg1='DRK',  seg2=undefined  (single segment = role)
const ID_PATTERN = /^(?:([A-Z]+)-)?(?:([A-Z]+)-)?(\d+)$/;

const ADMIN_ALIAS = 'admin.media@easygoing.id';

// Role prefixes that are NOT manager-tier. Anything else with a role-prefix
// (i.e. not DRK/MGR/SPV/FRL) is treated as a sub_manager (specialised manager).
const PILLAR_ROLE_PREFIXES = new Set(['DRK', 'MGR', 'SPV', 'FRL']);

export function parseEmployeeId(id: string): ParsedId {
  if (!id) return {};
  const match = id.match(ID_PATTERN);
  if (!match) return {};
  const [, seg1, seg2, number] = match;

  // Two segments: first is role prefix, second is outlet.
  if (seg1 && seg2) {
    return { rolePrefix: seg1, outlet: seg2, number };
  }
  // Single segment: decide by checking the known outlet list.
  if (seg1) {
    if ((VALID_OUTLETS as readonly string[]).includes(seg1)) {
      return { outlet: seg1, number };
    }
    return { rolePrefix: seg1, number };
  }
  return { number };
}

export function resolveRole({ id, position }: RoleSubject): Role | null {
  if (!id) return null;
  const pos = (position || '').toUpperCase();
  const parsed = parseEmployeeId(id);
  const prefix = parsed.rolePrefix;

  // Direksi
  if (prefix === 'DRK' || DIRECTORS.includes(id)) return 'direksi';

  // Admin alias is a pillar manager
  if (id === ADMIN_ALIAS) return 'manager';

  // Pillar manager (MGR- prefix)
  if (prefix === 'MGR' || MANAGERS.includes(id)) return 'manager';

  // Supervisor (SPV- prefix)
  if (prefix === 'SPV') return 'supervisor';

  // Freelance — not a penilai
  if (prefix === 'FRL') return null;

  // Non-pillar role prefix (KMI, OPR, ANM, AK, …) bisa berarti sub-manager
  // ATAU staff (mis. AK-EGG-001 "Staff Akuntansi"). Pakai keyword posisi
  // untuk disambiguate — posisi adalah source of truth, bukan prefix.
  if (prefix && !PILLAR_ROLE_PREFIXES.has(prefix)) {
    if (pos.includes('STAFF') || pos.includes('FREELANCE')) return null; // non-penilai
    if (pos.includes('MANAGER') || pos.includes('KEPALA') || pos.includes('DIREKTUR')) return 'sub_manager';
    // Default conservative: kalau ragu, treat sebagai non-penilai supaya
    // tidak salah kasih akses login. User bisa update posisi di sheet
    // untuk diangkat jadi sub_manager (tambahkan "Manager"/"Kepala").
    return null;
  }

  // Position-keyword fallback untuk ID tanpa role prefix (legacy / overrides).
  if (pos.includes('MANAGER')) return 'manager';
  if (pos.includes('SPV') || SUPERVISORS.includes(id) || PENILAI_KHUSUS.includes(id)) return 'supervisor';

  return null;
}

export const isDireksi = (s: RoleSubject) => resolveRole(s) === 'direksi';
export const isManager = (s: RoleSubject) => resolveRole(s) === 'manager';
export const isSubManager = (s: RoleSubject) => resolveRole(s) === 'sub_manager';
export const isSupervisor = (s: RoleSubject) => resolveRole(s) === 'supervisor';
// Convenience: any manager-tier role (pillar OR sub).
export const isAnyManager = (s: RoleSubject) => {
  const r = resolveRole(s);
  return r === 'manager' || r === 'sub_manager';
};

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
