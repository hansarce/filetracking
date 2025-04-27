"use client";

import { useState, useEffect, useCallback } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, get } from "firebase/database";
import { AppSidebarSecretary } from "@/components/app-sidebar-sec";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import ProtectedRoute from '@/components/protected-route';
type MandayRecord = {
  id: string;
  awdReferenceNumber: string;
  originalWorkingDays: number;
  actualWorkingDays: number;
  inspectorName: string;
  startDate: string;
  endDate: string;
  dateRecorded: string;
  status?: string; // Assuming status might exist for documents
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function MandaysDashboard() {
  const [records, setRecords] = useState<MandayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectorFilter, setInspectorFilter] = useState<string>("all");

  const fetchMandays = useCallback(async () => {
    try {
      setLoading(true);
      const mandaysRef = ref(database, "mandays");
      const snapshot = await get(mandaysRef);
      
      if (snapshot.exists()) {
        const fetchedRecords: MandayRecord[] = [];
        snapshot.forEach((childSnapshot) => {
          const record = childSnapshot.val();
          fetchedRecords.push({
            id: childSnapshot.key || "",
            awdReferenceNumber: record.awdReferenceNumber || "N/A",
            originalWorkingDays: parseInt(record.originalWorkingDays) || 0,
            actualWorkingDays: parseInt(record.actualWorkingDays) || 0,
            inspectorName: record.inspectorName || "Unknown",
            startDate: record.startDate || "N/A",
            endDate: record.endDate || "N/A",
            dateRecorded: record.dateRecorded || new Date().toISOString(),
            status: record.status || "open" // Default status if not provided
          });
        });
        setRecords(fetchedRecords);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Error fetching mandays:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMandays();
  }, [fetchMandays]);

  // Get unique inspectors for filter
  const inspectors = Array.from(new Set(records.map(r => r.inspectorName))).sort();

  // Calculate efficiency percentage
  const calculateEfficiency = (original: number, actual: number) => {
    if (original <= 0 || actual <= 0) return 0;
    return Math.min(Math.round((original / actual) * 100), 100);
  };

  // Filter records based on inspector selection
  const filteredRecords = inspectorFilter === "all" 
    ? records 
    : records.filter(r => r.inspectorName === inspectorFilter);

  // Calculate daily, weekly, monthly comparisons
  const getComparisonData = (period: 'day' | 'week' | 'month') => {
    const now = new Date();
    const periodRecords = filteredRecords.filter(record => {
      const recordDate = new Date(record.dateRecorded);
      switch (period) {
        case 'day':
          return (
            recordDate.getDate() === now.getDate() &&
            recordDate.getMonth() === now.getMonth() &&
            recordDate.getFullYear() === now.getFullYear()
          );
        case 'week':
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return recordDate >= oneWeekAgo;
        case 'month':
          return (
            recordDate.getMonth() === now.getMonth() &&
            recordDate.getFullYear() === now.getFullYear()
          );
      }
    });

    const original = periodRecords.reduce((sum, r) => sum + r.originalWorkingDays, 0);
    const actual = periodRecords.reduce((sum, r) => sum + r.actualWorkingDays, 0);
    const efficiency = calculateEfficiency(original, actual);

    return { original, actual, efficiency };
  };

  // Calculate annual comparison
  const getAnnualComparison = () => {
    const now = new Date();
    const yearRecords = filteredRecords.filter(record => {
      const recordDate = new Date(record.dateRecorded);
      return recordDate.getFullYear() === now.getFullYear();
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthRecords = yearRecords.filter(record => {
        const recordDate = new Date(record.dateRecorded);
        return recordDate.getMonth() === i;
      });

      const original = monthRecords.reduce((sum, r) => sum + r.originalWorkingDays, 0);
      const actual = monthRecords.reduce((sum, r) => sum + r.actualWorkingDays, 0);
      const efficiency = calculateEfficiency(original, actual);

      return {
        name: new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'short' }),
        original,
        actual,
        efficiency
      };
    });

    return monthlyData;
  };

  // Calculate document status counts
  const documentStatusData = [
    { name: 'Open', value: filteredRecords.filter(r => r.status === 'open').length },
    { name: 'Closed', value: filteredRecords.filter(r => r.status === 'closed').length }
  ];

  // Get comparison data
  const dailyComparison = getComparisonData('day');
  const weeklyComparison = getComparisonData('week');
  const monthlyComparison = getComparisonData('month');
  const annualComparisonData = getAnnualComparison();

  return (
    <ProtectedRoute allowedDivisions={['secretary']}>
    <SidebarProvider>
      <div className="flex w-screen">
        <AppSidebarSecretary />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="flex h-16 items-center gap-2 border-b px-4 bg-white">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Mandays Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold">Mandays Efficiency Dashboard</h1>
              <div className="w-full md:w-[200px]">
                <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Inspector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Inspectors</SelectItem>
                    {inspectors.map(inspector => (
                      <SelectItem key={inspector} value={inspector}>{inspector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading dashboard data...</p>
              </div>
            ) : (
              <>
                {/* Top 3 Cards - Daily, Weekly, Monthly Comparisons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Efficiency</CardTitle>
                      <CardDescription>Today&apos;s performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dailyComparison.efficiency}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        <div>Planned: {dailyComparison.original} days</div>
                        <div>Actual: {dailyComparison.actual} days</div>
                      </div>
                      <Progress value={dailyComparison.efficiency} className="mt-4 h-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Efficiency</CardTitle>
                      <CardDescription>This week&apos;s performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {weeklyComparison.efficiency}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        <div>Planned: {weeklyComparison.original} days</div>
                        <div>Actual: {weeklyComparison.actual} days</div>
                      </div>
                      <Progress value={weeklyComparison.efficiency} className="mt-4 h-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Efficiency</CardTitle>
                      <CardDescription>This month&apos;s performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {monthlyComparison.efficiency}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        <div>Planned: {monthlyComparison.original} days</div>
                        <div>Actual: {monthlyComparison.actual} days</div>
                      </div>
                      <Progress value={monthlyComparison.efficiency} className="mt-4 h-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* Middle 2 Cards - Document Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="h-[300px]">
                    <CardHeader>
                      <CardTitle>Ongoing Documents</CardTitle>
                      <CardDescription>Status: Open</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-72px)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={documentStatusData.filter(d => d.name === 'Open')}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {documentStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="text-center text-xl font-semibold">
                        {documentStatusData.find(d => d.name === 'Open')?.value || 0} Documents
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-[300px]">
                    <CardHeader>
                      <CardTitle>Closed Documents</CardTitle>
                      <CardDescription>Status: Closed</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-72px)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={documentStatusData.filter(d => d.name === 'Closed')}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {documentStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="text-center text-xl font-semibold">
                        {documentStatusData.find(d => d.name === 'Closed')?.value || 0} Documents
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom Card - Annual Comparison */}
                <Card className="h-[400px]">
                  <CardHeader>
                    <CardTitle>Annual Comparison</CardTitle>
                    <CardDescription>Monthly breakdown for current year</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-72px)]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={annualComparisonData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="original" name="Planned Days" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="actual" name="Actual Days" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </ProtectedRoute>
  );
}