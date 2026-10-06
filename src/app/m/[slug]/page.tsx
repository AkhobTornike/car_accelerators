import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AdminApp from '@/components/admin/AdminApp';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!process.env.ADMIN_PATH || slug !== process.env.ADMIN_PATH) notFound();
  return (
    <main className="admin-page">
      <div className="wrap">
        <AdminApp />
      </div>
    </main>
  );
}
