import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, GraduationCap, Trash2 } from "lucide-react";
import type { GradeLevel } from "@shared/schema";

export default function GradeLevelsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GradeLevel | null>(null);
  const [name, setName] = useState("");
  const { toast } = useToast();

  const { data: gradeLevels, isLoading } = useQuery<GradeLevel[]>({
    queryKey: ["/api/grade-levels"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await apiRequest("PATCH", `/api/grade-levels/${editing.id}`, { name });
      } else {
        await apiRequest("POST", "/api/grade-levels", { name });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-levels"] });
      setDialogOpen(false);
      setEditing(null);
      setName("");
      toast({ title: editing ? "Grade level updated" : "Grade level created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/grade-levels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-levels"] });
      toast({ title: "Grade level deleted" });
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
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold" data-testid="text-grade-levels-title">Grade Levels</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setName("");
            setDialogOpen(true);
          }}
          data-testid="button-add-grade-level"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Grade Level
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
          ) : gradeLevels && gradeLevels.length > 0 ? (
            <div className="divide-y">
              {gradeLevels.map((gl) => (
                <div key={gl.id} className="flex items-center justify-between gap-2 px-4 py-3" data-testid={`row-grade-${gl.id}`}>
                  <span className="font-medium">{gl.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(gl);
                        setName(gl.name);
                        setDialogOpen(true);
                      }}
                      data-testid={`button-edit-grade-${gl.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(gl.id)}
                      data-testid={`button-delete-grade-${gl.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No grade levels yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Grade Level" : "Add Grade Level"}
            </DialogTitle>
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
                placeholder="e.g. Grade 1"
                required
                data-testid="input-grade-level-name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-grade-level">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
