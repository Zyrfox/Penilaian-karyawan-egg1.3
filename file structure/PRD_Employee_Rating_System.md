# PRD: Employee Rating System Website (ERS)
**Version:** 1.0  
**Last Updated:** April 17, 2026  
**Status:** Ready for Development

---

## 1. PROJECT OVERVIEW

### 1.1 Tujuan Produk
Membangun website terintegrasi untuk sistem penilaian karyawan yang terhubung dengan Google Sheets, memungkinkan manager dan supervisor melakukan penilaian, melihat rekapan, dan displaying leaderboard karyawan berdasarkan performance metrics.

### 1.2 Tech Stack
- **Frontend Framework:** Next.js 15.x (latest)
- **UI Library:** React 19.x
- **Styling:** Tailwind CSS 4.x
- **Form Management:** React Hook Form
- **State Management:** Zustand (local state) + TanStack React Query (server state)
- **API Integration:** Google Sheets API v4
- **Authentication:** Custom JWT (simple username/password)
- **Deployment:** Vercel
- **Database:** Google Sheets (no additional database needed)
- **Type Safety:** TypeScript
- **UI Component Library:** Shadcn/ui

### 1.3 Deployment Target
- **Platform:** Vercel
- **Environment:** Production-ready with staging slot
- **Domain:** TBD (akan diberikan kemudian)

---

## 2. DATA STRUCTURE & ARCHITECTURE

### 2.1 Google Sheets Structure

#### Sheet: Master_List
**Tujuan:** Menyimpan data karyawan master

**Struktur (dimulai dari Row 1):**
```
Row 1: Headers (DO NOT MODIFY)
Header: A | B | C | D | E
A: ID Karyawan
B: Nama Lengkap
C: Posisi Spesifik
D: Outlet Asal
E: Status

Row 2+: Employee Data
```

**Data Types:**
- ID Karyawan (string): mengikuti grammar prefix berlapis (lihat bagian "Konvensi ID" di bawah). Contoh: `DRK-001`, `MGR-001`, `MGR-FRC-001`, `SPV-BTMK-001`, `BTMK-001`, `FRL-BTMK-001`.
- Nama Lengkap (string): maksimal 100 karakter
- Posisi Spesifik (string): nilai tetap dari enum posisi yang valid
- Outlet Asal (string): enum [BTMK, BTMF, TSF, MBA, EGC, HCP, FRC, ENC]
- Status (string): enum [Aktif, Tidak Aktif]

**Konvensi ID Karyawan (canonical, per 2026-05-09):**

| Pola | Arti | Contoh |
|---|---|---|
| `DRK-NNN` | Direksi (HQ) | `DRK-001` … `DRK-006` |
| `MGR-NNN` | Manager HQ-level (outlet `ALL OUTLET / HQ`) | `MGR-001` … `MGR-005` |
| `MGR-XXX-NNN` | Manager outlet-scoped | `MGR-FRC-001`, `MGR-EGC-001`, `MGR-ENC-001` |
| `SPV-XXX-NNN` | Supervisor outlet-scoped | `SPV-BTMK-001`, `SPV-BTMF-001`, `SPV-TSF-001` |
| `XXX-NNN` | Staff (tanpa role prefix) | `BTMK-001`, `BTMF-001`, `TSF-001`, `EGC-…`, `MBA-…`, `HCP-…` |
| `FRL-XXX-NNN` | Freelance (staff) outlet-scoped | `FRL-BTMK-001`, `FRL-BTMF-001`, `FRL-TSF-…` |

**Aturan parsing (regex canonical):** `^(?:(DRK|MGR|SPV|FRL)-)?(?:([A-Z]+)-)?(\d+)$` — capture pertama = role prefix (opsional), kedua = outlet (opsional, kosong untuk `MGR-001`/`DRK-001`), ketiga = nomor. Implementasi: `parseEmployeeId` di `lib/utils/roles.ts`.

**Migrasi `BTM` → `BTMK`:** outlet code lama `BTM` (Back To Mie Kitchen) di-rename jadi `BTMK` agar tidak overlap dengan ID staff `BTM-xxx`. Parser sheet otomatis menormalkan `BTM` lama menjadi `BTMK` lewat `normalizeOutletCode`/`normalizeEmployeeId` di `lib/utils/roles.ts`, sehingga data historis tetap bekerja meski sheet belum sepenuhnya dimigrasi.

**Valid Positions:**
```javascript
const VALID_POSITIONS = [
  "Manager Operasional & SDM",
  "Manager Keuangan",
  "Manager Inventory",
  "Manager Komersial",
  "Manager Rentcar",
  "Manager Konstruksi",
  "SPV Keuangan",
  "SPV Komersial",
  "SPV General Affair Kitchen",
  "SPV Wahana",
  "SPV Kebersihan dan Ketertiban",
  "SPV General Affair & Keamanan",
  "SPV Satwa",
  "SPV Konstruksi",
  "Kepala Media & Informasi",
  "Senior Staff Support",
  "Senior Staff Cashier",
  "Staff Waiters",
  "Staff Kitchen",
  "Staff Cassier",
  "Staff Cashier",
  "Staff support",
  "Freelance Support",
  "Freelance",
  "Staff",
  "Staff Mekanik",
  "Staff Proyek",
  "Apoteker",
  "Bidan",
  "Admin",
  "Asisten Dokter",
  "Labolatorium"
];
```

**Valid Outlets:**
```javascript
const VALID_OUTLETS = ["BTMK", "BTMF", "TSF", "MBA", "EGC", "HCP", "FRC", "ENC"];
```

#### Sheet: DB_Penilaian New
**Tujuan:** Menyimpan semua data penilaian dari penilai

**Struktur (dimulai dari Row 1):**
```
Row 1: Headers (HARUS SAMA persis)
A: Tanggal
B: Nama Penilai
C: Karyawan yang dinilai
D: Posisi
E: Outlet
F: Status
G: Komunikasi dengan rekan & atasan
H: Kerja sama tim
I: Tangung jawab & manajemen waktu
J: Inisiatif & penyelesaian masalah
K: Penguasaan tugas dan SOP
L: Ketelitian & kecepatan kerja
M: Kemampuan menggunakan alat dan sistem
N: Konsistensi Hasil kerja
O: Kedisiplinan dan kehadiran
P: Kepatuhan aturan & arahan
Q: Etika & Profesionalitas
R: Tanggung jawab lingkungan
S: Ramah terhadap pelanggan
T: Melaksanakan sholat
U: Melaksanakan Puasa
V: Total Point
W: Predikat

Row 2+: Rating Data
```

