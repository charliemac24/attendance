import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";

type ScopePolicy = {
  dailyCap: number;
  enabled: boolean;
};

type GradePolicyRow = ScopePolicy & {
  gradeLevelId: number;
  gradeLevelName: string;
};

type SectionPolicyRow = ScopePolicy & {
  sectionId: number;
  sectionName: string;
  gradeLevelName: string | null;
};

type SmsPoliciesResponse = {
  schoolPolicy: {
    smsDailyCap: number;
    smsSendMode: string;
    allowMultipleScans: boolean;
    maxBreakCyclesPerDay: number;
    minScanIntervalSeconds: number;
    dismissalTime: string;
    earlyOutWindowMinutes: number;
  };
  gradePolicies: GradePolicyRow[];
  sectionPolicies: SectionPolicyRow[];
};

export default function SettingsSmsPoliciesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [gradeDraft, setGradeDraft] = useState<Record<number, ScopePolicy>>({});
  const [sectionDraft, setSectionDraft] = useState<Record<number, ScopePolicy>>({});
  const schoolQuery =
    user?.role === "super_admin" && user.selectedSchoolId
      ? `?school_id=${user.selectedSchoolId}`
      : "";
  const policiesUrl = `/api/settings/sms-policies${schoolQuery}`;

  const { data, isLoading } = useQuery<SmsPoliciesResponse>({
    queryKey: [policiesUrl],
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: [policiesUrl] });
    await queryClient.invalidateQueries({ queryKey: ["/api/settings/school"] });
  };

  const updateGradeMutation = useMutation({
    mutationFn: async (payload: GradePolicyRow) => {
      await apiRequest("PATCH", `/api/settings/sms-policies/grade/${payload.gradeLevelId}${schoolQuery}`, {
        enabled: payload.enabled,
        dailyCap: payload.dailyCap,
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Grade policy updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async (payload: SectionPolicyRow) => {
      await apiRequest("PATCH", `/api/settings/sms-policies/section/${payload.sectionId}${schoolQuery}`, {
        enabled: payload.enabled,
        dailyCap: payload.dailyCap,
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Section policy updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const schoolCap = useMemo(() => data?.schoolPolicy.smsDailyCap ?? 2, [data?.schoolPolicy.smsDailyCap]);

  useEffect(() => {
    if (!data) return;
    const grades: Record<number, ScopePolicy> = {};
    for (const row of data.gradePolicies) {
      grades[row.gradeLevelId] = { enabled: row.enabled, dailyCap: row.dailyCap };
    }
    const sections: Record<number, ScopePolicy> = {};
    for (const row of data.sectionPolicies) {
      sections[row.sectionId] = { enabled: row.enabled, dailyCap: row.dailyCap };
    }
    setGradeDraft(grades);
    setSectionDraft(sections);
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-sms-policies-title">SMS Policy Overrides</h1>
          <p className="text-sm text-muted-foreground">
            Precedence: Section override, then Grade override, then School-wide cap ({schoolCap}).
          </p>
          <p className="text-xs text-muted-foreground">Set cap to <code>-1</code> for unlimited SMS per student/day.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="font-semibold">Grade-level Overrides</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.gradePolicies.length ? data.gradePolicies.map((row) => (
            <div key={row.gradeLevelId} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center border rounded-md p-3">
              <div>
                <p className="font-medium">{row.gradeLevelName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={gradeDraft[row.gradeLevelId]?.enabled ?? row.enabled}
                  onCheckedChange={(enabled) =>
                    setGradeDraft((prev) => ({
                      ...prev,
                      [row.gradeLevelId]: {
                        enabled,
                        dailyCap: prev[row.gradeLevelId]?.dailyCap ?? row.dailyCap,
                      },
                    }))
                  }
                />
                <Label>Override</Label>
              </div>
              <Input
                type="number"
                min={-1}
                max={20}
                className="w-24"
                value={gradeDraft[row.gradeLevelId]?.dailyCap ?? row.dailyCap}
                onChange={(e) =>
                  setGradeDraft((prev) => ({
                    ...prev,
                    [row.gradeLevelId]: {
                      enabled: prev[row.gradeLevelId]?.enabled ?? row.enabled,
                      dailyCap: Number(e.target.value),
                    },
                  }))
                }
                disabled={!(gradeDraft[row.gradeLevelId]?.enabled ?? row.enabled)}
              />
              <Button
                variant="outline"
                onClick={() =>
                  updateGradeMutation.mutate({
                    ...row,
                    enabled: gradeDraft[row.gradeLevelId]?.enabled ?? row.enabled,
                    dailyCap: gradeDraft[row.gradeLevelId]?.dailyCap ?? row.dailyCap,
                  })
                }
                disabled={updateGradeMutation.isPending}
              >
                Save
              </Button>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No grade levels found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="font-semibold">Section-level Overrides</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.sectionPolicies.length ? data.sectionPolicies.map((row) => (
            <div key={row.sectionId} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center border rounded-md p-3">
              <div>
                <p className="font-medium">{row.sectionName}</p>
                <p className="text-sm text-muted-foreground">{row.gradeLevelName || "No grade assigned"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={sectionDraft[row.sectionId]?.enabled ?? row.enabled}
                  onCheckedChange={(enabled) =>
                    setSectionDraft((prev) => ({
                      ...prev,
                      [row.sectionId]: {
                        enabled,
                        dailyCap: prev[row.sectionId]?.dailyCap ?? row.dailyCap,
                      },
                    }))
                  }
                />
                <Label>Override</Label>
              </div>
              <Input
                type="number"
                min={-1}
                max={20}
                className="w-24"
                value={sectionDraft[row.sectionId]?.dailyCap ?? row.dailyCap}
                onChange={(e) =>
                  setSectionDraft((prev) => ({
                    ...prev,
                    [row.sectionId]: {
                      enabled: prev[row.sectionId]?.enabled ?? row.enabled,
                      dailyCap: Number(e.target.value),
                    },
                  }))
                }
                disabled={!(sectionDraft[row.sectionId]?.enabled ?? row.enabled)}
              />
              <Button
                variant="outline"
                onClick={() =>
                  updateSectionMutation.mutate({
                    ...row,
                    enabled: sectionDraft[row.sectionId]?.enabled ?? row.enabled,
                    dailyCap: sectionDraft[row.sectionId]?.dailyCap ?? row.dailyCap,
                  })
                }
                disabled={updateSectionMutation.isPending}
              >
                Save
              </Button>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No sections found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
