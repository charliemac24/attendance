import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Layers, Trash2 } from "lucide-react";
import type { GradeLevel } from "@shared/schema";

type SectionWithGrade = { id: number; name: string; schoolId: number; gradeLevelId: number; gradeLevelName?: string };

export default function SectionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SectionWithGrade | null>(null);
  const [name, setName] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const { toast } = useToast();

  const { data: sections, isLoading } = useQuery<SectionWithGrade[]>({
    queryKey: ["/api/sections"],
  });

  const { data: gradeLevels } = useQuery<GradeLevel[]>({
    queryKey: ["/api/grade-levels"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await apiRequest("PATCH", `/api/sections/${editing.id}`, {
          name,
          gradeLevelId: Number(gradeLevelId),
        });
      } else {
        await apiRequest("POST", "/api/sections", {
          name,
          gradeLevelId: Number(gradeLevelId),
        });
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
      toast({ title: "Section deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(s);
                        setName(s.name);
                        setGradeLevelId(String(s.gradeLevelId));
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}>
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
        <DialogContent className="max-w-sm">
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
    </div>
  );
}
