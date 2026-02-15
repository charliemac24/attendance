import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScanLine, CheckCircle, XCircle, Clock, UserCheck } from "lucide-react";
import type { KioskLocation } from "@shared/schema";

interface ScanResult {
  success: boolean;
  message: string;
  studentName?: string;
  photoUrl?: string | null;
  status?: string;
  action?: string;
  time?: string;
}

export default function GateKiosksPage() {
  const [selectedKiosk, setSelectedKiosk] = useState<string>("");
  const [qrInput, setQrInput] = useState("");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const focusQrInput = () => {
    // Delay focus to the next frame so it works reliably after state updates/render.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  };

  const { data: kiosks } = useQuery<KioskLocation[]>({
    queryKey: ["/api/kiosks"],
  });

  useEffect(() => {
    if (kiosks && kiosks.length > 0 && !selectedKiosk) {
      setSelectedKiosk(String(kiosks[0].id));
    }
  }, [kiosks, selectedKiosk]);

  const scanMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      const res = await apiRequest("POST", "/api/kiosk/scan", {
        qrToken,
        kioskLocationId: Number(selectedKiosk),
      });
      return res.json();
    },
    onSuccess: (data: ScanResult) => {
      setLastResult(data);
      setRecentScans((prev) => [data, ...prev.slice(0, 9)]);
      setQrInput("");
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/dashboard"),
      });
      focusQrInput();
    },
    onError: (err: any) => {
      const result: ScanResult = {
        success: false,
        message: err.message || "Scan failed",
      };
      setLastResult(result);
      setRecentScans((prev) => [result, ...prev.slice(0, 9)]);
      setQrInput("");
      focusQrInput();
    },
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrInput.trim() && selectedKiosk) {
      scanMutation.mutate(qrInput.trim());
    }
  };

  useEffect(() => {
    focusQrInput();
  }, [selectedKiosk]);

  useEffect(() => {
    const handleWindowFocus = () => focusQrInput();
    const handleVisibilityChange = () => {
      if (!document.hidden) focusQrInput();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Keep the session alive while kiosk screen is open and idle at the gate.
    const intervalId = window.setInterval(() => {
      fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }).catch(() => {
        // Ignore transient network errors; next interval will retry.
      });
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <ScanLine className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-kiosk-scanner-title">
            Kiosk Scanner
          </h1>
          <p className="text-sm text-muted-foreground">
            Scan student QR codes for attendance
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Kiosk Location</label>
              <Select value={selectedKiosk} onValueChange={setSelectedKiosk}>
                <SelectTrigger data-testid="select-kiosk">
                  <SelectValue placeholder="Choose a kiosk" />
                </SelectTrigger>
                <SelectContent>
                  {kiosks?.map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <form onSubmit={handleScan}>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onBlur={focusQrInput}
                  placeholder="Scan or enter QR code..."
                  className="text-lg"
                  autoFocus
                  data-testid="input-qr-scan"
                />
                <Button
                  type="submit"
                  disabled={!qrInput.trim() || !selectedKiosk || scanMutation.isPending}
                  data-testid="button-scan"
                >
                  <ScanLine className="h-4 w-4 mr-1" />
                  Scan
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className={lastResult.success ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
          <CardContent className="p-6 text-center">
            {lastResult.studentName && (
              <div className="mb-4 flex justify-center">
                <Avatar className="h-24 w-24 border">
                  <AvatarImage src={lastResult.photoUrl || ""} alt={lastResult.studentName} />
                  <AvatarFallback className="text-xl">
                    {lastResult.studentName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            {lastResult.success ? (
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
            ) : (
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-3" />
            )}
            <p className="text-lg font-semibold" data-testid="text-scan-result">
              {lastResult.message}
            </p>
            {lastResult.studentName && (
              <p className="text-muted-foreground mt-1">{lastResult.studentName}</p>
            )}
            {lastResult.action && (
              <Badge className="mt-2 no-default-hover-elevate no-default-active-elevate">
                {lastResult.action}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {recentScans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold">Recent Scans</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentScans.map((scan, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {scan.success ? (
                    <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {scan.studentName || scan.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scan.action || (scan.success ? "Success" : "Failed")}
                    </p>
                  </div>
                  {scan.time && (
                    <span className="text-xs text-muted-foreground">{scan.time}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
