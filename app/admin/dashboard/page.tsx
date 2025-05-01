"use client";

import { useState, useEffect, useCallback } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, get, onValue } from "firebase/database";
import { format, subDays } from "date-fns";
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
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
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
  status?: string;
  division?: string;
};

type TrackRecord = {
  id: string;
  awdReferenceNumber: string;
  originatingOffice: string;
  subject: string;
  dateTimeSubmitted: string;
  dateClosed?: string;
  forwardedTo: string;
  status: string;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const DIVISIONS = ['GACID', 'CATCID', 'EARD', 'MOCSU'];

export default function DivisionDashboard() {
  const [records, setRecords] = useState<MandayRecord[]>([]);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [weeklyData, setWeeklyData] = useState<{closed: number; ongoing: number}>({closed: 0, ongoing: 0});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const mandaysRef = ref(database, "mandays");
      const tracksRef = ref(database, "documents");
      
      const [mandaysSnapshot, tracksSnapshot] = await Promise.all([
        get(mandaysRef),
        get(tracksRef)
      ]);
      
      if (mandaysSnapshot.exists()) {
        const fetchedRecords: MandayRecord[] = [];
        mandaysSnapshot.forEach((childSnapshot) => {
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
            status: record.status || "open",
            division: record.division || "Unknown"
          });
        });
        setRecords(fetchedRecords);
      } else {
        setRecords([]);
      }

      if (tracksSnapshot.exists()) {
        const fetchedTracks: TrackRecord[] = [];
        tracksSnapshot.forEach((childSnapshot) => {
          const track = childSnapshot.val();
          
          // Flexible date parsing
          let submittedDate = "";
          if (track.dateTimeSubmitted) {
            if (track.dateTimeSubmitted.includes(',')) {
              submittedDate = track.dateTimeSubmitted.split(',')[0].trim();
            } else {
              const dateObj = new Date(track.dateTimeSubmitted);
              submittedDate = format(dateObj, 'MM/dd/yyyy');
            }
          } else {
            submittedDate = format(new Date(), 'MM/dd/yyyy');
          }

          let closedDate = "";
          if (track.dateClosed) {
            if (track.dateClosed.includes(',')) {
              closedDate = track.dateClosed.split(',')[0].trim();
            } else {
              const dateObj = new Date(track.dateClosed);
              closedDate = format(dateObj, 'MM/dd/yyyy');
            }
          }

          fetchedTracks.push({
            id: childSnapshot.key || "",
            awdReferenceNumber: track.awdReferenceNumber || "N/A",
            originatingOffice: track.originatingOffice || "Unknown",
            subject: track.subject || "No subject",
            dateTimeSubmitted: submittedDate,
            dateClosed: closedDate,
            forwardedTo: track.forwardedTo || "Unknown",
            status: track.status || "Open"
          });
        });
        setTracks(fetchedTracks);
        
        // Calculate weekly document status
        updateWeeklyDocumentStatus(fetchedTracks);
      } else {
        setTracks([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWeeklyDocumentStatus = (trackRecords: TrackRecord[]) => {
    const oneWeekAgo = subDays(new Date(), 7);
    
    const weeklyRecords = trackRecords.filter(track => {
      const trackDate = track.status === 'Closed' && track.dateClosed 
        ? new Date(track.dateClosed)
        : new Date(track.dateTimeSubmitted);
      return trackDate >= oneWeekAgo;
    });

    setWeeklyData({
      closed: weeklyRecords.filter(t => t.status === 'Closed').length,
      ongoing: weeklyRecords.filter(t => t.status !== 'Closed').length
    });
  };

  useEffect(() => {
    fetchData();

    // Set up real-time listener for tracks
    const tracksRef = ref(database, "documents");
    const unsubscribe = onValue(tracksRef, (snapshot) => {
      if (snapshot.exists()) {
        const updatedTracks: TrackRecord[] = [];
        snapshot.forEach((childSnapshot) => {
          const track = childSnapshot.val();
          
          let submittedDate = "";
          if (track.dateTimeSubmitted) {
            if (track.dateTimeSubmitted.includes(',')) {
              submittedDate = track.dateTimeSubmitted.split(',')[0].trim();
            } else {
              const dateObj = new Date(track.dateTimeSubmitted);
              submittedDate = format(dateObj, 'MM/dd/yyyy');
            }
          } else {
            submittedDate = format(new Date(), 'MM/dd/yyyy');
          }

          let closedDate = "";
          if (track.dateClosed) {
            if (track.dateClosed.includes(',')) {
              closedDate = track.dateClosed.split(',')[0].trim();
            } else {
              const dateObj = new Date(track.dateClosed);
              closedDate = format(dateObj, 'MM/dd/yyyy');
            }
          }

          updatedTracks.push({
            id: childSnapshot.key || "",
            awdReferenceNumber: track.awdReferenceNumber || "N/A",
            originatingOffice: track.originatingOffice || "Unknown",
            subject: track.subject || "No subject",
            dateTimeSubmitted: submittedDate,
            dateClosed: closedDate,
            forwardedTo: track.forwardedTo || "Unknown",
            status: track.status || "Open"
          });
        });
        setTracks(updatedTracks);
        updateWeeklyDocumentStatus(updatedTracks);
      } else {
        setTracks([]);
        setWeeklyData({ closed: 0, ongoing: 0 });
      }
    });

    return () => unsubscribe();
  }, [fetchData]);

  // Calculate efficiency percentage
  const calculateEfficiency = (original: number, actual: number) => {
    if (original <= 0 || actual <= 0) return 0;
    return Math.min(Math.round((original / actual) * 100), 100);
  };

  // Filter records based on division selection
  const filteredRecords = divisionFilter === "all" 
    ? records 
    : records.filter(r => r.division === divisionFilter);

  // Calculate annual comparison as area chart data
  const getAnnualComparison = () => {
    const now = new Date();
    const yearRecords = filteredRecords.filter(record => {
      const recordDate = new Date(record.dateRecorded);
      return recordDate.getFullYear() === now.getFullYear();
    });

    return Array.from({ length: 12 }, (_, i) => {
      const monthRecords = yearRecords.filter(record => {
        const recordDate = new Date(record.dateRecorded);
        return recordDate.getMonth() === i;
      });

      const original = monthRecords.reduce((sum, r) => sum + r.originalWorkingDays, 0);
      const actual = monthRecords.reduce((sum, r) => sum + r.actualWorkingDays, 0);
      const efficiency = calculateEfficiency(original, actual);

      return {
        name: new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'short' }),
        planned: original,
        actual: actual,
        efficiency
      };
    });
  };

  // Get document status data for weekly view
  const weeklyDocumentData = [
    { name: 'Ongoing', value: weeklyData.ongoing },
    { name: 'Closed', value: weeklyData.closed }
  ];

  // Get daily tracks count with more flexible date comparison
  const getDailyTracks = () => {
    const todayString = format(new Date(), 'MM/dd/yyyy');
    
    return tracks.filter(track => {
      if (!track.dateTimeSubmitted) return false;
      
      const trackDate = track.dateTimeSubmitted.includes(',') 
        ? track.dateTimeSubmitted.split(',')[0].trim()
        : format(new Date(track.dateTimeSubmitted), 'MM/dd/yyyy');
        
      return trackDate === todayString;
    }).length;
  };

  // Get daily closed documents count
  const getDailyClosedDocuments = () => {
    const todayString = format(new Date(), 'MM/dd/yyyy');
    
    return tracks.filter(track => {
      if (track.status !== 'Closed' || !track.dateClosed) return false;
      
      const closedDate = track.dateClosed.includes(',') 
        ? track.dateClosed.split(',')[0].trim()
        : format(new Date(track.dateClosed), 'MM/dd/yyyy');
        
      return closedDate === todayString;
    }).length;
  };

  // Calculate annual comparison data
  const annualComparisonData = getAnnualComparison();

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
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Division Analytics</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            
            <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold">Division Performance Dashboard</h1>
                <div className="w-full md:w-[200px]">
                  <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                    <SelectTrigger>
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
                  <p>Loading dashboard data...</p>
                </div>
              ) : (
                <>
                  {/* Top 5 Cards - Daily, Weekly, Monthly Comparisons and Today's Tracks */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Today&apos;s Assigned Tracks</CardTitle>
                        <CardDescription>New documents assigned today</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {getDailyTracks()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Documents assigned for tracking
                        </div>
                        <Progress 
                          value={Math.min((getDailyTracks() / 20) * 100, 100)} 
                          className="mt-4 h-2" 
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Today&apos;s Closed Documents</CardTitle>
                        <CardDescription>Documents released today</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {getDailyClosedDocuments()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Documents completed and released
                        </div>
                        <Progress 
                          value={Math.min((getDailyClosedDocuments() / 20) * 100, 100)} 
                          className="mt-4 h-2" 
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Middle 2 Cards - Weekly Document Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="h-[300px]">
                      <CardHeader>
                        <CardTitle>Weekly Ongoing Documents</CardTitle>
                        <CardDescription>Last 7 days</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-72px)]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={weeklyDocumentData.filter(d => d.name === 'Ongoing')}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {weeklyDocumentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center text-xl font-semibold">
                          {weeklyData.ongoing} Documents
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="h-[300px]">
                      <CardHeader>
                        <CardTitle>Weekly Closed Documents</CardTitle>
                        <CardDescription>Last 7 days</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-72px)]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={weeklyDocumentData.filter(d => d.name === 'Closed')}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {weeklyDocumentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center text-xl font-semibold">
                          {weeklyData.closed} Documents
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bottom Card - Annual Comparison as Area Chart */}
                  <Card className="h-[400px]">
                    <CardHeader>
                      <CardTitle>Annual Performance</CardTitle>
                      <CardDescription>Monthly efficiency trend</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-72px)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={annualComparisonData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="planned" 
                            name="Planned Days" 
                            stroke="#8884d8" 
                            fill="#8884d8" 
                            fillOpacity={0.2} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="actual" 
                            name="Actual Days" 
                            stroke="#82ca9d" 
                            fill="#82ca9d" 
                            fillOpacity={0.2} 
                          />
                        </AreaChart>
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