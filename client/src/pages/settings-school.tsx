import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { School } from "@shared/schema";

export default function SettingsSchoolPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: school, isLoading } = useQuery<School>({
    queryKey: ["/api/settings/school"],
  });

  const [formData, setFormData] = useState({
    name: "",
    loginSlug: "",
    logoUrl: "",
    timezone: "Asia/Manila",
    lateTime: "08:00",
    cutoffTime: "09:00",
    smsEnabled: false,
    absentSmsEnabled: false,
    smsSendMode: "ALL_MOVEMENTS",
    allowMultipleScans: true,
    minScanIntervalSeconds: 120,
    dismissalTime: "15:00",
    earlyOutWindowMinutes: 30,
    showStudentsNeedingAttention: true,
  });
  const today = new Date().toISOString().slice(0, 10);
  const [purgeFrom, setPurgeFrom] = useState<string>(today);
  const [purgeTo, setPurgeTo] = useState<string>(today);
  const [purgeDeleteAttendance, setPurgeDeleteAttendance] = useState(true);
  const [purgeDeleteSms, setPurgeDeleteSms] = useState(true);
  const [logoUploadBusy, setLogoUploadBusy] = useState(false);

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name,
        loginSlug: school.loginSlug || "",
        logoUrl: school.logoUrl || "",
        timezone: school.timezone,
        lateTime: school.lateTime?.substring(0, 5) || "08:00",
        cutoffTime: school.cutoffTime?.substring(0, 5) || "09:00",
        smsEnabled: school.smsEnabled,
        absentSmsEnabled: school.absentSmsEnabled ?? false,
        smsSendMode: "ALL_MOVEMENTS",
        allowMultipleScans: true,
        minScanIntervalSeconds: school.minScanIntervalSeconds ?? 120,
        dismissalTime: school.dismissalTime?.substring(0, 5) || "15:00",
        earlyOutWindowMinutes: school.earlyOutWindowMinutes ?? 30,
        showStudentsNeedingAttention: school.showStudentsNeedingAttention ?? true,
      });
    }
  }, [school]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/settings/school", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/school"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const purgeLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/purge-logs", {
        from: purgeFrom,
        to: purgeTo,
        deleteAttendance: purgeDeleteAttendance,
        deleteSms: purgeDeleteSms,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Logs purged",
        description: `Attendance events: ${data.attendanceEventsDeleted}, attendance records: ${data.dailyAttendancesDeleted}, SMS logs: ${data.smsLogsDeleted}`,
      });
      queryClient.invalidateQueries({ queryKey: ["sms-logs"] });
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/dashboard"),
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadLogo = async (file: File) => {
    const body = new FormData();
    body.append("logo", file);
    setLogoUploadBusy(true);
    try {
      const res = await fetch("/api/settings/school/logo", {
        method: "POST",
        body,
        credentials: "include",
      });
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(raw || "Logo upload failed");
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, logoUrl: data.logoUrl || "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/settings/school"] });
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploadBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold" data-testid="text-settings-title">School Settings</h1>
        </div>
        {school && (
          <p className="text-sm text-muted-foreground mt-1 ml-12" data-testid="text-settings-school-name">
            Configuring: {school.name}
          </p>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-school-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Login Slug</Label>
              <Input
                value={formData.loginSlug}
                onChange={(e) => setFormData({ ...formData, loginSlug: e.target.value })}
                placeholder="stars"
                data-testid="input-school-login-slug"
              />
              <p className="text-sm text-muted-foreground">
                Branded login URL: <span className="font-mono">/?school={formData.loginSlug || "stars"}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Login Logo</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={logoUploadBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadLogo(file);
                  }
                  e.currentTarget.value = "";
                }}
                data-testid="input-school-logo"
              />
              {formData.logoUrl ? (
                <div className="rounded-md border p-3">
                  <img src={formData.logoUrl} alt="School logo preview" className="h-20 w-20 rounded-md object-contain" />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                data-testid="input-timezone"
              />
            </div>
            <div className="space-y-2">
              <Label>Late Time</Label>
              <Input
                type="time"
                value={formData.lateTime}
                onChange={(e) => setFormData({ ...formData, lateTime: e.target.value })}
                data-testid="input-late-time"
              />
            </div>
            <div className="space-y-2">
              <Label>Auto Absent Cutoff Time</Label>
              <Input
                type="time"
                value={formData.cutoffTime}
                onChange={(e) => setFormData({ ...formData, cutoffTime: e.target.value })}
                data-testid="input-cutoff-time"
              />
              <p className="text-sm text-muted-foreground">
                Students with no attendance record after this time can be marked absent by the cron route.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable SMS alerts for attendance</p>
              </div>
              <Switch
                checked={formData.smsEnabled}
                onCheckedChange={(v) => setFormData({ ...formData, smsEnabled: v })}
                data-testid="switch-sms-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Scan Interval (seconds)</Label>
              <Input
                type="number"
                min={0}
                max={600}
                value={formData.minScanIntervalSeconds}
                onChange={(e) => setFormData({ ...formData, minScanIntervalSeconds: Number(e.target.value) })}
                data-testid="input-min-scan-interval"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dismissal Time</Label>
                <Input
                  type="time"
                  value={formData.dismissalTime}
                  onChange={(e) => setFormData({ ...formData, dismissalTime: e.target.value })}
                  data-testid="input-dismissal-time"
                />
              </div>
              <div className="space-y-2">
                <Label>Early Out Window (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={180}
                  value={formData.earlyOutWindowMinutes}
                  onChange={(e) => setFormData({ ...formData, earlyOutWindowMinutes: Number(e.target.value) })}
                  data-testid="input-early-out-window"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Show "Students Needing Attention" On Dashboard</Label>
                <p className="text-sm text-muted-foreground">
                  Hide or show the dashboard panel for attendance risk flags and declining trends.
                </p>
              </div>
              <Switch
                checked={formData.showStudentsNeedingAttention}
                onCheckedChange={(v) => setFormData({ ...formData, showStudentsNeedingAttention: v })}
                data-testid="switch-show-students-needing-attention"
              />
            </div>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-settings">
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {user?.role === "super_admin" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <h2 className="text-base font-semibold">Purge Logs By Date</h2>
            <p className="text-sm text-muted-foreground">
              Deletes attendance logs and/or SMS logs for the currently selected school within a date range.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="date"
                  value={purgeFrom}
                  onChange={(e) => setPurgeFrom(e.target.value)}
                  data-testid="input-purge-logs-from"
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  type="date"
                  value={purgeTo}
                  onChange={(e) => setPurgeTo(e.target.value)}
                  data-testid="input-purge-logs-to"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Delete Daily Attendance</Label>
                <p className="text-sm text-muted-foreground">
                  Removes daily attendance records and attendance events in the selected range.
                </p>
              </div>
              <Switch
                checked={purgeDeleteAttendance}
                onCheckedChange={setPurgeDeleteAttendance}
                data-testid="switch-purge-delete-attendance"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Delete SMS Logs</Label>
                <p className="text-sm text-muted-foreground">
                  Removes SMS log history in the selected range.
                </p>
              </div>
              <Switch
                checked={purgeDeleteSms}
                onCheckedChange={setPurgeDeleteSms}
                data-testid="switch-purge-delete-sms"
              />
            </div>
            <Button
              variant="destructive"
              disabled={!purgeFrom || !purgeTo || (!purgeDeleteAttendance && !purgeDeleteSms) || purgeLogsMutation.isPending}
              data-testid="button-purge-logs-range"
              onClick={() => {
                if (!school) return;
                const ok = window.confirm(
                  `Delete the selected logs for ${school.name} from ${purgeFrom} to ${purgeTo}? This cannot be undone.`,
                );
                if (!ok) return;
                purgeLogsMutation.mutate();
              }}
            >
              {purgeLogsMutation.isPending ? "Purging..." : "Delete Logs For Date Range"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
