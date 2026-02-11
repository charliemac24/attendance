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
import { Plus, Edit, ScanLine, Trash2 } from "lucide-react";
import type { KioskLocation } from "@shared/schema";

export default function KiosksPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KioskLocation | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { toast } = useToast();

  const { data: kiosks, isLoading } = useQuery<KioskLocation[]>({
    queryKey: ["/api/kiosks"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await apiRequest("PATCH", `/api/kiosks/${editing.id}`, { name, slug });
      } else {
        await apiRequest("POST", "/api/kiosks", { name, slug });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] });
      setDialogOpen(false);
      toast({ title: editing ? "Kiosk updated" : "Kiosk created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/kiosks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] });
      toast({ title: "Kiosk deleted" });
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
            <ScanLine className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold" data-testid="text-kiosks-title">Kiosk Locations</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setName("");
            setSlug("");
            setDialogOpen(true);
          }}
          data-testid="button-add-kiosk"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Kiosk
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
          ) : kiosks && kiosks.length > 0 ? (
            <div className="divide-y">
              {kiosks.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <span className="font-medium">{k.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">/{k.slug}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(k);
                        setName(k.name);
                        setSlug(k.slug);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(k.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <ScanLine className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No kiosks yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kiosk" : "Add Kiosk"}</DialogTitle>
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
                placeholder="e.g. Main Gate"
                required
                data-testid="input-kiosk-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. main-gate"
                required
                data-testid="input-kiosk-slug"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-kiosk">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
