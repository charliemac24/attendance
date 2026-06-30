import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import LoginPage from "@/pages/login";
import GateKiosksPage from "@/pages/gate-kiosks";
import { LogOut } from "lucide-react";

type SchoolBrandingResponse = {
  school: {
    id: number;
    name: string;
    loginSlug: string | null;
    logoUrl: string | null;
  } | null;
  displayName: string;
  logoUrl: string | null;
};

export default function MobileScannerPage() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const schoolParam = new URLSearchParams(window.location.search).get("school")?.trim() || "";

  const { data: branding } = useQuery<SchoolBrandingResponse>({
    queryKey: ["/api/public/school-branding", schoolParam],
    queryFn: async () => {
      const qs = schoolParam ? `?school=${encodeURIComponent(schoolParam)}` : "";
      const res = await fetch(`/api/public/school-branding${qs}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load school branding");
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-2xl bg-emerald-500" />
          <p className="text-sm text-slate-300">Loading scanner...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!["super_admin", "school_admin", "gate_staff"].includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <Card className="w-full max-w-sm border-slate-800 bg-slate-900 text-white">
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="text-lg font-semibold">Scanner access required</h1>
            <p className="text-sm text-slate-300">
              This mobile app is only available to gate staff and school admins.
            </p>
            <Button className="w-full" onClick={() => setLocation("/")}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={`${branding.displayName} logo`}
                className="h-12 w-12 rounded-2xl bg-white/5 object-contain p-1"
              />
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                {schoolParam ? branding?.displayName?.replace(/ School Attendance$/i, " Attendance") || "Attendance" : "MYO Attendance"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="border border-slate-800 text-slate-200 hover:bg-slate-900"
            onClick={() => logout()}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="[&_h1]:text-white [&_p]:text-slate-300 [&_[data-testid='text-kiosk-scanner-title']]:text-3xl [&_.border]:border-slate-800 [&_.bg-black\\/90]:bg-black [&_.bg-primary\\/10]:bg-emerald-500/10 [&_.text-primary]:text-emerald-300">
          <GateKiosksPage />
        </div>
      </div>
    </div>
  );
}
