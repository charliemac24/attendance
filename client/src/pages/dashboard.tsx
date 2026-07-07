import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getGradeLevelSortRank, normalizeGradeLevelName } from "@shared/grade-levels";
import {
  UserCheck,
  HelpCircle,
  Calendar,
  Trash2,
} from "lucide-react";
import { formatDatabaseTime, localIsoDate } from "@/lib/utils";
import type { School } from "@shared/schema";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";

interface DashboardData {
  date: string;
  kpis: {
    checkedOut: number;
    lateArrivals: number;
    onCampus: number;
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
  gradeBreakdown: Array<{
    gradeLevel: string;
    totalStudents: number;
    checkedIn: number;
    checkedOut: number;
    attendanceRate: number;
    lateArrivals: number;
    absent: number;
    onCampus: number;
    notCheckedIn: number;
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    localIsoDate()
  );

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard?date=${selectedDate}`],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const { data: school } = useQuery<School>({
    queryKey: ["/api/settings/school"],
    refetchOnWindowFocus: true,
  });
  const { data: intelligence, isLoading: isIntelligenceLoading } = useQuery<AttendanceIntelligenceData>({
    queryKey: [`/api/attendance-intelligence?date=${selectedDate}`],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    enabled: (school?.showStudentsNeedingAttention ?? true),
  });

  const riskFlagLabel: Record<string, string> = {
    chronic_absent: "Chronic absent",
    frequent_late: "Frequent late",
    missing_checkout_pattern: "Missing check-out",
    low_attendance_score: "Low score",
  };

  const getPrimaryAttentionReason = (student: AttendanceIntelligenceData["atRiskStudents"][number]) => {
    if (student.riskFlags.includes("chronic_absent")) return "Chronic absences";
    if (student.riskFlags.includes("low_attendance_score")) return "Low attendance score";
    if (student.riskFlags.includes("missing_checkout_pattern")) return "Missing check-out pattern";
    if (student.riskFlags.includes("frequent_late")) return "Frequent late arrivals";
    if (student.trend === "declining") return "Declining recently";
    return "Needs review";
  };

  const getAttentionExplanation = (student: AttendanceIntelligenceData["atRiskStudents"][number]) => {
    if (student.riskFlags.includes("chronic_absent")) {
      return "Attendance history shows repeated absences in the selected window.";
    }
    if (student.riskFlags.includes("low_attendance_score")) {
      return "Overall attendance score dropped below the healthy range.";
    }
    if (student.riskFlags.includes("missing_checkout_pattern")) {
      return "This student has several missing check-out records.";
    }
    if (student.riskFlags.includes("frequent_late")) {
      return "This student has multiple late arrivals in the selected window.";
    }
    if (student.trend === "declining") {
      return "Recent attendance performance is weaker than the earlier part of the selected window.";
    }
    return "This student has attendance patterns worth reviewing.";
  };

  const getAttentionBadge = (student: AttendanceIntelligenceData["atRiskStudents"][number]) => {
    if (student.riskFlags.includes("chronic_absent") || student.riskFlags.includes("low_attendance_score")) {
      return { label: "High risk", className: "bg-red-100 text-red-700 border-red-200" };
    }
    if (student.riskFlags.length > 0) {
      return { label: "Needs review", className: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    if (student.trend === "declining") {
      return { label: "Trend watch", className: "bg-orange-100 text-orange-800 border-orange-200" };
    }
    return { label: "Watchlist", className: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  const getTrendBadgeClass = (trend: AttendanceIntelligenceData["atRiskStudents"][number]["trend"]) => {
    if (trend === "declining") return "bg-orange-100 text-orange-800 border-orange-200";
    if (trend === "improving") return "bg-green-100 text-green-700 border-green-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const presentToday = (data?.kpis.checkedOut ?? 0) + (data?.kpis.onCampus ?? 0);
  const gradeBreakdown = [...(data?.gradeBreakdown || [])].sort(
    (a, b) => getGradeLevelSortRank(a.gradeLevel) - getGradeLevelSortRank(b.gradeLevel),
  );
  const clearRecentActivityMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/dashboard/recent-activity");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/dashboard?date=${selectedDate}`] });
      toast({ title: "Recent activity cleared" });
    },
    onError: (err: any) => {
      toast({ title: "Clear failed", description: err.message, variant: "destructive" });
    },
  });
  const kpiCards = [
    {
      label: "Present Today",
      value: presentToday,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      description: "Students who checked in today",
      breakdown: [
        { label: "Late Arrivals", value: data?.kpis.lateArrivals ?? 0, href: `/today/late?date=${selectedDate}` },
        { label: "Checked Out", value: data?.kpis.checkedOut ?? 0, href: `/today/present?date=${selectedDate}` },
        { label: "Still In School", value: data?.kpis.onCampus ?? 0, href: `/today/pending-checkout?date=${selectedDate}` },
      ],
    },
    {
      label: "Not Yet Checked In",
      value: data?.kpis.notCheckedIn ?? 0,
      icon: HelpCircle,
      color: "text-slate-600 dark:text-slate-300",
      bgColor: "bg-slate-100 dark:bg-slate-800/60",
      description: "Active students with no attendance record yet",
    },
  ];

  const setToday = () => setSelectedDate(new Date().toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  };

  const handleClearRecentActivity = () => {
    if (!window.confirm("Clear all recent activity entries for this school?")) return;
    clearRecentActivityMutation.mutate();
  };

  const chartConfig = {
    attendanceRate: { label: "Attendance %", color: "hsl(201 96% 32%)" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <Card key={kpi.label} data-testid={`card-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${kpi.bgColor}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {kpi.label}
                      </p>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                      {"description" in kpi && kpi.description ? (
                        <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                      ) : null}
                    </div>
                  </div>
                  {"breakdown" in kpi && kpi.breakdown ? (
                    <div className="grid grid-cols-3 gap-2 border-t pt-3">
                      {kpi.breakdown.map((item) => (
                        <Link key={item.label} href={item.href}>
                          <a
                            className="block rounded-lg bg-muted/40 px-3 py-2 transition-colors hover:bg-muted/70"
                            data-testid={`link-kpi-breakdown-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="text-lg font-semibold">{item.value}</p>
                          </a>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Late arrivals are already included in <span className="font-medium text-foreground">Present Today</span>.
        </p>
      )}

      {data?.kpis.total !== undefined && (
        <div className="flex items-baseline gap-2 text-lg">
          <span className="text-muted-foreground font-semibold">Total active students:</span>
          <span className="text-3xl font-black text-foreground leading-none">{data.kpis.total}</span>
        </div>
      )}

      {(school?.showStudentsNeedingAttention ?? true) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <h3 className="text-sm font-semibold">Students Needing Attention</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Students appear here for attendance risk flags or a declining recent trend.
              </p>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              {intelligence?.summary.atRiskCount ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            {isIntelligenceLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : intelligence?.atRiskStudents && intelligence.atRiskStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">Student</th>
                      <th className="text-left py-2 pr-3 font-medium">Class</th>
                      <th className="text-left py-2 pr-3 font-medium">Attention</th>
                      <th className="text-left py-2 pr-3 font-medium">Reason</th>
                      <th className="text-left py-2 pr-3 font-medium">Score</th>
                      <th className="text-left py-2 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intelligence.atRiskStudents.slice(0, 9).map((s) => {
                      const attentionBadge = getAttentionBadge(s);
                      return (
                        <tr key={s.studentId} className="border-b last:border-0 align-top">
                          <td className="py-3 pr-3">
                            <p className="font-semibold text-foreground">{s.studentName}</p>
                            <p className="text-xs text-muted-foreground">{s.studentNo}</p>
                          </td>
                          <td className="py-3 pr-3 text-muted-foreground">
                            {s.gradeLevel} / {s.section}
                          </td>
                          <td className="py-3 pr-3">
                            <Badge className={`border text-[10px] font-semibold ${attentionBadge.className}`}>
                              {attentionBadge.label}
                            </Badge>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="font-medium text-foreground">{getPrimaryAttentionReason(s)}</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                              {s.riskFlags.length > 0
                                ? s.riskFlags.slice(0, 3).map((flag) => riskFlagLabel[flag] || flag).join(", ")
                                : getAttentionExplanation(s)}
                            </p>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="inline-flex rounded-md border bg-muted/30 px-2.5 py-1.5 font-semibold">
                              {s.score}
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge className={`border text-[10px] capitalize ${getTrendBadgeClass(s.trend)}`}>
                              {s.trend}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No students needing attention in the selected window</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <h3 className="text-sm font-semibold">Attendance By Grade</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of active students with attendance for the selected date.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : gradeBreakdown.length > 0 ? (
              <div className="space-y-5">
                <ChartContainer config={chartConfig} className="h-[260px] w-full">
                  <BarChart data={gradeBreakdown} margin={{ top: 16, right: 8, left: 20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="gradeLevel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => normalizeGradeLevelName(String(value))}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={72}
                      domain={[0, 100]}
                      allowDecimals={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideIndicator
                          formatter={(_value, _name, item) => {
                            const row = item.payload as DashboardData["gradeBreakdown"][number];
                            return (
                              <div className="space-y-1">
                                <div className="font-medium">{row.gradeLevel}</div>
                                <div>{row.attendanceRate}% attendance</div>
                                <div className="text-muted-foreground">Present: {row.checkedIn} / {row.totalStudents}</div>
                                <div className="text-muted-foreground">Absent: {row.absent}</div>
                                <div className="text-muted-foreground">Not checked in: {row.notCheckedIn}</div>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Bar dataKey="attendanceRate" radius={[6, 6, 0, 0]}>
                      {gradeBreakdown.map((row) => (
                        <Cell
                          key={row.gradeLevel}
                          fill={
                            row.attendanceRate >= 90
                              ? "#15803d"
                              : row.attendanceRate >= 75
                                ? "#0f766e"
                                : row.attendanceRate >= 50
                                  ? "#d97706"
                                  : "#b91c1c"
                          }
                        />
                      ))}
                      <LabelList dataKey="attendanceRate" position="top" formatter={(value: number) => `${value}%`} />
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Grade</th>
                        <th className="text-right py-2 px-2 font-medium">Attendance</th>
                        <th className="text-right py-2 px-2 font-medium">Present</th>
                        <th className="text-right py-2 px-2 font-medium">Not In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeBreakdown.map((row) => (
                        <tr key={row.gradeLevel} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{row.gradeLevel}</td>
                          <td className="py-2 px-2 text-right">{row.attendanceRate}%</td>
                          <td className="py-2 px-2 text-right text-green-700">{row.checkedIn}</td>
                          <td className="py-2 px-2 text-right text-slate-600">{row.notCheckedIn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No data for this date</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            {(user?.role === "super_admin" || user?.role === "school_admin") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearRecentActivity}
                disabled={clearRecentActivityMutation.isPending || !data?.recentEvents?.length}
                data-testid="button-clear-recent-activity"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {clearRecentActivityMutation.isPending ? "Clearing..." : "Clear"}
              </Button>
            )}
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
                      {formatDatabaseTime(event.occurredAt)}
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
