import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Plus, Trash2 } from "lucide-react";

type Holiday = {
  id: number;
  schoolId: number;
  date: string;
  name: string;
  type: string;
  isRecurring: boolean;
};

export default function SettingsHolidaysPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [type, setType] = useState("holiday");
  const [isRecurring, setIsRecurring] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/holidays", {
        date,
        name,
        type,
        isRecurring,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      setName("");
      setType("holiday");
      setIsRecurring(false);
      toast({ title: "Holiday added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
      toast({ title: "Holiday removed" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmDelete = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">School Holidays</h1>
          <p className="text-sm text-muted-foreground">Exclude non-school days from attendance KPIs, reports, and risk scoring.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Foundation Day" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="no_classes">No classes</SelectItem>
                  <SelectItem value="special_schedule">Special schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between rounded-md border px-3 py-2">
              <div>
                <Label>Recurring yearly</Label>
                <p className="text-xs text-muted-foreground">For future expansion</p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !date || !name.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              {createMutation.isPending ? "Adding..." : "Add Holiday"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : holidays && holidays.length > 0 ? (
            <div className="divide-y">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.date} • {h.type}
                      {h.isRecurring ? " • recurring" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(h)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No holidays configured yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Holiday</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{holidayToDelete?.name}</strong> on{" "}
              <strong>{holidayToDelete?.date}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => holidayToDelete && deleteMutation.mutate(holidayToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-holiday"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
