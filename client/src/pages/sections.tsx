import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Layers, Trash2 } from "lucide-react";
import type { GradeLevel } from "@shared/schema";

type SectionWithGrade = {
  id: number;
  name: string;
  schoolId: number;
  gradeLevelId: number;
  gradeLevelName?: string;
  lateTimeOverride?: string | null;
  fridayLateTimeOverride?: string | null;
  lateTimeOverridesByWeekday?: Record<string, string | null> | null;
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export default function SectionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<SectionWithGrade | null>(null);
  const [editing, setEditing] = useState<SectionWithGrade | null>(null);
  const [name, setName] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [lateTimeOverride, setLateTimeOverride] = useState("");
  const [weekdayOverrides, setWeekdayOverrides] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: sections, isLoading } = useQuery<SectionWithGrade[]>({
    queryKey: ["/api/sections"],
  });

  const { data: gradeLevels } = useQuery<GradeLevel[]>({
    queryKey: ["/api/grade-levels"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        gradeLevelId: Number(gradeLevelId),
        lateTimeOverride: lateTimeOverride || null,
        lateTimeOverridesByWeekday: Object.fromEntries(
          WEEKDAYS.map((weekday) => [weekday, weekdayOverrides[weekday] || null]).filter(([, value]) => value !== null),
        ),
      };
      if (editing) {
        await apiRequest("PATCH", `/api/sections/${editing.id}`, {
          ...payload,
        });
      } else {
        await apiRequest("POST", "/api/sections", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? "Section updated" : "Section created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setDeleteDialogOpen(false);
      setSectionToDelete(null);
      toast({ title: "Section deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmDelete = (section: SectionWithGrade) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold" data-testid="text-sections-title">Sections</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setName("");
            setGradeLevelId("");
            setLateTimeOverride("");
            setWeekdayOverrides({});
            setDialogOpen(true);
          }}
          data-testid="button-add-section"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Section
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sections && sections.length > 0 ? (
            <div className="divide-y">
              {sections.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-3" data-testid={`row-section-${s.id}`}>
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({s.gradeLevelName})</span>
                    {s.lateTimeOverride && <p className="text-xs text-muted-foreground">Late override: {s.lateTimeOverride.slice(0, 5)}</p>}
                    {WEEKDAYS.map((weekday) => {
                      const override = s.lateTimeOverridesByWeekday?.[weekday]
                        || (weekday === "Friday" ? s.fridayLateTimeOverride : null);
                      return override ? <p key={weekday} className="text-xs text-muted-foreground">{weekday} late override: {override.slice(0, 5)}</p> : null;
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(s);
                        setName(s.name);
                        setGradeLevelId(String(s.gradeLevelId));
                        setLateTimeOverride(s.lateTimeOverride?.slice(0, 5) || "");
                        setWeekdayOverrides(Object.fromEntries(WEEKDAYS.map((weekday) => [
                          weekday,
                          s.lateTimeOverridesByWeekday?.[weekday]?.slice(0, 5)
                            || (weekday === "Friday" ? s.fridayLateTimeOverride?.slice(0, 5) : "")
                            || "",
                        ])));
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(s)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No sections yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Section" : "Add Section"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Section A"
                required
                data-testid="input-section-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select value={gradeLevelId} onValueChange={setGradeLevelId}>
                <SelectTrigger data-testid="select-grade-level">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels?.map((gl) => (
                    <SelectItem key={gl.id} value={String(gl.id)}>
                      {gl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Late Time Override</Label>
              <Input type="time" value={lateTimeOverride} onChange={(e) => setLateTimeOverride(e.target.value)} data-testid="input-section-late-time-override" />
              <p className="text-xs text-muted-foreground">Leave blank to use the grade-level or school-wide late time.</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Late Time Overrides By Weekday</Label>
                <p className="text-xs text-muted-foreground">Configure the section's schedule by weekday. Blank days use the section default above, then grade-level and school-wide settings.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {WEEKDAYS.map((weekday) => (
                  <div key={weekday} className="space-y-2">
                    <Label>{weekday}</Label>
                    <Input
                      type="time"
                      value={weekdayOverrides[weekday] || ""}
                      onChange={(e) => setWeekdayOverrides((current) => ({ ...current, [weekday]: e.target.value }))}
                      data-testid={`input-section-${weekday.toLowerCase()}-late-time-override`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-section">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{sectionToDelete?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => sectionToDelete && deleteMutation.mutate(sectionToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-section"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
