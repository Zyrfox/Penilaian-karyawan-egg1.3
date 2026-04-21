import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Penilaian Karyawan | ERS',
  description: 'Employee Rating System implemented safely and powerfully.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