**Data Types:**
- Tanggal (datetime): format YYYY-MM-DD HH:mm:ss (auto-generated, jangan manual input)
- Nama Penilai (string): harus sama dengan employee ID dari Master_List
- Karyawan yang dinilai (string): harus sama dengan employee ID dari Master_List
- Posisi (string): auto-populated dari Master_List
- Outlet (string): auto-populated dari Master_List
- Status (string): auto-populated dari Master_List (hardcoded "Aktif")
- Komunikasi - Tanggung jawab lingkungan (string): enum [A, B, C, D, E]
- Melaksanakan sholat (string): enum [A, B, C, D, E, ""]
- Melaksanakan Puasa (string): enum [A, B, C, D, E, ""] (opsional, kosong jika bukan bulan Ramadan)
- Total Point (number): auto-calculated = (sum semua rating * 5) / jumlah kategori yang dinilai
- Predikat (string): auto-calculated berdasarkan Total Point

**Rating Scale:**
```javascript
const RATING_SCALE = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1
};

const GRADE_MAPPING = {
  5: "A",
  4: "B",
  3: "C",
  2: "D",
  1: "E"
};
```

**Total Point Calculation:**
```
1. Count kategori yang dinilai (bukan kosong)
2. Sum semua nilai numerik (A=5, B=4, C=3, D=2, E=1)
3. Bagi dengan jumlah kategori: Total Point = (Sum nilai) / (Jumlah kategori)
4. Predikat = GRADE_MAPPING[Math.round(Total Point)]

Contoh:
Kategori dinilai: 15 (semua kecuali puasa)
Nilai: A(5) + B(4) + A(5) + C(3) + B(4) + A(5) + A(5) + B(4) + A(5) + A(5) + B(4) + A(5) + B(4) + C(3) + A(5) = 67
Total Point = 67 / 15 = 4.47 → dibulatkan 4 → Predikat = B
```

---

## 3. BUSINESS RULES & AUTHORIZATION

### 3.1 User Roles & Authorization

#### Role: Manager
- **ID Penilai:** MGR-001, MGR-002, MGR-003, MGR-004
- **Hak Akses:**
  - ✅ Halaman Penilaian (Page 1)
  - ✅ Halaman Rekapan Nilai (Page 2)
  - ✅ Halaman Leaderboard (Page 3)
- **Authorization Login:** 
  - Username: Nama ID Karyawan (contoh: MGR-001)
  - Password: Hardcoded EGG2026

#### Role: Supervisor
- **ID Penilai:** BTM-003, BTM-010, BTMF-001, TSF-001, TSF-002, TSF-008, TSF-011, EGC-002
- **Hak Akses:**
  - ✅ Halaman Penilaian (Page 1) - hanya karyawan di outlet nya
  - ❌ Halaman Rekapan Nilai (Page 2) - TIDAK ADA AKSES
  - ✅ Halaman Leaderboard (Page 3) - public link
- **Authorization Login:**
  - Username: Nama ID Karyawan (contoh: BTM-003)
  - Password: Hardcoded EGG2026

#### Role: Public (Unauthenticated)
- **Hak Akses:**
  - ✅ Halaman Leaderboard (Page 3) - via public shareable link
  - ❌ Halaman Penilaian (Page 1)
  - ❌ Halaman Rekapan Nilai (Page 2)

### 3.2 Penilaian Rules

#### Manager menilai siapa?
- SPV dari 3 outlet: BTM, BTMF, TSF
- Karyawan dari 3 outlet: BTM, BTMF, TSF
- (Outlet lain akan ditambah kemudian)

#### Supervisor menilai siapa?
- Hanya karyawan yang berada di outlet yang sama dengan supervisor
- Tidak menilai diri sendiri
- Tidak menilai supervisor lain

**Query untuk mendapatkan target penilaian:**
```javascript
// Untuk Manager
// Ambil semua dari outlet BTM, BTMF, TSF yang bukan manager
// Filter: outlet IN [BTM, BTMF, TSF] AND id TIDAK IN [MGR-*]

// Untuk Supervisor (contoh TSF-001)
// Ambil semua dari outlet TSF yang bukan supervisor/manager
// Filter: outlet = TSF AND id TIDAK IN [TSF-001, MGR-*]
```

### 3.3 Data Editing Rules

#### Draft Saving (Local Storage)
- Penilai bisa save draft per karyawan secara lokal (localStorage)
- Draft key format: `rating_draft_[penilai_id]_[karyawan_id]`
- Draft bisa di-edit berkali-kali sebelum submit
- Draft auto-clear ketika form di-reset atau halaman refresh

#### Submit Data (ke Spreadsheet)
- Saat submit, data dikirim ke Google Sheets (DB_Penilaian New)
- Timestamp otomatis generated saat submit (tidak pakai draft timestamp)
- **Setelah submit:** data untuk karyawan tsb tidak bisa di-edit lagi (jika sudah ada di spreadsheet untuk periode bulan yang sama)
- Verifikasi sebelum submit: cek apakah sudah ada entry untuk [penilai_id] + [karyawan_id] + [bulan yang sama]

**Implementasi:**
```javascript
// Check function
async function checkIfAlreadyRated(penilai_id, karyawan_id, month, year) {
  const response = await fetchFromGoogleSheets('DB_Penilaian New');
  return response.some(row => 
    row['Nama Penilai'] === penilai_id &&
    row['Karyawan yang dinilai'] === karyawan_id &&
    getMonth(row['Tanggal']) === month &&
    getYear(row['Tanggal']) === year
  );
}

// Lock UI jika sudah dinilai
if (await checkIfAlreadyRated(...)) {
  // Disable edit mode
  // Show message: "Sudah dinilai pada [tanggal], tidak bisa diedit"
}
```

---

## 4. PAGE 1: HALAMAN PENILAIAN

