import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScanLine, CheckCircle, XCircle, UserCheck, Camera, CameraOff } from "lucide-react";
import jsQR from "jsqr";
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
  const [popupResult, setPopupResult] = useState<ScanResult | null>(null);
  const [showScanPopup, setShowScanPopup] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastCameraTokenRef = useRef<string>("");
  const lastCameraTokenAtRef = useRef<number>(0);
  const popupTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();

  const focusQrInput = () => {
    if (cameraRunning) return;
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
      if (data.success) {
        setPopupResult(data);
        setShowScanPopup(true);
        if (popupTimeoutRef.current !== null) {
          window.clearTimeout(popupTimeoutRef.current);
        }
        popupTimeoutRef.current = window.setTimeout(() => {
          setShowScanPopup(false);
        }, 1800);
      }
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

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraRunning(false);
  }, []);

  const handleCameraDecoded = useCallback((rawValue: string) => {
    const qrToken = rawValue.trim();
    if (!qrToken) return;

    const now = Date.now();
    if (qrToken === lastCameraTokenRef.current && now - lastCameraTokenAtRef.current < 1500) {
      return;
    }
    if (scanMutation.isPending) return;

    lastCameraTokenRef.current = qrToken;
    lastCameraTokenAtRef.current = now;
    setQrInput(qrToken);

    if (!selectedKiosk) {
      toast({
        title: "Select kiosk location",
        description: "Choose a kiosk location before scanning.",
        variant: "destructive",
      });
      return;
    }

    scanMutation.mutate(qrToken);
  }, [scanMutation, selectedKiosk, toast]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser.");
      return;
    }

    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      setCameraRunning(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start camera.";
      setCameraError(message);
      setCameraRunning(false);
    }
  }, []);

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
    if (!cameraRunning) return;

    const scanFrame = () => {
      const video = videoRef.current;
      if (!video) {
        frameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvasRef.current = canvas;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result?.data) {
            handleCameraDecoded(result.data);
          }
        }
      }

      frameRef.current = requestAnimationFrame(scanFrame);
    };

    frameRef.current = requestAnimationFrame(scanFrame);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [cameraRunning, handleCameraDecoded]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (popupTimeoutRef.current !== null) {
        window.clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }
    };
  }, [stopCamera]);

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
      {showScanPopup && popupResult?.success && (
        <div className="fixed inset-x-0 top-4 z-50 px-4 pointer-events-none" data-testid="scan-success-popup">
          <div className="mx-auto max-w-lg rounded-xl border border-green-200 bg-white shadow-xl dark:bg-card dark:border-green-800">
            <div className="p-4 flex items-center gap-3">
              <div className="shrink-0">
                <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Scan Successful</p>
                <p className="text-base font-semibold truncate">{popupResult.studentName || "Student"}</p>
                <p className="text-sm text-muted-foreground truncate">{popupResult.message}</p>
              </div>
              {popupResult.action && (
                <Badge className="no-default-hover-elevate no-default-active-elevate shrink-0">
                  {popupResult.action}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

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

            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Camera QR Scanner</p>
                {cameraRunning ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={stopCamera}
                    data-testid="button-stop-camera-scan"
                  >
                    <CameraOff className="h-4 w-4 mr-1" />
                    Stop Camera
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={startCamera}
                    disabled={!selectedKiosk}
                    data-testid="button-start-camera-scan"
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Start Camera
                  </Button>
                )}
              </div>

              <div className="rounded-md bg-black/90 overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                  data-testid="video-camera-qr"
                />
              </div>

              {cameraError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{cameraError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Point the camera at a student QR code on paper or mobile phone screen.
                </p>
              )}
            </div>
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
