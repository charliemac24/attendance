import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import type { SmsLog } from "@shared/schema";

type SmsLogWithStudent = SmsLog & { studentName?: string };

export default function SmsLogsPage() {
  const { data: logs, isLoading } = useQuery<SmsLogWithStudent[]>({
    queryKey: ["/api/sms-logs"],
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold" data-testid="text-sms-logs-title">SMS Logs</h1>
      </div>

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
                    <th className="text-left py-3 px-4 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-medium">
                        {log.studentName || "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {log.templateType || "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{log.toPhone}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {log.message}
                      </td>
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
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No SMS logs yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