### 4.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                                 │
│  Logo | "Penilaian Karyawan" | User Info | Logout      │
├─────────────────────────────────────────────────────────┤
│  FILTER SECTION                                         │
│  [Outlet Selector] [Posisi Filter] [Search Box]         │
├─────────────────────────────────────────────────────────┤
│  RATING CARDS CONTAINER                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  CARD 1 (Employee)                              │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ Nama: Aldyansyah Saputra                  │  │   │
│  │  │ Posisi: SPV Komersial                     │  │   │
│  │  │ Outlet: BTM                      [↓]      │  │   │
│  │  │                             Avg: 4.2 |[B]│  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  [COLLAPSED STATE] (default)                     │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  CARD 2 (Employee) - EXPANDED STATE             │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ Nama: Rizky Alfian                        │  │   │
│  │  │ Posisi: Staff Kitchen                     │  │   │
│  │  │ Outlet: BTM                      [↑]      │  │   │
│  │  │                             Avg: 3.8 |[C]│  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  RATING FORM (expanded)                          │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │ SOFT SKILL                              │    │   │
│  │  │ Komunikasi dgn rekan & atasan           │    │   │
│  │  │ [Dropdown: A | B | C | D | E] ← [C]    │    │   │
│  │  │ Kerja sama tim                          │    │   │
│  │  │ [Dropdown: A | B | C | D | E] ← [B]    │    │   │
│  │  │ ... (14 kategori lainnya)               │    │   │
│  │  │                                          │    │   │
│  │  │ IBADAH (Ramadan: show, Non-Ramadan: hide)   │   │
│  │  │ Melaksanakan sholat                     │    │   │
│  │  │ [Dropdown: A | B | C | D | E | -] ← [] │    │   │
│  │  │ Melaksanakan Puasa                      │    │   │
│  │  │ [Dropdown: A | B | C | D | E | -] ← [] │    │   │
│  │  │                                          │    │   │
│  │  │ [Draft] [Cancel]                         │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  CARD 3 (Employee)                              │   │
│  │  ... (sama seperti Card 1)                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ACTION SECTION (Bottom)                                │
│  [Reset] [Save All to Spreadsheet]                      │
├─────────────────────────────────────────────────────────┤
```

### 4.2 Header Component

**Props/State:**
- `currentUser`: object {id, name, role}
- `onLogout`: function

**Display:**
- Left: Logo + Title "Penilaian Karyawan"
- Center: Empty
- Right: "Penilai: [User Name]" + Logout button

**Code Structure:**
```typescript
interface HeaderProps {
  currentUser: {
    id: string;
    name: string;
    role: 'manager' | 'supervisor';
  };
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  // Implementation
};
```

### 4.3 Filter Section Component

**Props/State:**
- `selectedOutlet`: string (default: "")
- `selectedPosition`: string (default: "")
- `searchQuery`: string (default: "")
- `onFilterChange`: function
- `availableOutlets`: string[] (dari props atau fetch)
- `availablePositions`: string[] (filtered berdasarkan outlet)

**Display:**
- Outlet Dropdown (multi-select): [None selected (show all)]
- Position Filter (multi-select): [None selected (show all)]
- Search Box: placeholder "Cari nama karyawan..."

**Logic:**
- Outlet selector, ketika user ubah outlet, position list auto-filtered
- Search adalah real-time filtering untuk nama karyawan

**Code Structure:**
```typescript
interface FilterSectionProps {
  selectedOutlets: string[];
  selectedPositions: string[];
  searchQuery: string;
  onOutletChange: (outlets: string[]) => void;
  onPositionChange: (positions: string[]) => void;
  onSearchChange: (query: string) => void;
  availableOutlets: string[];
  availablePositions: string[];
}

export const FilterSection: React.FC<FilterSectionProps> = ({ ... }) => {
  // Implementation
};
```

### 4.4 Rating Card Component

**Props/State:**
```typescript
interface RatingCardProps {
  employee: {
    id: string;
    name: string;
    position: string;
    outlet: string;
    status: string;
  };
  ratingData: Record<string, string>; // kategori: nilai (A/B/C/D/E)
  isExpanded: boolean;
  isLocked: boolean; // true jika sudah di-submit bulan ini
  averageScore: number;
  averageGrade: string;
  onToggleExpand: (employeeId: string) => void;
  onRatingChange: (employeeId: string, kategori: string, nilai: string) => void;
  onSaveDraft: (employeeId: string, data: Record<string, string>) => void;
  onCancel: (employeeId: string) => void;
  isRamadan: boolean; // true jika bulan ramadan
}
```

**Collapsed State Display:**
```
┌─────────────────────────────────────────────────┐
│ Nama: [Name]                                    │
│ Posisi: [Position]                              │
│ Outlet: [Outlet]                      [↓]       │
│                             Avg: 4.2 | Grade   │
└─────────────────────────────────────────────────┘

Padding: 16px
Border: 1px solid #E5E7EB
Border-radius: 8px
Background: white
Cursor: pointer
Hover: background #F9FAFB
```

**Expanded State Display:**
```
┌─────────────────────────────────────────────────┐
│ Header Row                                      │
│ Nama: [Name]  Posisi: [Position]  Outlet: [O]  │
│ [↑]                           Avg: 4.2 | Grade │
├─────────────────────────────────────────────────┤
│                                                 │
│ SOFT SKILL (section header, bold)               │
│ ┌─────────────────────────────────────────┐    │
│ │ Label: "Komunikasi dengan rekan..."     │    │
│ │ [Dropdown Select: A | B | C | D | E]    │    │
│ │ (pilihan sebelumnya highlighted)        │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ Label: "Kerja sama tim"                 │    │
│ │ [Dropdown Select: A | B | C | D | E]    │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ... (13 kategori soft skill lainnya)            │
│                                                 │
│ HARD SKILL (section header, bold)               │
│ ┌─────────────────────────────────────────┐    │
│ │ Label: "Penguasaan tugas dan SOP"       │    │
│ │ [Dropdown Select: A | B | C | D | E]    │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ... (7 kategori hard skill lainnya)             │
│                                                 │
│ ATTITUDE (section header, bold)                 │
│ ┌─────────────────────────────────────────┐    │
│ │ Label: "Kedisiplinan dan kehadiran"    │    │
│ │ [Dropdown Select: A | B | C | D | E]    │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ... (5 kategori attitude lainnya)               │
│                                                 │
│ IBADAH (hanya show saat Ramadan)                │
│ ┌─────────────────────────────────────────┐    │
│ │ Label: "Melaksanakan sholat"            │    │
│ │ [Dropdown Select: A | B | C | D | E | -]    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ Label: "Melaksanakan Puasa"             │    │
│ │ [Dropdown Select: A | B | C | D | E | -]    │
│ └─────────────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│ [Save Draft] [Cancel]        {status message}   │
└─────────────────────────────────────────────────┘

