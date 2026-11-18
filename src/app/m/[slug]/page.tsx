import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AdminApp from '@/components/admin/AdminApp';
import { validAdminSegments } from '@/server/admin-path';
import { getAdminEpoch } from '@/server/security-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // The proxy already gates /m/*; this is the same check again so the page never renders for a wrong segment.
  if (!slug || !validAdminSegments(process.env, new Date(), await getAdminEpoch()).includes(slug)) notFound();
  return (
    <main className="admin-page">
      <div className="wrap">
        <AdminApp />
      </div>
    </main>
  );
}
