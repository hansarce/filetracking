"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update, push } from "firebase/database";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProtectedRoute from '@/components/protected-route';

export type DocData = {
  id?: string;
  awdReceivedDate: string;
  awdReferenceNumber: string;
  subject: string;
  dateOfDocument: string;
  deadline: string;
  startDate: string;
  fsisReferenceNumber: string;
  originatingOffice: string;
  forwardedBy: string;
  forwardedTo: string;
  remarks: string;
  status: string;
  workingDays: string;
  assignedInspector?: string;
  dateTimeSubmitted: string;
};

export default function PendingDocs() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardToName, setForwardToName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [unreadDocs, setUnreadDocs] = useState<Set<string>>(new Set());
  const [lastVisit, setLastVisit] = useState<Date | null>(null);

  useEffect(() => {
    // Load last visit time from localStorage or set current time if first visit
    const storedLastVisit = localStorage.getItem('lastVisit');
    const currentLastVisit = storedLastVisit ? new Date(storedLastVisit) : new Date();
    
    if (!storedLastVisit) {
      localStorage.setItem('lastVisit', currentLastVisit.toISOString());
    }
    
    const docsRef = ref(database, "documents");
    const unsubscribe = onValue(docsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const fetchedDocs: DocData[] = [];
          const newUnreadDocs = new Set<string>();
          
          snapshot.forEach((childSnapshot) => {
            const doc = childSnapshot.val();
            if (doc.forwardedTo === "Secretary" && doc.status === "Open") {
              const docData: DocData = {
                id: childSnapshot.key,
                awdReceivedDate: doc.awdReceivedDate || "",
                awdReferenceNumber: doc.awdReferenceNumber || "",
                subject: doc.subject || "",
                dateOfDocument: doc.dateOfDocument || "",
                deadline: doc.deadline || "",
                startDate: doc.startDate || doc.awdReceivedDate || new Date().toISOString(),
                fsisReferenceNumber: doc.fsisReferenceNumber || "",
                originatingOffice: doc.originatingOffice || "",
                forwardedBy: doc.forwardedBy || "",
                forwardedTo: doc.forwardedTo || "",
                remarks: doc.remarks || "",
                status: doc.status || "",
                workingDays: doc.workingDays || "",
                dateTimeSubmitted: doc.dateTimeSubmitted || new Date().toISOString(),
                assignedInspector: doc.assignedInspector || ""
              };
              
              fetchedDocs.push(docData);
              
              // Check if document is new since last visit
              if (currentLastVisit && docData.dateTimeSubmitted) {
                const docDate = new Date(docData.dateTimeSubmitted);
                if (docDate > currentLastVisit) {
                  newUnreadDocs.add(childSnapshot.key);
                }
              }
            }
          });
          
          setUnreadDocs(newUnreadDocs);
          setDocuments(fetchedDocs);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error("Error processing documents:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const calculateWorkingDays = (startDate: string, deadline: string): number => {
    if (!startDate || !deadline) return 0;
    const start = new Date(startDate);
    const end = new Date(deadline);
    const today = new Date();

    if (end < today) return -1;

    let workingDays = 0;
    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Adjust to not count the start date if it's the same as end date
    if (currentDate.getTime() === end.getTime()) {
      const dayOfWeek = currentDate.getDay();
      return (dayOfWeek !== 0 && dayOfWeek !== 6) ? 1 : 0;
    }

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(",", "");
  };

  const handleProcessDocument = async () => {
    if (!selectedDoc || !forwardTo || !forwardToName) return;
    try {
      const userUID = localStorage.getItem("authToken");
      if (!userUID) {
        alert("User not authenticated.");
        return;
      }

      let userName, userDivision;
      const userRef = ref(database, `accounts/${userUID}`);
      await new Promise((resolve) => {
        const userUnsubscribe = onValue(userRef, (userSnapshot) => {
          userUnsubscribe();
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            userName = userData.name;
            userDivision = userData.division;
          } else {
            alert("User details not found in the database.");
          }
          resolve(null);
        }, { onlyOnce: true });
      });

      if (!userName || !userDivision) return;

      const forwardedBy = `${userName} (${userDivision})`;
      const dateTimeSubmitted = getCurrentDateTime();

      // Update the main document
      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        forwardedBy,
        forwardedTo: forwardTo,
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        dateOfDocument: selectedDoc.dateOfDocument,
        deadline: selectedDoc.deadline,
        startDate: selectedDoc.startDate,
        fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
        originatingOffice: selectedDoc.originatingOffice,
        remarks: remarks || "FAA",
        status: "Open",
        workingDays: selectedDoc.workingDays,
        assignedInspector: selectedDoc.assignedInspector || ""
      });

      // Create a flat tracking entry at root level
      const trackingRef = ref(database, "tracking");
      const newTrackingEntry = {
        action: "Forwarded",
        forwardedBy,
        forwardedTo: forwardTo,
        remarks: remarks || "FAA",
        status: "Open",
        dateTimeSubmitted,
        actionTimestamp: Date.now(), // For sorting
        // Include essential document info for reference
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        originatingOffice: selectedDoc.originatingOffice,
        forwardedtoname: forwardToName
      };
      
      await push(trackingRef, newTrackingEntry);

      setSelectedDoc(null);
      setForwardTo("");
      setForwardToName("");
      setRemarks("");
      alert("Document successfully forwarded!");
    } catch (error) {
      console.error("Error processing document:", error);
    }
  };

  const getDeadlineBadge = (startDate: string, deadline: string) => {
    const workingDays = calculateWorkingDays(startDate, deadline);

    if (!deadline) {
      return { variant: "outline" as const, text: "No deadline", className: "" };
    }

    if (workingDays < 0) {
      return {
        variant: "destructive" as const,
        text: "Overdue",
        className: "bg-red"
      };
    } else if (workingDays <= 3) {
      return {
        variant: "destructive" as const,
        text: `${workingDays} working days left`,
        className: "bg-red-500"
      };
    } else if (workingDays <= 7) {
      return {
        variant: "secondary" as const,
        text: `${workingDays} working days left`,
        className: "bg-yellow"
      };
    } else if (workingDays <= 20) {
      return {
        variant: "default" as const,
        text: `${workingDays} working days left`,
        className: "bg-green"
      };
    } else {
      return {
        variant: "default" as const,
        text: `${workingDays} working days left`,
        className: "bg-grey"
      };
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const searchTerm = search.toLowerCase();
    return (
      doc.subject.toLowerCase().includes(searchTerm) ||
      doc.awdReferenceNumber.toLowerCase().includes(searchTerm) ||
      (doc.forwardedBy && doc.forwardedBy.toLowerCase().includes(searchTerm)) ||
      (doc.remarks && doc.remarks.toLowerCase().includes(searchTerm))
    );
  });

  const handleDocClick = (doc: DocData) => {
    setSelectedDoc(doc);
    
    // Mark document as read by removing from unread set
    if (doc.id && unreadDocs.has(doc.id)) {
      const newUnreadDocs = new Set(unreadDocs);
      newUnreadDocs.delete(doc.id);
      setUnreadDocs(newUnreadDocs);
    }
  };

  return (
    <ProtectedRoute allowedDivisions={['secretary']}>
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebarSecretary />
          <SidebarInset className="flex flex-1 flex-col">
            <header className="flex h-16 items-center gap-2 border-b px-4 bg-white">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbPage>Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Pending Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6 max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold">Pending Documents</h1>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 border p-2 rounded"
                />
              </div>

              <p className="mb-4 text-gray-600">
                Showing {filteredDocuments.length} of {documents.length} documents
              </p>

              <div className="overflow-x-auto">
                <Table className="border w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="w-1/6">Date</TableHead>
                      <TableHead className="w-1/6">AWD No.</TableHead>
                      <TableHead className="w-2/6">Subject</TableHead>
                      <TableHead className="w-1/6">Forwarded By</TableHead>
                      <TableHead className="w-1/6">Forwarded To</TableHead>
                      <TableHead className="w-1/6">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => {
                      const badgeProps = getDeadlineBadge(doc.startDate, doc.deadline);
                      const isUnread = doc.id ? unreadDocs.has(doc.id) : false;
                      return (
                        <TableRow
                          key={doc.id}
                          onClick={() => handleDocClick(doc)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          <TableCell className="relative">
                            {isUnread && (
                              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                            {doc.awdReceivedDate}
                          </TableCell>
                          <TableCell className="truncate">{doc.awdReferenceNumber}</TableCell>
                          <TableCell className="truncate">{doc.subject}</TableCell>
                          <TableCell className="truncate">{doc.forwardedBy}</TableCell>
                          <TableCell className="truncate">{doc.forwardedTo}</TableCell>
                          <TableCell className="truncate">{doc.remarks}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {selectedDoc && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <p className="text-lg"><strong>Subject:</strong> {selectedDoc.subject}</p>
                    <p className="text-lg"><strong>AWD No.:</strong> {selectedDoc.awdReferenceNumber}</p>
                    <p className="text-lg"><strong>Date of Document:</strong> {selectedDoc.dateOfDocument}</p>
                    <p className="text-lg"><strong>Forwarded By:</strong> {selectedDoc.forwardedBy}</p>    
                    <p className="text-lg"><strong>Remarks:</strong> {selectedDoc.remarks}</p>
                  </div>

                  <div className="mt-6">
                    <label className="block text-lg font-semibold mb-2">Forward To:</label>
                    <select
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      className="w-full p-2 border rounded-md text-lg"
                    >
                      <option value="" disabled>Select an Admin</option>
                      {["CATCID Admin", "GACID Admin", "EARD Admin", "MOCSU Admin", "Admin"].map((admin, index) => (
                        <option key={index} value={admin}>{admin}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4">
                    <label className="block text-lg font-semibold mb-2">Forward To Name:</label>
                    <Input
                      type="text"
                      value={forwardToName}
                      onChange={(e) => setForwardToName(e.target.value)}
                      placeholder="Enter name of person to forward to"
                      className="w-full p-2 border rounded-md text-lg"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-lg font-semibold mb-2">Remarks:</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter remarks"
                      className="w-full p-2 border rounded-md text-lg min-h-[100px]"
                    />
                  </div>

                  <div className="mt-6">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleProcessDocument}
                      disabled={!forwardTo || !forwardToName}
                    >
                      Mark as Initial & Forwarded
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}