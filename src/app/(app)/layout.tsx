import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 pb-20">
        <main className="mx-auto max-w-2xl px-4 py-6">
          {children}
        </main>
        <Nav />
      </div>
    </ToastProvider>
  );
}
