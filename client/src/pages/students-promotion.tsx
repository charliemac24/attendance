import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ArrowUpCircle, ArrowUpDown, GraduationCap, Search } from "lucide-react";
import type { GradeLevel, Section, Student } from "@shared/schema";

type StudentWithRelations = Student & {
  gradeLevelName?: string;
  sectionName?: string;
};

type PromotionAction = "promote" | "retain" | "graduate" | "transfer_out";

type PromotionDraft = {
  action: PromotionAction;
  targetGradeLevelId: string;
  targetSectionId: string;
};

const ACTION_LABELS: Record<PromotionAction, string> = {
  promote: "Promote",
  retain: "Retain",
  graduate: "Graduate",
  transfer_out: "Transfer Out",
};

function getGradeSortValue(name: string): [number, number, string] {
  const normalized = name.trim().toLowerCase();
  const numberMatch = normalized.match(/(\d+)/);
  if (numberMatch) return [0, Number(numberMatch[1]), normalized];
  if (normalized.includes("kinder")) return [0, 0, normalized];
  if (normalized.includes("nursery")) return [0, -1, normalized];
  return [1, Number.MAX_SAFE_INTEGER, normalized];
}

function sortGradeLevels(values: GradeLevel[]): GradeLevel[] {
  return [...values].sort((a, b) => {
    const left = getGradeSortValue(a.name);
    const right = getGradeSortValue(b.name);
    return left[0] - right[0] || left[1] - right[1] || left[2].localeCompare(right[2]);
  });
}

function getNextGradeLevelId(currentGradeLevelId: number | null | undefined, orderedGradeLevels: GradeLevel[]): string {
  if (!currentGradeLevelId) return "";
  const index = orderedGradeLevels.findIndex((grade) => grade.id === currentGradeLevelId);
  if (index === -1 || index === orderedGradeLevels.length - 1) return "";
  return String(orderedGradeLevels[index + 1].id);
}

function getDefaultAction(student: StudentWithRelations, orderedGradeLevels: GradeLevel[]): PromotionAction {
  return getNextGradeLevelId(student.gradeLevelId, orderedGradeLevels) ? "promote" : "graduate";
}

