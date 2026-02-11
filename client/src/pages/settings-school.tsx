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
    timezone: "Asia/Manila",
    lateTime: "08:00",
    cutoffTime: "09:00",
    smsEnabled: false,
    allowMultipleScans: false,
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name,
        timezone: school.timezone,
        lateTime: school.lateTime?.substring(0, 5) || "08:00",
        cutoffTime: school.cutoffTime?.substring(0, 5) || "09:00",
        smsEnabled: school.smsEnabled,
        allowMultipleScans: school.allowMultipleScans,
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
              <Label>Timezone</Label>
              <Input
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                data-testid="input-timezone"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Cutoff Time</Label>
                <Input
                  type="time"
                  value={formData.cutoffTime}
                  onChange={(e) => setFormData({ ...formData, cutoffTime: e.target.value })}
                  data-testid="input-cutoff-time"
                />
              </div>
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
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Allow Multiple Scans</Label>
                <p className="text-sm text-muted-foreground">Allow more than 2 scans per day</p>
              </div>
              <Switch
                checked={formData.allowMultipleScans}
                onCheckedChange={(v) => setFormData({ ...formData, allowMultipleScans: v })}
                data-testid="switch-multiple-scans"
              />
            </div>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-settings">
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
