"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ref, query, orderByChild, equalTo, onValue } from "firebase/database";
import { database } from "@/lib/firebase/firebase";
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
import ProtectedRoute from '@/components/protected-route';

export default function SubjectInformation() {
  const params = useParams();
  const router = useRouter();
  const [awdrefnu, setAwdRefNu] = useState<string | null>(null);
  const [subjectData, setSubjectData] = useState<Record<string, unknown> | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAwdRef = localStorage.getItem("selectedAwdRefNum");
    const paramAwdRef = params?.awdrefnu as string;
    const finalAwdRef = paramAwdRef || storedAwdRef;

    if (!finalAwdRef) {
      console.error("awdReferenceNumber is undefined!");
      router.push("/admin/Documents");
      return;
    }
    setAwdRefNu(finalAwdRef);
  }, [params, router]);

  useEffect(() => {
    if (!awdrefnu) return;

    console.log("Fetching data for:", awdrefnu);

    const docQuery = query(ref(database, "documents"), orderByChild("awdReferenceNumber"), equalTo(awdrefnu));
    
    const unsubscribeDoc = onValue(docQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const firstKey = Object.keys(data)[0];
        setSubjectData(data[firstKey]);
      } else {
        console.warn("No data found for", awdrefnu);
        setSubjectData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      setLoading(false);
    });

    const trackingQuery = query(ref(database, "tracking"), orderByChild("awdReferenceNumber"), equalTo(awdrefnu));
    
    const unsubscribeTracking = onValue(trackingQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTrackingData(Object.values(data));
      } else {
        console.warn("No tracking data found for", awdrefnu);
        setTrackingData([]);
      }
    }, (error) => {
      console.error("Error fetching tracking data:", error);
    });

    return () => {
      unsubscribeDoc();
      unsubscribeTracking();
    };
  }, [awdrefnu]);

  if (loading) return <p className="text-center mt-10">Loading data...</p>;
  if (!subjectData) return <p className="text-center mt-10 text-red-500">No data found.</p>;

  return (
    <ProtectedRoute allowedDivisions={['admin']}>
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbPage>Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Subject Information</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="pl-12 pt-8">
              <h1 className="text-6xl font-bold mb-16">{String(subjectData?.subject || "No Title")}</h1>
              <div className="grid grid-cols-2 gap-6 pl-12">
                {[
                  { label: "AWD Reference Number", value: String(subjectData?.awdReferenceNumber || "N/A") },
                  { label: "Originating Officer", value: String(subjectData?.originatingOffice || "N/A") },
                  { label: "Date of Document", value: String(subjectData?.dateOfDocument || "N/A") },
                  { label: "FSIS Reference Number", value: String(subjectData?.fsisReferenceNumber || "N/A") },
                  { label: "AWD Date Received", value: String(subjectData?.awdReceivedDate || "N/A") },
                  { label: "Status", value: String(subjectData?.status || "N/A") },
                  { label: "Remarks", value: String(subjectData?.remarks || "N/A") },
                  { label: "Inspector", value: String(subjectData?.assignedInspector || "N/A") },
                ].map((item, index) => (
                  <div key={index}>
                    <label className="block text-xl font-semibold pb-2">{item.label}</label>
                    <label className="block text-xl font-normal pb-2">{item.value}</label>
                  </div>
                ))}
              </div>

              {/* Tracking Table */}
              <div className="mt-12 flex justify-center px-8 pb-10">
                <div className="w-full max-w-5xl">
                  <h2 className="text-3xl font-semibold mb-6 text-center">Tracking History</h2>
                  {trackingData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 shadow-lg">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-6 py-3 text-left text-lg font-semibold">Date and Time</th>
                            <th className="border px-6 py-3 text-left text-lg font-semibold">Forwarded By</th>
                            <th className="border px-6 py-3 text-left text-lg font-semibold">Forwarded To</th>
                            <th className="border px-6 py-3 text-left text-lg font-semibold">Status</th>
                            <th className="border px-6 py-3 text-left text-lg font-semibold">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trackingData
                            .sort((a, b) => 
                              new Date(a.dateTimeSubmitted as string).getTime() - 
                              new Date(b.dateTimeSubmitted as string).getTime()
                            )
                            .map((entry, index) => (
                              <tr key={index} className="border bg-white hover:bg-gray-50">
                                <td className="border px-6 py-3 text-lg">{String(entry.dateTimeSubmitted || "N/A")}</td>
                                <td className="border px-6 py-3 text-lg">{String(entry.forwardedBy || "N/A")}</td>
                                <td className="border px-6 py-3 text-lg">
                                  {entry.forwardedtoname 
                                    ? `${String(entry.forwardedtoname)} (${String(entry.forwardedTo || '')})` 
                                    : String(entry.forwardedTo || "N/A")}
                                </td>
                                <td className="border px-6 py-3 text-lg">{String(entry.status || "N/A")}</td>
                                <td className="border px-6 py-3 text-lg">{String(entry.remarks || "N/A")}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-red-500 text-lg mt-4">No tracking history available.</p>
                  )}
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}