import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserCheck,
  Clock,
  AlertTriangle,
  UserX,
  HelpCircle,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { localIsoDate } from "@/lib/utils";

interface DashboardData {
  date: string;
  kpis: {
    present: number;
    late: number;
    pendingCheckout: number;
    absent: number;
    notCheckedIn: number;
    total: number;
  };
  recentEvents: Array<{
    id: number;
    studentName: string;
    eventType: string;
    occurredAt: string;
  }>;
  sectionBreakdown: Array<{
    section: string;
    gradeLevel: string;
    present: number;
    late: number;
    absent: number;
    pendingCheckout: number;
    total: number;
  }>;
}

interface AttendanceIntelligenceData {
  window: { startDate: string; endDate: string };
  summary: { totalStudents: number; atRiskCount: number };
  atRiskStudents: Array<{
    studentId: number;
    studentNo: string;
    studentName: string;
    gradeLevel: string;
    section: string;
    score: number;
    trend: "improving" | "stable" | "declining";
    riskFlags: string[];
  }>;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(
    localIsoDate()
  );

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard?date=${selectedDate}`],
  });
  const { data: intelligence, isLoading: isIntelligenceLoading } = useQuery<AttendanceIntelligenceData>({
    queryKey: [`/api/attendance-intelligence?date=${selectedDate}`],
  });

  const riskFlagLabel: Record<string, string> = {
    chronic_absent: "Chronic absent",
    frequent_late: "Frequent late",
    missing_checkout_pattern: "Missing check-out",
    low_attendance_score: "Low score",
  };

  const kpiCards = [
    {
      label: "Present",
      value: data?.kpis.present ?? 0,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      href: `/today/present?date=${selectedDate}`,
    },
    {
      label: "Late",
      value: data?.kpis.late ?? 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      href: `/today/late?date=${selectedDate}`,
    },
    {
      label: "Pending Checkout",
      value: data?.kpis.pendingCheckout ?? 0,
      icon: AlertTriangle,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      href: `/today/pending-checkout?date=${selectedDate}`,
    },
    {
      label: "Absent",
      value: data?.kpis.absent ?? 0,
      icon: UserX,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      href: `/today/absent?date=${selectedDate}`,
    },
    {
      label: "Not Checked In",
      value: data?.kpis.notCheckedIn ?? 0,
      icon: HelpCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      href: `/today/not-checked-in-yet?date=${selectedDate}`,
    },
  ];

  const setToday = () => setSelectedDate(new Date().toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Attendance overview for {selectedDate}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={setToday} data-testid="button-today">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={setYesterday} data-testid="button-yesterday">
            Yesterday
          </Button>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              data-testid="input-date-picker"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <Link key={kpi.label} href={kpi.href}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${kpi.bgColor}`}>
                        <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          {kpi.label}
                        </p>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {data?.kpis.total !== undefined && (
        <div className="text-sm text-muted-foreground">
          Total active students: <span className="font-medium text-foreground">{data.kpis.total}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <h3 className="text-sm font-semibold">At-Risk Students</h3>
          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
            {intelligence?.summary.atRiskCount ?? 0}
          </Badge>
        </CardHeader>
        <CardContent>
          {isIntelligenceLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : intelligence?.atRiskStudents && intelligence.atRiskStudents.length > 0 ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {intelligence.atRiskStudents.slice(0, 9).map((s) => (
                <div key={s.studentId} className="border rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.studentNo} • {s.gradeLevel} / {s.section}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">Score {s.score}</p>
                      <Badge
                        variant={
                          s.trend === "declining"
                            ? "destructive"
                            : s.trend === "improving"
                              ? "default"
                              : "secondary"
                        }
                        className="text-[10px] mt-1 no-default-hover-elevate no-default-active-elevate"
                      >
                        {s.trend}
                      </Badge>
                    </div>
                  </div>
                  {s.riskFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.riskFlags.slice(0, 3).map((flag) => (
                        <Badge key={flag} variant="outline" className="text-[10px]">
                          {riskFlagLabel[flag] || flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No at-risk students in selected window</p>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <h3 className="text-sm font-semibold">Section Breakdown</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : data?.sectionBreakdown && data.sectionBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-2 font-medium">Section</th>
                      <th className="text-center py-2 px-1 font-medium">P</th>
                      <th className="text-center py-2 px-1 font-medium">L</th>
                      <th className="text-center py-2 px-1 font-medium">A</th>
                      <th className="text-center py-2 px-1 font-medium">PC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sectionBreakdown.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <span className="font-medium">{row.section}</span>
                          <span className="text-muted-foreground text-xs ml-1">({row.gradeLevel})</span>
                        </td>
                        <td className="text-center py-2 px-1 text-green-600 dark:text-green-400">{row.present}</td>
                        <td className="text-center py-2 px-1 text-amber-600 dark:text-amber-400">{row.late}</td>
                        <td className="text-center py-2 px-1 text-red-600 dark:text-red-400">{row.absent}</td>
                        <td className="text-center py-2 px-1 text-blue-600 dark:text-blue-400">{row.pendingCheckout}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No data for this date</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : data?.recentEvents && data.recentEvents.length > 0 ? (
              <div className="space-y-3">
                {data.recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{event.studentName}</p>
                      <p className="text-xs text-muted-foreground">{event.eventType}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.occurredAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
