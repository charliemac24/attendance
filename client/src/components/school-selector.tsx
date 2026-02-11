import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { School } from "lucide-react";
import type { School as SchoolType } from "@shared/schema";

export function SchoolSelector() {
  const { user } = useAuth();

  const { data: schools } = useQuery<SchoolType[]>({
    queryKey: ["/api/schools"],
    enabled: user?.role === "super_admin",
  });

  const switchMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      await apiRequest("POST", "/api/auth/switch-school", { schoolId });
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  if (user?.role !== "super_admin" || !schools || schools.length === 0) {
    return null;
  }

  const selectedSchoolId = user?.selectedSchoolId;

  return (
    <div className="flex items-center gap-2">
      <School className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={selectedSchoolId ? String(selectedSchoolId) : undefined}
        onValueChange={(v) => switchMutation.mutate(Number(v))}
      >
        <SelectTrigger className="w-[200px]" data-testid="select-school-switcher">
          <SelectValue placeholder="Select school" />
        </SelectTrigger>
        <SelectContent>
          {schools.map((s) => (
            <SelectItem key={s.id} value={String(s.id)} data-testid={`option-school-${s.id}`}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