export default function StudentsPromotionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sourceGradeId, setSourceGradeId] = useState("all");
  const [sourceSectionId, setSourceSectionId] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<number, PromotionDraft>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (user?.role !== "super_admin" && user?.role !== "school_admin") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h1 className="text-xl font-bold">Promotion access restricted</h1>
            <p className="text-sm text-muted-foreground">
              Only Super Admin and School Admin can bulk promote students.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: students, isLoading: studentsLoading } = useQuery<StudentWithRelations[]>({
    queryKey: [`/api/students?search=${search}`],
  });

  const { data: gradeLevels, isLoading: gradesLoading } = useQuery<GradeLevel[]>({
    queryKey: ["/api/grade-levels"],
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const orderedGradeLevels = useMemo(() => sortGradeLevels(gradeLevels || []), [gradeLevels]);

  const filteredSections = useMemo(() => {
    if (!sections) return [];
    if (sourceGradeId === "all") return sections;
    return sections.filter((section) => String(section.gradeLevelId) === sourceGradeId);
  }, [sections, sourceGradeId]);

  const eligibleStudents = useMemo(() => {
    const currentStudents = students || [];
    return currentStudents.filter((student) => {
      if (!student.isActive) return false;
      if (sourceGradeId !== "all" && String(student.gradeLevelId || "") !== sourceGradeId) return false;
      if (sourceSectionId !== "all" && String(student.sectionId || "") !== sourceSectionId) return false;
      return true;
    });
  }, [students, sourceGradeId, sourceSectionId]);

  useEffect(() => {
    const nextDrafts: Record<number, PromotionDraft> = {};
    for (const student of eligibleStudents) {
      const existing = drafts[student.id];
      if (existing) {
        nextDrafts[student.id] = existing;
        continue;
      }

      nextDrafts[student.id] = {
        action: getDefaultAction(student, orderedGradeLevels),
        targetGradeLevelId: getNextGradeLevelId(student.gradeLevelId, orderedGradeLevels),
        targetSectionId: "",
      };
    }

    setDrafts(nextDrafts);
    setSelectedIds(eligibleStudents.map((student) => student.id));
  }, [eligibleStudents, orderedGradeLevels]);

  const selectedStudents = useMemo(
    () => eligibleStudents.filter((student) => selectedIds.includes(student.id)),
    [eligibleStudents, selectedIds],
  );

  const selectedPayload = useMemo(() => {
    return selectedStudents.map((student) => {
      const draft = drafts[student.id];
      return {
        studentId: student.id,
        action: draft?.action || getDefaultAction(student, orderedGradeLevels),
        targetGradeLevelId: draft?.targetGradeLevelId ? Number(draft.targetGradeLevelId) : null,
        targetSectionId: draft?.targetSectionId ? Number(draft.targetSectionId) : null,
      };
    });
  }, [drafts, orderedGradeLevels, selectedStudents]);

  const summary = useMemo(() => {
    return selectedPayload.reduce(
      (totals, item) => {
        if (item.action === "promote") totals.promote += 1;
        if (item.action === "retain") totals.retain += 1;
        if (item.action === "graduate") totals.graduate += 1;
        if (item.action === "transfer_out") totals.transfer_out += 1;
        return totals;
      },
      { promote: 0, retain: 0, graduate: 0, transfer_out: 0 },
    );
  }, [selectedPayload]);

  const invalidPromotionCount = useMemo(
    () => selectedPayload.filter((item) => item.action === "promote" && !item.targetGradeLevelId).length,
    [selectedPayload],
  );

  const applyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/students/promotions/apply", {
        items: selectedPayload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/students"),
      });
      setConfirmOpen(false);
      toast({
        title: "Promotion updates applied",
        description: `${selectedPayload.length} student records were updated.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Unable to apply promotion",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const setDraft = (studentId: number, patch: Partial<PromotionDraft>) => {
    setDrafts((current) => {
      const next = { ...(current[studentId] || { action: "promote" as PromotionAction, targetGradeLevelId: "", targetSectionId: "" }), ...patch };
      if (next.action === "promote" && !next.targetGradeLevelId) {
        next.targetSectionId = "";
      }
      if (next.action === "graduate" || next.action === "transfer_out") {
        next.targetSectionId = "";
      }
      return { ...current, [studentId]: next };
    });
  };

  const setBulkAction = (action: PromotionAction) => {
    const updates: Record<number, PromotionDraft> = {};
    for (const student of selectedStudents) {
      updates[student.id] = {
        action,
        targetGradeLevelId:
          action === "promote"
            ? drafts[student.id]?.targetGradeLevelId || getNextGradeLevelId(student.gradeLevelId, orderedGradeLevels)
            : drafts[student.id]?.targetGradeLevelId || "",
        targetSectionId: "",
      };
    }
    setDrafts((current) => ({ ...current, ...updates }));
  };

  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds(eligibleStudents.map((student) => student.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (studentId: number, checked: boolean | "indeterminate") => {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, studentId])) : current.filter((id) => id !== studentId),
    );
  };

  const getSectionsForDraft = (draft: PromotionDraft, student: StudentWithRelations) => {
    const targetGradeLevelId =
      draft.action === "promote" ? draft.targetGradeLevelId : String(student.gradeLevelId || "");
    return (sections || []).filter((section) => String(section.gradeLevelId) === targetGradeLevelId);
  };

  const allEligibleSelected = eligibleStudents.length > 0 && eligibleStudents.length === selectedIds.length;
  const someEligibleSelected = selectedIds.length > 0 && !allEligibleSelected;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-promotion-title">Student Promotion</h1>
            <p className="text-sm text-muted-foreground">
              Prepare grade-level moving up before the new school year starts.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={selectedPayload.length === 0 || invalidPromotionCount > 0 || applyMutation.isPending}
          data-testid="button-apply-promotion"
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          {applyMutation.isPending ? "Applying..." : `Apply to ${selectedPayload.length} Students`}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="promotion-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="promotion-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or student ID"
                className="pl-9"
                data-testid="input-promotion-search"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Current Grade Level</Label>
            <Select value={sourceGradeId} onValueChange={(value) => {
              setSourceGradeId(value);
              setSourceSectionId("all");
            }}>
              <SelectTrigger data-testid="select-promotion-grade">
                <SelectValue placeholder="All grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All grades</SelectItem>
                {orderedGradeLevels.map((grade) => (
                  <SelectItem key={grade.id} value={String(grade.id)}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Current Section</Label>
            <Select value={sourceSectionId} onValueChange={setSourceSectionId}>
              <SelectTrigger data-testid="select-promotion-section">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {filteredSections.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bulk action on selected</Label>
            <Select onValueChange={(value) => setBulkAction(value as PromotionAction)}>
              <SelectTrigger data-testid="select-promotion-bulk-action">
                <SelectValue placeholder="Choose action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promote">Promote selected</SelectItem>
                <SelectItem value="retain">Retain selected</SelectItem>
                <SelectItem value="graduate">Graduate selected</SelectItem>
                <SelectItem value="transfer_out">Transfer out selected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Selected</p><p className="text-2xl font-semibold">{selectedPayload.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Promote</p><p className="text-2xl font-semibold">{summary.promote}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Retain</p><p className="text-2xl font-semibold">{summary.retain}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Exit school</p><p className="text-2xl font-semibold">{summary.graduate + summary.transfer_out}</p></CardContent></Card>
      </div>

      {invalidPromotionCount > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            {invalidPromotionCount} selected student{invalidPromotionCount > 1 ? "s" : ""} marked for promotion still need a target grade level.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Promotion Preview</h2>
              <p className="text-sm text-muted-foreground">
                Review the suggested move-up for each student before applying.
              </p>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              {eligibleStudents.length} eligible students
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {studentsLoading || gradesLoading || sectionsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : eligibleStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="w-10 text-left py-3 px-4">
                      <Checkbox
                        checked={allEligibleSelected ? true : someEligibleSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all students in promotion preview"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Current</th>
                    <th className="text-left py-3 px-4 font-medium">Action</th>
                    <th className="text-left py-3 px-4 font-medium">Target grade</th>
                    <th className="text-left py-3 px-4 font-medium">Target section</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleStudents.map((student) => {
                    const draft = drafts[student.id] || {
                      action: getDefaultAction(student, orderedGradeLevels),
                      targetGradeLevelId: getNextGradeLevelId(student.gradeLevelId, orderedGradeLevels),
                      targetSectionId: "",
                    };
                    const sectionOptions = getSectionsForDraft(draft, student);

                    return (
                      <tr key={student.id} className="border-b last:border-0" data-testid={`row-promotion-student-${student.id}`}>
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedIds.includes(student.id)}
                            onCheckedChange={(checked) => toggleSelect(student.id, checked)}
                            aria-label={`Select ${student.firstName} ${student.lastName}`}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{student.firstName} {student.lastName}</div>
                          <div className="text-xs text-muted-foreground">{student.studentNo}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {student.gradeLevelName || "Unassigned"} / {student.sectionName || "No section"}
                        </td>
                        <td className="py-3 px-4 min-w-[180px]">
                          <Select
                            value={draft.action}
                            onValueChange={(value) => setDraft(student.id, { action: value as PromotionAction })}
                          >
                            <SelectTrigger data-testid={`select-promotion-action-${student.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="promote">Promote</SelectItem>
                              <SelectItem value="retain">Retain</SelectItem>
                              <SelectItem value="graduate">Graduate</SelectItem>
                              <SelectItem value="transfer_out">Transfer Out</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 min-w-[200px]">
                          <Select
                            value={draft.targetGradeLevelId || "none"}
                            onValueChange={(value) => setDraft(student.id, { targetGradeLevelId: value === "none" ? "" : value, targetSectionId: "" })}
                            disabled={draft.action !== "promote"}
                          >
                            <SelectTrigger data-testid={`select-promotion-target-grade-${student.id}`}>
                              <SelectValue placeholder={draft.action === "promote" ? "Select target grade" : "Not needed"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No target grade</SelectItem>
                              {orderedGradeLevels.map((grade) => (
                                <SelectItem key={grade.id} value={String(grade.id)}>
                                  {grade.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 min-w-[200px]">
                          <Select
                            value={draft.targetSectionId || "none"}
                            onValueChange={(value) => setDraft(student.id, { targetSectionId: value === "none" ? "" : value })}
                            disabled={draft.action === "graduate" || draft.action === "transfer_out" || sectionOptions.length === 0}
                          >
                            <SelectTrigger data-testid={`select-promotion-target-section-${student.id}`}>
                              <SelectValue placeholder="Keep unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No section</SelectItem>
                              {sectionOptions.map((section) => (
                                <SelectItem key={section.id} value={String(section.id)}>
                                  {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No students match the current promotion filter.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adjust the grade, section, or search field to load students for moving up.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply school-year promotion</DialogTitle>
            <DialogDescription>
              This will update the current student records immediately. Review the counts before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Card><CardContent className="p-4"><p className="text-muted-foreground">Promote</p><p className="text-xl font-semibold">{summary.promote}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-muted-foreground">Retain</p><p className="text-xl font-semibold">{summary.retain}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-muted-foreground">Graduate</p><p className="text-xl font-semibold">{summary.graduate}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-muted-foreground">Transfer Out</p><p className="text-xl font-semibold">{summary.transfer_out}</p></CardContent></Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => applyMutation.mutate()} disabled={selectedPayload.length === 0 || invalidPromotionCount > 0 || applyMutation.isPending}>
              {applyMutation.isPending ? "Applying..." : "Confirm Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