Padding: 20px
Border: 2px solid #3B82F6
Border-radius: 8px
Background: #F0F9FF
```

**State Management:**
- Setiap card punya local state untuk ratings yang sedang diedit
- onRatingChange: update local state
- onSaveDraft: save ke localStorage + show toast "Draft tersimpan"
- onCancel: clear local state + close expanded

**Locked State (sudah dinilai):**
- Disable semua dropdown
- Show message: "Sudah dinilai pada [date]. Hubungi manager untuk revisi."
- Hide Save Draft & Cancel buttons
- Show values in read-only mode

### 4.5 Rating Categories Structure

**SOFT SKILL (5 kategori):**
1. Komunikasi dengan rekan & atasan
2. Kerja sama tim
3. Tangung jawab & manajemen waktu
4. Inisiatif & penyelesaian masalah
5. *SECTION BREAK*

**HARD SKILL (8 kategori):**
6. Penguasaan tugas dan SOP
7. Ketelitian & kecepatan kerja
8. Kemampuan menggunakan alat dan sistem
9. Konsistensi Hasil kerja
10. *SECTION BREAK*

**ATTITUDE (5 kategori):**
11. Kedisiplinan dan kehadiran
12. Kepatuhan aturan & arahan
13. Etika & Profesionalitas
14. Tanggung jawab lingkungan
15. Ramah terhadap pelanggan
16. *SECTION BREAK*

**IBADAH (2 kategori, show only Ramadan):**
17. Melaksanakan sholat (required saat Ramadan)
18. Melaksanakan Puasa (required saat Ramadan)

**Data Structure:**
```typescript
interface RatingCategory {
  id: string; // unique identifier
  label: string; // display name
  section: 'SOFT_SKILL' | 'HARD_SKILL' | 'ATTITUDE' | 'IBADAH';
  required: boolean; // false untuk ibadah
  displayOrder: number;
}

const RATING_CATEGORIES: RatingCategory[] = [
  { id: 'komunikasi', label: 'Komunikasi dengan rekan & atasan', section: 'SOFT_SKILL', required: true, displayOrder: 1 },
  { id: 'kerja_sama', label: 'Kerja sama tim', section: 'SOFT_SKILL', required: true, displayOrder: 2 },
  // ... dst
];
```

### 4.6 Action Section (Bottom)

**Display:**
- Left: [Reset Button] - reset semua draft di halaman ini
- Right: [Save All to Spreadsheet] - submit semua rating ke sheets

**Reset Button Behavior:**
- Konfirmasi: "Apakah anda yakin ingin reset semua draft? Data tidak bisa dikembalikan."
- Clear localStorage untuk semua draft current penilai
- Clear all card states
- Close all expanded cards

**Save All Button Behavior:**
```
1. Validate:
   - Cek apakah semua card yang akan disubmit sudah dinilai di kategori required
   - Cek apakah sudah ada penilaian untuk [penilai] + [karyawan] + [bulan ini]
   
2. Jika ada validation error:
   - Show toast/alert dengan detail error
   - STOP, jangan lanjut

3. Jika valid:
   - Show confirmation: "Anda akan menyimpan penilaian untuk [X] karyawan. Pastikan semua data sudah benar."
   - Ada checkbox: "Saya sudah cek semua data"
   - [Cancel] [Submit] buttons

4. Saat Submit:
   - Show loading spinner
   - Siapkan data untuk setiap card:
     a. Ambil rating data dari localStorage/state
     b. Get employee info dari Master_List
     c. Hitung Total Point dan Predikat
     d. Generate timestamp (NOW)
     e. Buat row: [Tanggal, Nama Penilai, Karyawan dinilai, Posisi, Outlet, Status, rating1, rating2, ..., Total Point, Predikat]
   - Append semua rows ke DB_Penilaian New sheet
   - Jika sukses:
     a. Show toast: "Berhasil menyimpan penilaian [X] karyawan"
     b. Clear semua draft dari localStorage
     c. Reset semua card state
     d. Close expanded cards
   - Jika error:
     a. Show error alert dengan detail error
     b. Draft tetap tersimpan di localStorage (user bisa retry)
