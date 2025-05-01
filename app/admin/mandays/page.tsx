"use client";

import { useState, useEffect, useCallback } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, get } from "firebase/database";
import { AppSidebar } from "@/components/app-sidebar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
  division?: string;
};

type TimePeriod = "day" | "week" | "month" | "quarter" | "year";

const DIVISIONS = ['GACID', 'CATCID', 'EARD', 'MOCSU'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DivisionAnalytics() {
  const [records, setRecords] = useState<MandayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [statusData, setStatusData] = useState<{name: string, value: number}[]>([]);

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
            division: record.division || "Unknown"
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

  // Calculate efficiency percentage
  const calculateEfficiency = (original: number, actual: number) => {
    if (original <= 0 || actual <= 0) return 0;
    return Math.min(Math.round((original / actual) * 100), 100);
  };

  // Get status classification
  const getEfficiencyStatus = useCallback((original: number, actual: number) => {
    const percentage = (actual / original) * 100;
    if (percentage < 90) {
      return { text: "Ahead of Time", color: "text-green-500", category: "ahead" };
    } else if (percentage <= 110) {
      return { text: "On Track", color: "text-blue-500", category: "onTrack" };
    } else {
      return { text: "Overdue", color: "text-red-500", category: "overdue" };
    }
  }, []);

  // Calculate status distribution
  const calculateStatusDistribution = useCallback((records: MandayRecord[]) => {
    const statusCounts = {
      ahead: 0,
      onTrack: 0,
      overdue: 0
    };

    records.forEach(record => {
      const status = getEfficiencyStatus(record.originalWorkingDays, record.actualWorkingDays);
      statusCounts[status.category as keyof typeof statusCounts]++;
    });

    return [
      { name: "Ahead of Time", value: statusCounts.ahead },
      { name: "On Track", value: statusCounts.onTrack },
      { name: "Overdue", value: statusCounts.overdue }
    ];
  }, [getEfficiencyStatus]);

  useEffect(() => {
    const filteredRecords = divisionFilter === "all" 
      ? records 
      : records.filter(r => r.division === divisionFilter);

    // Update status data whenever records or divisionFilter change
    setStatusData(calculateStatusDistribution(filteredRecords));
  }, [records, divisionFilter, calculateStatusDistribution]);

  // Filter and process data for charts
  const getProcessedData = () => {
    const filteredRecords = divisionFilter === "all" 
      ? records 
      : records.filter(r => r.division === divisionFilter);

    const dataMap = new Map<string, {
      period: string;
      originalDays: number;
      actualDays: number;
      efficiency: number;
      count: number;
    }>();

    filteredRecords.forEach(record => {
      const date = new Date(record.dateRecorded);
      let periodKey = "";
      let periodLabel = "";

      switch (timePeriod) {
        case "day":
          periodKey = date.toISOString().split('T')[0];
          periodLabel = new Date(periodKey).toLocaleDateString();
          break;
        case "week":
          const weekNum = Math.ceil(date.getDate() / 7);
          periodKey = `${date.getFullYear()}-W${weekNum}`;
          periodLabel = `Week ${weekNum}, ${date.getFullYear()}`;
          break;
        case "month":
          periodKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          periodLabel = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
          break;
        case "quarter":
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          periodLabel = `Q${quarter} ${date.getFullYear()}`;
          break;
        case "year":
          periodKey = `${date.getFullYear()}`;
          periodLabel = periodKey;
          break;
      }

      if (!dataMap.has(periodKey)) {
        dataMap.set(periodKey, {
          period: periodLabel,
          originalDays: 0,
          actualDays: 0,
          efficiency: 0,
          count: 0
        });
      }

      const periodData = dataMap.get(periodKey)!;
      periodData.originalDays += record.originalWorkingDays;
      periodData.actualDays += record.actualWorkingDays;
      periodData.count += 1;
      periodData.efficiency = calculateEfficiency(periodData.originalDays, periodData.actualDays);
    });

    return Array.from(dataMap.values()).sort((a, b) => {
      const aKey = a.period;
      const bKey = b.period;
      return aKey.localeCompare(bKey);
    });
  };

  const processedData = getProcessedData();
  const filteredRecords = divisionFilter === "all" 
    ? records 
    : records.filter(r => r.division === divisionFilter);

  // Calculate summary statistics
  const totalOriginalDays = filteredRecords.reduce((sum, record) => sum + record.originalWorkingDays, 0);
  const totalActualDays = filteredRecords.reduce((sum, record) => sum + record.actualWorkingDays, 0);
  const efficiency = calculateEfficiency(totalOriginalDays, totalActualDays);
  const efficiencyStatus = getEfficiencyStatus(totalOriginalDays, totalActualDays);

  return (
    <ProtectedRoute allowedDivisions={['admin']}>
      <SidebarProvider>
        <div className="flex w-screen">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <header className="flex h-16 items-center gap-2 border-b px-4 bg-white">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbPage>Analytics</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Division Performance</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold">Division Performance Analytics</h1>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="quarter">Quarterly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filter by Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {DIVISIONS.map(division => (
                        <SelectItem key={division} value={division}>{division}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading division data...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Planned Days</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{totalOriginalDays}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total estimated working days
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Actual Days</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{totalActualDays}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total days actually worked
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{efficiency}%</div>
                        <p className={`text-xs ${efficiencyStatus.color} mt-1 font-medium`}>
                          {efficiencyStatus.text}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{filteredRecords.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Documents processed
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="h-[400px]">
                      <CardHeader>
                        <CardTitle>Division Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-56px)]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={processedData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="originalDays" name="Planned Days" fill="#8884d8" />
                            <Bar dataKey="actualDays" name="Actual Days" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="h-[400px]">
                      <CardHeader>
                        <CardTitle>Efficiency Trend</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-56px)]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={processedData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="efficiency" name="Efficiency %" fill="#ffc658" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="h-[400px]">
                      <CardHeader>
                        <CardTitle>Status Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-56px)]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto max-h-[500px]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead className="min-w-[120px]">AWD No.</TableHead>
                              <TableHead className="min-w-[180px]">Division</TableHead>
                              <TableHead className="min-w-[100px]">Planned</TableHead>
                              <TableHead className="min-w-[100px]">Actual</TableHead>
                              <TableHead className="min-w-[120px]">Start Date</TableHead>
                              <TableHead className="min-w-[120px]">End Date</TableHead>
                              <TableHead className="min-w-[100px]">Efficiency</TableHead>
                              <TableHead className="min-w-[150px]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRecords.map((record) => {
                              const recordEfficiency = calculateEfficiency(record.originalWorkingDays, record.actualWorkingDays);
                              const recordStatus = getEfficiencyStatus(record.originalWorkingDays, record.actualWorkingDays);
                              return (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium">{record.awdReferenceNumber}</TableCell>
                                  <TableCell>{record.inspectorName}</TableCell>
                                  <TableCell>{record.originalWorkingDays}</TableCell>
                                  <TableCell>{record.actualWorkingDays}</TableCell>
                                  <TableCell>{new Date(record.startDate).toLocaleDateString()}</TableCell>
                                  <TableCell>{new Date(record.endDate).toLocaleDateString()}</TableCell>
                                  <TableCell>{recordEfficiency}%</TableCell>
                                  <TableCell className={recordStatus.color}>{recordStatus.text}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
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