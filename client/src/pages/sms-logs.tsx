import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { SmsLog } from "@shared/schema";

type SmsLogWithStudent = SmsLog & { studentName?: string };

async function downloadSmsCsv(from: string, to: string) {
  const res = await fetch(`/api/sms-logs/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const raw = await res.text();
    let message = raw || "Failed to export SMS logs";
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        message = parsed.message.trim();
      }
    } catch {
      // keep raw message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sms-logs-${from}-to-${to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function SmsLogsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const { data: logs, isLoading } = useQuery<SmsLogWithStudent[]>({
    queryKey: ["sms-logs", fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/sms-logs?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(raw || "Failed to load SMS logs");
      }
      return res.json();
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      await downloadSmsCsv(fromDate, toDate);
    },
    onSuccess: () => {
      toast({ title: "CSV exported" });
    },
    onError: (err: any) => {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteSmsLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/purge-logs", {
        from: fromDate,
        to: toDate,
        deleteAttendance: false,
        deleteSms: true,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "SMS logs deleted",
        description: `Deleted ${data.smsLogsDeleted} SMS logs from ${data.from} to ${data.to}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["sms-logs"] });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold" data-testid="text-sms-logs-title">SMS Logs</h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                data-testid="input-sms-logs-from"
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                data-testid="input-sms-logs-to"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={!fromDate || !toDate || exportMutation.isPending}
              data-testid="button-export-sms-logs-csv"
            >
              {exportMutation.isPending ? "Exporting..." : "Export CSV"}
            </Button>
            {user?.role === "super_admin" && (
              <Button
                variant="destructive"
                disabled={!fromDate || !toDate || deleteSmsLogsMutation.isPending}
                data-testid="button-delete-sms-logs-range"
                onClick={() => {
                  const ok = window.confirm(
                    `Delete SMS logs from ${fromDate} to ${toDate}? This cannot be undone.`,
                  );
                  if (!ok) return;
                  deleteSmsLogsMutation.mutate();
                }}
              >
                {deleteSmsLogsMutation.isPending ? "Deleting..." : "Delete SMS Logs"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">To</th>
                    <th className="text-left py-3 px-4 font-medium">Message</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Details</th>
                    <th className="text-left py-3 px-4 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-medium">{log.studentName || "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{log.templateType || "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{log.toPhone}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{log.message}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            log.status === "sent"
                              ? "default"
                              : log.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className="no-default-hover-elevate no-default-active-elevate"
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-sm">
                        <span className="line-clamp-2">
                          {log.errorMessage ||
                            (log.providerResponse
                              ? JSON.stringify(log.providerResponse)
                              : "-")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No SMS logs found in the selected date range</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