```

**Code Structure:**
```typescript
async function handleSaveAll(drafts: DraftRecord[]) {
  // Validation logic
  const validationErrors = validateDrafts(drafts);
  if (validationErrors.length > 0) {
    showError(validationErrors.join('\n'));
    return;
  }

  // Confirmation
  const confirmed = await showConfirmDialog(
    `Anda akan menyimpan penilaian untuk ${drafts.length} karyawan...`
  );
  if (!confirmed) return;

  // Prepare rows
  const rows = drafts.map(draft => {
    const employeeInfo = getEmployeeInfo(draft.employeeId);
    const ratings = draft.ratings;
    const totalPoint = calculateTotalPoint(ratings);
    const predikat = calculatePredikat(totalPoint);
    
    return [
      new Date().toISOString(),
      draft.penilaiByteName, // atau ambil dari auth
      draft.employeeId,
      employeeInfo.position,
      employeeInfo.outlet,
      'Aktif',
      // ... rating columns
      totalPoint,
      predikat
    ];
  });

  // Submit to Google Sheets
  try {
    await appendRowsToSheet('DB_Penilaian New', rows);
    showSuccess(`Berhasil menyimpan penilaian ${drafts.length} karyawan`);
    clearAllDrafts();
    resetUIState();
  } catch (error) {
    showError(`Gagal menyimpan: ${error.message}`);
  }
}
```

### 4.7 Page Logic & Flow

**Mount/Initial Load:**
1. Check auth token, redirect ke login jika tidak ada
2. Fetch Master_List dari Google Sheets
3. Filter karyawan berdasarkan role penilai:
   - Manager: semua karyawan dari outlet BTM, BTMF, TSF (exclude manager)
   - Supervisor: karyawan dari outlet nya sendiri (exclude supervisor/manager)
4. Fetch DB_Penilaian New untuk check siapa yang sudah dinilai bulan ini
5. Load draft dari localStorage untuk current penilai
6. Set isRamadan flag (check bulan saat ini)
7. Render cards

**Card Open/Close:**
- onClick card header: toggle isExpanded state for that card
- Max 1 card expanded at a time (OR allow multiple, tergantung UX)

**Draft Management:**
- onRatingChange: update local state + auto-save ke localStorage (setiap 5 detik atau on change)
- localStorage key: `rating_draft_${penilaiByteName}_${employeeId}`
- localStorage value: JSON stringified {ratings: Record<string, string>}

**Average Calculation:**
```typescript
function calculateAverageScore(ratings: Record<string, string>): number {
  const values = Object.values(ratings)
    .filter(v => v && ['A', 'B', 'C', 'D', 'E'].includes(v))
    .map(v => RATING_SCALE[v]);
  
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getGradeFromScore(score: number): string {
  return GRADE_MAPPING[Math.round(score)];
}
```

---

## 5. PAGE 2: HALAMAN REKAPAN NILAI

### 5.1 Access Control
- Only Manager accessible
- Password protected: EGG2026
- If Supervisor atau Public try access: redirect to login dengan message "Anda tidak memiliki akses ke halaman ini"

### 5.2 Layout Structure

```
┌─────────────────────────────────────────────────┐
│  HEADER (sama seperti Page 1)                   │
├─────────────────────────────────────────────────┤
│  FILTER SECTION                                 │
│  [Date Range Picker] [Outlet Filter] [Status]   │
├─────────────────────────────────────────────────┤
│  SUMMARY STATS                                  │
│  Total Dinilai: 45 | Pending: 12 | Completed: 33
├─────────────────────────────────────────────────┤
│  RECAP TABLE                                    │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │ No | Nama | Outlet | Posisi | Rata² | Pts │ │
│  ├────────────────────────────────────────────┤ │
│  │ 1  │ Aldyansyah... │ BTM   │ SPV... │ 4.2 │ 21 │
│  │    │ [v] expand    │       │        │     │    │
│  │    │ ┌──────────────────────────────────┐ │
│  │    │ │ Penilai 1: 4.3 | Penilai 2: 4.1  │ │
│  │    │ │ Penilai 3: 4.0 |                  │ │
│  │    │ └──────────────────────────────────┘ │
│  ├────────────────────────────────────────────┤ │
│  │ 2  │ Rizky Alfian  │ BTM   │ Staff... │ 3.8 │ 19 │
│  │    │ [v] expand    │       │        │     │    │
│  │    │ ┌──────────────────────────────────┐ │
│  │    │ │ Penilai 1: 3.9 | Penilai 2: 3.7  │ │
│  │    │ └──────────────────────────────────┘ │
│  ├────────────────────────────────────────────┤ │
│  │ 3  │ Kurnia Putri  │ BTM   │ Staff... │ 3.6 │ 18 │
│  │    │ [v] expand    │       │        │     │    │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  Pagination: [< Prev] [1] [2] [3] [> Next]     │
├─────────────────────────────────────────────────┤
│ [Export to CSV] [Export to PDF]                 │
└─────────────────────────────────────────────────┘
```

### 5.3 Data Source & Logic

**Data Source:**
- Fetch dari DB_Penilaian New
- Filter berdasarkan date range, outlet, status

**Data Transformation:**
```typescript
// Raw data dari sheet punya duplicate (1 karyawan dinilai 2+ penilai = 2+ rows)
// Perlu di-group dan aggregate:

interface RecapRow {
  no: number;
  employeeId: string;
  employeeName: string;
  outlet: string;
  position: string;
  raters: RaterDetail[]; // siapa aja yang menilai
  averageScore: number; // rata2 dari semua penilai
  totalPoints: number;
  isExpanded: boolean;
}

interface RaterDetail {
  raterName: string;
  raterId: string;
  averageScore: number;
  submittedDate: string;
}

// Grouping logic:
const groupByEmployee = (rows: SheetRow[]): RecapRow[] => {
  const grouped = new Map<string, SheetRow[]>();
  
  rows.forEach(row => {
    const key = row['Karyawan yang dinilai'];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  });

  return Array.from(grouped.entries()).map(([employeeId, sheetRows]) => ({
    employeeId,
    employeeName: sheetRows[0]['Karyawan yang dinilai'], // ambil dari first row
    outlet: sheetRows[0]['Outlet'],
    position: sheetRows[0]['Posisi'],
    raters: sheetRows.map(row => ({
      raterName: row['Nama Penilai'],
      raterId: row['Nama Penilai'],
      averageScore: calculateScore(row),
      submittedDate: row['Tanggal']
    })),
    averageScore: calculateAverageAcrossRaters(sheetRows),
    totalPoints: calculateTotalPoints(sheetRows),
    isExpanded: false
  }));
};
```

### 5.4 Filter Section

**Date Range Picker:**
- Use date range input (start date - end date)
- Default: current month (1st day - last day)
- Label: "Periode Penilaian"

**Outlet Filter:**
- Multi-select dropdown
- Options: [BTM, BTMF, TSF, MBA, EGC, HCP, FRC]
- Default: empty (show all)

**Status Filter:**
- Single select dropdown
- Options: [Semua, Lengkap (semua SPV dan karyawan outlet dinilai), Pending (ada yang belum dinilai)]
- Default: Semua

### 5.5 Summary Stats Component

**Display:**
```
Total Dinilai: 45 | Pending: 12 | Completed: 33 (73%)
```

**Calculation:**
- Total Dinilai: unique employee count yang punya minimal 1 rating
- Completed: unique employee count yang punya 2+ rating atau semua rater yg seharusnya menilai sudah menilai
- Pending: total karyawan yang seharusnya dinilai - yang sudah dinilai

### 5.6 Recap Table

**Columns:**
- No: row number
- Nama: nama karyawan + [v] expand icon
- Outlet: outlet karyawan
- Posisi: posisi karyawan
- Rata²: rata-rata score across all raters, format 0.0
- Pts: total points, rounded integer

**Expand Behavior:**
- onClick row: toggle isExpanded
- Expanded row shows detail raters dalam sub-row:
  ```
  | Penilai 1 | 4.3 | Tanggal: 2026-04-15 |
  | Penilai 2 | 4.1 | Tanggal: 2026-04-16 |
  | Penilai 3 | 4.0 | Tanggal: 2026-04-17 |
  ```

**Sorting:**
- Default: by average score DESC (highest first)
- Clickable column headers: sort by that column

**Pagination:**
- Show 10 rows per page
- Add pagination controls at bottom

### 5.7 Export Functionality

**Export to CSV:**
- Include: No | Nama | Outlet | Posisi | Rata² | Pts | Penilai (comma-separated)
- Filename: `Rekapan_Nilai_${month}_${year}.csv`

**Export to PDF:**
- Format: table with summary stats at top
- Include date range on header
- Filename: `Rekapan_Nilai_${month}_${year}.pdf`

---

## 6. PAGE 3: HALAMAN LEADERBOARD

### 6.1 Access Control
- Public: bisa diakses dengan shareable link (no auth required)
- URL format: `/leaderboard?key=[unique_key]` atau `/public/leaderboard`
- Bisa diakses dari authenticated session juga

### 6.2 Layout Structure

```
┌─────────────────────────────────────────────────┐
│  PUBLIC HEADER (no logout)                      │
│  Logo | "Leaderboard Karyawan" | Tanggal update │
├─────────────────────────────────────────────────┤
│  PERIOD SELECTOR                                │
│  Bulan: [April 2026 ▼] | Update: 2026-04-17    │
├─────────────────────────────────────────────────┤
│  LEADERBOARD TABLE                              │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │ Rank │ Nama │ Outlet │ Pos │ Rata² │ Point │ │
│  ├────────────────────────────────────────────┤ │
│  │ 🥇 1 │ Aldyansyah Saputra │ BTM │ SPV... │4.2│ 21 │
│  │ 🥈 2 │ Sabilla Eka Safitri│ BTMF│ Staff..│4.1│ 20 │
│  │ 🥉 3 │ Ahmad Tasripin     │ TSF │ Staff..│4.0│ 20 │
│  │    4 │ Rizky Alfian       │ BTM │ Staff..│3.8│ 19 │
│  │    5 │ Sarah              │ BTMF│ Staff..│3.7│ 18 │
│  │ ...  │ ...                │ ... │ ...    │...│ ...│
│  │   45 │ Aldi Fauzan        │ TSF │ Staff..│2.1│ 10 │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  OUTLET STATS (bottom)                          │
│  ┌─────┬─────┬─────┬─────┐                     │
│  │ BTM │BTMF │ TSF │ Avg │                     │
│  ├─────┼─────┼─────┼─────┤                     │
│  │ 4.0 │ 4.1 │ 3.9 │ 4.0 │                     │
│  └─────┴─────┴─────┴─────┘                     │
└─────────────────────────────────────────────────┘
```

### 6.3 Data Source & Calculation

**Data Source:**
- Fetch dari DB_Penilaian New
- Group by employee (sama seperti Page 2)
- Filter berdasarkan selected period (bulan)

**Important Calculation (Handle Data Fairness):**

Masalah: Jumlah penilai berbeda per outlet → rata-rata bisa unfair
Contoh: BTM ada 1 penilai, TSF ada 3 penilai → TSF unfair punya rata2 lebih tinggi

Solusi: **Normalize per outlet terlebih dahulu**

```typescript
interface OutletStats {
  outlet: string;
  employees: EmployeeRating[];
  averageScore: number;
  totalRatings: number;
}

interface EmployeeRating {
  employeeId: string;
  employeeName: string;
  outlet: string;
  position: string;
  ratingCount: number; // berapa penilai yang menilai
  rawAverage: number; // rata2 dari penilai
  outletNormalizedScore: number; // raw average - outlet average + global average
  totalPoints: number;
}

// Algorithm:
1. Group by outlet, hitung outlet average:
   outletAvg = sum(rawAverage all employees) / count(employees)
   
2. Hitung global average:
   globalAvg = sum(outletAvg) / count(outlets)
   
3. Untuk setiap employee:
   normalizedScore = (rawAverage - outletAvg) + globalAvg
   
Contoh:
Outlet BTM: rawAvg employees = [4.5, 4.2, 4.1] → outletAvg = 4.27
Outlet TSF: rawAvg employees = [4.8, 4.5, 4.2, 4.0] → outletAvg = 4.38
GlobalAvg = (4.27 + 4.38) / 2 = 4.325

Employee A (outlet BTM, rawAvg 4.5):
  normalizedScore = (4.5 - 4.27) + 4.325 = 4.555
  
Employee B (outlet TSF, rawAvg 4.5):
  normalizedScore = (4.5 - 4.38) + 4.325 = 4.445
  
Sekarang bisa fair dibanding
```

**Code Implementation:**
```typescript
function calculateNormalizedLeaderboard(rawData: SheetRow[]): EmployeeRating[] {
  // Group by outlet
  const byOutlet = groupByOutlet(rawData);
  
  // Calculate outlet averages
  const outletStats = new Map<string, {avg: number, employees: any[]}>();
  byOutlet.forEach((employees, outlet) => {
    const avg = employees.reduce((sum, emp) => sum + emp.rawAvg, 0) / employees.length;
    outletStats.set(outlet, {avg, employees});
  });
  
  // Calculate global average
  const globalAvg = Array.from(outletStats.values())
    .reduce((sum, stat) => sum + stat.avg, 0) / outletStats.size;
  
  // Calculate normalized scores
  const normalized: EmployeeRating[] = [];
  outletStats.forEach((stat, outlet) => {
    stat.employees.forEach(emp => {
      normalized.push({
        ...emp,
        normalizedScore: (emp.rawAvg - stat.avg) + globalAvg,
        totalPoints: Math.round((emp.rawAvg - stat.avg) + globalAvg) * 5
      });
    });
  });
  
  // Sort by normalized score DESC
  return normalized.sort((a, b) => b.normalizedScore - a.normalizedScore);
}
```

### 6.4 Leaderboard Display

**Columns:**
- Rank: 1, 2, 3, ... dengan medal icon (🥇🥈🥉)
- Nama: nama lengkap
- Outlet: outlet code
- Posisi: posisi lengkap (truncate jika perlu)
- Rata²: average score, format X.X
- Points: total points, integer

**Ranking:**
- Hitung berdasarkan normalized score
- Jika score sama: bisa skip rank (1, 2, 2, 4) atau tie (1, 2, 2, 2)
- Gunakan skip rank approach

**Row Styling:**
- Rank 1-3: highlight dengan background color
  - 1st: gold-ish background
  - 2nd: silver-ish background
  - 3rd: bronze-ish background
- Hover: slight background change

### 6.5 Period Selector

**Display:**
- Dropdown: "Bulan: [April 2026 ▼]"
- Show: "Update: 2026-04-17" (latest timestamp dari sheet)

**Options:**
- Last 12 months + current month
- Default: current month
- Pada change: reload data untuk periode baru

### 6.6 Outlet Stats Footer

**Display:**
```
Rata-rata per Outlet:
┌─────────┬──────┐
│ Outlet  │ Rata²│
├─────────┼──────┤
│ BTM     │ 4.0  │
│ BTMF    │ 4.1  │
│ TSF     │ 3.9  │
│ Overall │ 4.0  │
└─────────┴──────┘
```

**Calculation:**
- Per outlet: average rawAverage (sebelum normalisasi)
- Overall: global average

---

## 7. AUTHENTICATION & LOGIN PAGE

### 7.1 Login Page Layout

```
┌─────────────────────────────────────────┐
│                                         │
│         Logo / Title                    │
│                                         │
│    "Sistem Penilaian Karyawan"          │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │ Username                        │  │
│    │ [___________________]           │  │
│    │                                 │  │
│    │ Password                        │  │
│    │ [___________________]           │  │
│    │                                 │  │
│    │ [Remember me]                   │  │
│    │                                 │  │
│    │ [Login]                         │  │
│    │                                 │  │
│    │ Error message (if any)          │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### 7.2 Login Logic

**Pendeteksian role berbasis prefix ID + posisi (data-driven):**

Username harus berupa Employee ID dari Master_List. Role otomatis ditentukan dari ID prefix dan kolom `Posisi Spesifik` (lihat `lib/utils/roles.ts` → `resolveRole`).

```typescript
// Pseudocode (implementasi sebenarnya di lib/utils/roles.ts)
function resolveRole({ id, position }) {
  if (id.startsWith('DRK-') || DIRECTORS.includes(id)) return 'direksi';
  if (id === 'admin.media@easygoing.id' ||
      id.startsWith('MGR-') ||
      position?.toUpperCase().includes('MANAGER')) return 'manager';
  if (id.startsWith('SPV-') ||
      position?.toUpperCase().includes('SPV')) return 'supervisor';
  return null; // staff & freelance bukan penilai
}
```

**Password per role (single source of truth — `ROLE_PASSWORDS` di `lib/utils/constants.ts`):**

| Role | Password |
|---|---|
| Direksi (`DRK-*`) | `EGG_DIREKSI2026` |
| Manager (`MGR-*` atau posisi mengandung `MANAGER`) | `EGG_MANAGER2026` |
| Supervisor (`SPV-*` atau posisi mengandung `SPV`) | `EGG2026` |

Setiap user yang ditambahkan ke Master_List dengan ID berprefix yang sesuai otomatis dapat login — tidak perlu update tabel kredensial. Staff (`BTMK-*`, `BTMF-*`, dll. tanpa prefix peran) dan freelance (`FRL-*`) **tidak** dapat login.

**Session Management:**
- Store JWT token di localStorage + httpOnly cookie (jika bisa)
- Token payload: {userId, role, name, loginTime}
- Token expiry: 24 hours (atau lebih long, tergantung preference)
- On logout: clear token

**Protect Routes:**
```typescript
// Middleware untuk check auth
export const withAuth = (Component) => {
  return (props) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return <redirect to="/login" />;
    }
    return <Component {...props} />;
  };
};

// Middleware untuk check role
export const withRole = (Component, requiredRole) => {
  return (props) => {
    const token = localStorage.getItem('auth_token');
    const decoded = decodeToken(token);
    
    if (decoded.role !== requiredRole) {
      return <redirect to="/" message="Akses ditolak" />;
    }
    
    return <Component {...props} />;
  };
};
```

---

## 8. GOOGLE SHEETS INTEGRATION

### 8.1 Google Sheets API Setup

**Scope diperlukan:**
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.readonly`

**Authentication Method:**
- Service Account (untuk backend) atau OAuth 2.0 (untuk frontend)
- Rekomendasi: Service Account via backend API route

**Sheet ID:**
- Ambil dari URL Google Sheets
- Format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

### 8.2 API Routes untuk Google Sheets

**Backend Routes (Next.js API Routes):**

```
GET  /api/sheets/master-list
     → Fetch Master_List sheet
     
GET  /api/sheets/penilaian
     → Fetch DB_Penilaian New sheet
     
POST /api/sheets/append
     → Append rows ke DB_Penilaian New
     Request body:
     {
       sheetName: 'DB_Penilaian New',
       rows: [
         [tanggal, nama_penilai, karyawan, posisi, outlet, status, rating1, ..., totalPoint, predikat]
       ]
     }
```

### 8.3 Google Sheets API Client

**Setup di backend:**
```typescript
import {google} from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SHEETS_KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({version: 'v4', auth});
```

**Fetch Master_List:**
```typescript
async function getMasterList() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'Master_List!A1:E1000'
  });
  
  const rows = response.data.values;
  const headers = rows[0];
  
  return rows.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    position: row[2],
    outlet: row[3],
    status: row[4]
  }));
}
```

**Fetch DB_Penilaian New:**
```typescript
async function getPenilaianData(startDate?: string, endDate?: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'DB_Penilaian New!A1:W1000'
  });
  
  const rows = response.data.values;
  const headers = rows[0];
  
  let data = rows.slice(1).map(row => ({
    tanggal: row[0],
    namaPenilai: row[1],
    karyawanDinilai: row[2],
    posisi: row[3],
    outlet: row[4],
    status: row[5],
    komunikasi: row[6],
    kerja_sama: row[7],
    // ... dst
    totalPoint: row[21],
    predikat: row[22]
  }));
  
  // Filter by date range jika ada
  if (startDate && endDate) {
    data = data.filter(d => {
      const date = new Date(d.tanggal);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  }
  
  return data;
}
```

**Append to DB_Penilaian New:**
```typescript
async function appendPenilaian(rows: any[][]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'DB_Penilaian New!A2:W',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: rows
    }
  });
}
```

---

## 9. UI/UX SPECIFICATIONS

### 9.1 Design System

**Color Palette (Light Theme):**
```
Primary: #3B82F6 (Blue)
Primary Dark: #1E40AF
Success: #10B981 (Green)
Warning: #F59E0B (Orange)
Error: #EF4444 (Red)
Neutral 50: #F9FAFB
Neutral 100: #F3F4F6
Neutral 200: #E5E7EB
Neutral 300: #D1D5DB
Neutral 400: #9CA3AF
Neutral 500: #6B7280
Neutral 600: #4B5563
Neutral 700: #374151
Neutral 800: #1F2937
Neutral 900: #111827
```

**Typography:**
- Font Family: Inter, -apple-system, BlinkMacSystemFont, sans-serif
- Base Font Size: 16px (1rem)
- Body: 400, 16px, line-height: 1.5
- Small: 400, 14px
- H1: 700, 32px
- H2: 700, 24px
- H3: 600, 20px
- H4: 600, 16px

**Spacing:**
- Use 4px baseline (4, 8, 12, 16, 20, 24, 32, 40, 48, ...)

**Border Radius:**
- Small: 4px
- Medium: 8px (default)
- Large: 12px
- Full: 9999px

**Shadows:**
```
sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

