import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScanLine } from "lucide-react";

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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username, password);
      const params = new URLSearchParams(window.location.search);
      const currentPathWithSearch = `${window.location.pathname}${window.location.search}`;
      const redirectTo = params.get("redirect") || (window.location.pathname !== "/login" ? currentPathWithSearch : "/");
      setLocation(redirectTo);
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#A0E9FF]/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {branding?.logoUrl ? (
            <div className="mb-4 flex justify-center">
              <img src={branding.logoUrl} alt={`${branding.displayName} logo`} className="h-20 w-20 rounded-2xl object-contain" />
            </div>
          ) : (
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
              <ScanLine className="h-8 w-8" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-login-title">
            {branding?.displayName || "MYO School Attendance"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Sign in to manage attendance alerts
          </p>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-center">Sign In</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  data-testid="input-username"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  data-testid="input-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
