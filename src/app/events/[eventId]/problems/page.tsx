import { RealtimeProblemsList } from "@/components/problems/RealtimeProblemsList";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ProblemsPage({ params }: PageProps) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const session = await getSession();
  const solverUserId = session?.role === "solver" ? session.userId : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 pb-6 border-b border-rp-border">
        <p className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-1">Problems</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-rp-100">問題一覧</h1>
      </div>
      <RealtimeProblemsList eventId={eventId} solverUserId={solverUserId} />
    </div>
  );
}