### 9.2 Component Specifications

**Button:**
- Padding: 10px 16px (small), 12px 20px (medium)
- Border Radius: 8px
- Font Weight: 600
- Hover: brightness increase 5%
- Disabled: opacity 50%, cursor not-allowed
- Variants: primary (blue), secondary (gray), danger (red)

**Input:**
- Padding: 10px 12px
- Border: 1px solid #D1D5DB
- Border Radius: 8px
- Font Size: 16px
- Focus: border-color #3B82F6, outline none, box-shadow 0 0 0 3px rgba(59, 130, 246, 0.1)
- Disabled: background #F3F4F6, cursor not-allowed

**Dropdown/Select:**
- Same as input
- Icon: chevron-down on right
- Menu: position absolute, z-index 10, background white, border 1px #D1D5DB

**Checkbox:**
- Size: 20px × 20px
- Border: 2px solid #D1D5DB
- Border Radius: 4px
- Checked: background #3B82F6, checkmark white

**Modal/Dialog:**
- Fixed position, center
- Backdrop: background rgba(0,0,0,0.5)
- Modal: background white, border radius 12px, shadow lg
- Content padding: 24px

**Toast/Alert:**
- Position: top-right
- Padding: 16px
- Border Radius: 8px
- Auto-dismiss: 4 seconds
- Variants: success (green), error (red), info (blue), warning (orange)

### 9.3 Responsive Design

**Breakpoints:**
- Mobile: 0-640px (default)
- Tablet: 641-1024px
- Desktop: 1025px+

**Mobile Optimizations:**
- Single column layout
- Larger touch targets (min 44px × 44px)
- Simplified navigation
- Collapse complex sections

---

## 10. ERROR HANDLING & VALIDATION

### 10.1 Form Validation

**Client-side:**
- Validate required fields
- Validate data types
- Show inline error messages

**Server-side:**
- Validate all inputs
- Check authentication/authorization
- Validate Google Sheets constraints

### 10.2 Error Messages

**User-Friendly Messages:**
- Jangan tampilkan technical error
- Translate error codes to indonesian messages
- Sertakan actionable suggestions

**Contoh:**
```
❌ "Gagal menyimpan penilaian"
✅ "Gagal menyimpan penilaian. Pastikan koneksi internet aktif, atau hubungi administrator."
```

### 10.3 Loading States

- Show spinner/skeleton saat fetch data
- Disable button saat loading
- Show progress untuk operasi lama

### 10.4 Retry Logic

- Auto-retry failed API calls (3 attempts)
- Exponential backoff (1s, 2s, 4s)
- Show retry button jika failed

---

## 11. TESTING REQUIREMENTS

### 11.1 Unit Tests
- Calculation functions (total points, grade, normalization)
- Validation functions
- Data transformation functions

### 11.2 Integration Tests
- Google Sheets API integration
- Authentication flow
- Form submission flow

### 11.3 E2E Tests
- Complete user flow untuk setiap role
- All three pages
- Happy path + error scenarios

---

## 12. DEPLOYMENT & DEVOPS

### 12.1 Vercel Setup

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api.domain.com
GOOGLE_SHEETS_ID=...
GOOGLE_SHEETS_KEY_FILE=...
JWT_SECRET=...
ENVIRONMENT=production
```

**Build Command:**
```
npm run build
```

**Start Command:**
```
npm start
```

### 12.2 Performance Optimization

- Code splitting per page
- Image optimization
- API response caching (Client-side: 5 min, Server-side: 1 hour)
- Database query optimization (batch reads)

### 12.3 Monitoring & Logging

- Track API response times
- Log errors ke service (Sentry, LogRocket)
- Monitor Google Sheets API quota usage

---

## 13. FUTURE ENHANCEMENTS (Out of Scope)

1. Integration dengan database SQL (PostgreSQL) instead of Google Sheets
2. Real-time collaboration (Supervisor bisa lihat draft penilai lain)
3. Mobile app (React Native)
4. Email notifications untuk submit/deadline
5. Audit trail untuk setiap perubahan data
6. Custom rating categories per outlet
7. Comparative analysis tools
8. Integration dengan HR system lainnya

---

## APPENDIX A: DETAILED RATING CATEGORIES

### SOFT SKILL
1. **Komunikasi dengan rekan & atasan**
   - Kemampuan berkomunikasi jelas dan efektif

2. **Kerja sama tim**
   - Kolaborasi dan teamwork

3. **Tangung jawab & manajemen waktu**
   - Accountability dan time management

4. **Inisiatif & penyelesaian masalah**
   - Problem solving dan initiative

5. **(Placeholder untuk future expansion)**

### HARD SKILL
6. **Penguasaan tugas dan SOP**
   - Technical skill dan SOP compliance

7. **Ketelitian & kecepatan kerja**
   - Accuracy dan speed

8. **Kemampuan menggunakan alat dan sistem**
   - Tool proficiency

9. **Konsistensi Hasil kerja**
   - Work consistency

10-13. **(Placeholder untuk future expansion)**

### ATTITUDE
11. **Kedisiplinan dan kehadiran**
    - Discipline dan attendance

12. **Kepatuhan aturan & arahan**
    - Compliance with rules

13. **Etika & Profesionalitas**
    - Professional ethics

14. **Tanggung jawab lingkungan**
    - Environmental responsibility

15. **Ramah terhadap pelanggan**
    - Customer friendliness

### IBADAH (Ramadan only)
16. **Melaksanakan sholat**
    - Prayer observance

17. **Melaksanakan Puasa**
    - Fasting observance

---

## APPENDIX B: SAMPLE DATA STRUCTURE FOR API RESPONSES

### GET /api/sheets/master-list
```json
{
  "success": true,
  "data": [
    {
      "id": "BTM-003",
      "name": "Fadillah Riska Pratama",
      "position": "SPV Keuangan",
      "outlet": "BTM",
      "status": "Aktif"
    },
    {
      "id": "BTM-001",
      "name": "Mochammad Irfan Hilmi",
      "position": "Kepala Media & Informasi",
      "outlet": "BTM",
      "status": "Aktif"
    }
  ]
}
```

### GET /api/sheets/penilaian?startDate=2026-04-01&endDate=2026-04-30
```json
{
  "success": true,
  "data": [
    {
      "tanggal": "2026-04-15 10:30:00",
      "namaPenilai": "MGR-001",
      "karyawanDinilai": "BTM-003",
      "posisi": "SPV Keuangan",
      "outlet": "BTM",
      "status": "Aktif",
      "komunikasi": "A",
      "kerja_sama": "B",
      "tanggung_jawab": "A",
      "inisiatif": "A",
      "penguasaan_sop": "B",
      "ketelitian": "A",
      "kemampuan_tool": "B",
      "konsistensi": "A",
      "kedisiplinan": "A",
      "kepatuhan": "B",
      "etika": "A",
      "lingkungan": "B",
      "ramah_pelanggan": "A",
      "sholat": "A",
      "puasa": "A",
      "totalPoint": 4.3,
      "predikat": "A"
    }
  ]
}
```

### POST /api/sheets/append
```json
{
  "sheetName": "DB_Penilaian New",
  "rows": [
    [
      "2026-04-17 15:45:00",
      "MGR-001",
      "BTM-010",
      "SPV Komersial",
      "BTM",
      "Aktif",
      "A",
      "B",
      "A",
      "A",
      "B",
      "A",
      "B",
      "A",
      "A",
      "B",
      "A",
      "B",
      "A",
      "A",
      "B",
      4.2,
      "B"
    ]
  ]
}
```

---

**END OF PRD**

Document Status: ✅ Complete and ready for development
Last Updated: April 17, 2026
