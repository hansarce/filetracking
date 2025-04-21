"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update, push, DataSnapshot } from "firebase/database";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ProtectedRoute from '@/components/protected-route';

interface DocumentData {
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
}

export default function PendingDocuments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardToName, setForwardToName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [unreadDocs, setUnreadDocs] = useState<Set<string>>(new Set());
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [returnAction, setReturnAction] = useState<"operator" | "inspector">("operator");

  // Fetch documents from Firebase
  useEffect(() => {
    const docsRef = ref(database, "documents");
    const unsubscribe = onValue(docsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const docs: DocumentData[] = [];
          const newUnreadDocs = new Set<string>();
          
          snapshot.forEach((child) => {
            const doc = child.val();
            if (doc.forwardedTo === "Secretary" && doc.status === "Open") {
              const docData: DocumentData = {
                id: child.key,
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
                status: doc.status || "Open",
                workingDays: doc.workingDays || "",
                dateTimeSubmitted: doc.dateTimeSubmitted || new Date().toISOString(),
                assignedInspector: doc.assignedInspector || ""
              };
              
              docs.push(docData);
              
              // Mark as unread if new since last visit
              const lastVisit = localStorage.getItem('lastVisit');
              if (lastVisit && docData.dateTimeSubmitted) {
                const docDate = new Date(docData.dateTimeSubmitted);
                const visitDate = new Date(lastVisit);
                if (docDate > visitDate) {
                  newUnreadDocs.add(child.key);
                }
              }
            }
          });
          
          setUnreadDocs(newUnreadDocs);
          setDocuments(docs);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error("Error loading documents:", error);
      }
    });

    // Set last visit time
    localStorage.setItem('lastVisit', new Date().toISOString());

    return () => unsubscribe();
  }, []);

  // Calculate working days remaining
  const calculateWorkingDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
    
    if (endDate < today) return -1; // Overdue
    
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  // Get formatted current date/time
  const getCurrentDateTime = (): string => {
    return new Date().toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).replace(",", "");
  };

  // Handle normal document forwarding
  const handleForwardDocument = async () => {
    if (!selectedDocument || !forwardTo) return;

    try {
      const userUID = localStorage.getItem("authToken");
      if (!userUID) throw new Error("User not authenticated");

      // Get user info
      const userRef = ref(database, `accounts/${userUID}`);
      const userSnapshot = await new Promise((resolve) => {
        onValue(userRef, (snap) => {
          resolve(snap);
        }, { onlyOnce: true });
      }) as DataSnapshot;

      if (!userSnapshot.exists()) throw new Error("User not found");

      const userData = userSnapshot.val();
      const forwardedBy = `${userData.name} (${userData.division})`;
      const dateTimeSubmitted = getCurrentDateTime();

      // Update document
      const docRef = ref(database, `documents/${selectedDocument?.id ?? ""}`);
      await update(docRef, {
        forwardedBy,
        forwardedTo: forwardTo,
        remarks: remarks || "FAA",
        status: "Open",
        dateTimeSubmitted,
      });

      // Create tracking record
      const trackingRef = ref(database, "tracking");
      await push(trackingRef, {
        action: "Forwarded",
        forwardedBy,
        forwardedTo: forwardTo,
        remarks: remarks || "FAA",
        status: "Open",
        dateTimeSubmitted,
        actionTimestamp: Date.now(),
        awdReferenceNumber: selectedDocument?.awdReferenceNumber ?? "",
        subject: selectedDocument?.subject ?? "",
        originatingOffice: selectedDocument?.originatingOffice ?? "",
        forwardedtoname: forwardToName ?? "",
      });

      // Reset form
      setSelectedDocument(null);
      setForwardTo("");
      setForwardToName("");
      setRemarks("");

      alert("Document forwarded successfully!");
    } catch (error) {
      console.error("Error forwarding document:", error);
      alert("Failed to forward document");
    }
  };

  // Handle return to Operator (Admin)
  const handleReturnToOperator = async () => {
    if (!selectedDocument || !returnRemarks.trim()) return;
    
    try {
      const userUID = localStorage.getItem("authToken");
      if (!userUID) throw new Error("User not authenticated");

      // Get user info
      const userRef = ref(database, `accounts/${userUID}`);
      const userSnapshot = await new Promise((resolve) => {
        onValue(userRef, (snap) => {
          resolve(snap);
        }, { onlyOnce: true });
      }) as DataSnapshot; // Type assertion added here

      if (!userSnapshot.exists()) throw new Error("User not found");
      
      const userData = userSnapshot.val();
      const forwardedBy = `${userData.name} (${userData.division})`;
      const dateTimeSubmitted = getCurrentDateTime();

      // Update document
      const docRef = ref(database, `documents/${selectedDocument.id}`);
      await update(docRef, {
        forwardedBy,
        forwardedTo: "Admin",
        remarks: returnRemarks,
        status: "Open",
        dateTimeSubmitted
      });

      // Create tracking record
      const trackingRef = ref(database, "tracking");
      await push(trackingRef, {
        action: "Returned to Operator",
        forwardedBy,
        forwardedTo: "Admin",
        remarks: returnRemarks,
        status: "Open",
        dateTimeSubmitted,
        actionTimestamp: Date.now(),
        awdReferenceNumber: selectedDocument.awdReferenceNumber,
        subject: selectedDocument.subject,
        originatingOffice: selectedDocument.originatingOffice
      });

      // Reset form
      setSelectedDocument(null);
      setReturnRemarks("");
      setIsReturnMode(false);
      
      alert("Document returned to Operator successfully!");
    } catch (error) {
      console.error("Error returning document:", error);
      alert("Failed to return document");
    }
  };

  // Handle forward to Inspector division
  const handleForwardToInspector = async () => {
    if (!selectedDocument || !selectedDivision || !returnRemarks.trim()) return;
    
    try {
      const userUID = localStorage.getItem("authToken");
      if (!userUID) throw new Error("User not authenticated");

      // Get user info
      const userRef = ref(database, `accounts/${userUID}`);
      const userSnapshot = await new Promise((resolve) => {
        onValue(userRef, (snap) => {
          resolve(snap);
        }, { onlyOnce: true });
      }) as DataSnapshot; // Type assertion added here

      if (!userSnapshot.exists()) throw new Error("User not found");
      
      const userData = userSnapshot.val();
      const forwardedBy = `${userData.name} (${userData.division})`;
      const dateTimeSubmitted = getCurrentDateTime();

      // Update document
      const docRef = ref(database, `documents/${selectedDocument.id}`);
      await update(docRef, {
        forwardedBy,
        forwardedTo: selectedDivision,
        remarks: returnRemarks,
        status: "Open",
        dateTimeSubmitted
      });

      // Create tracking record
      const trackingRef = ref(database, "tracking");
      await push(trackingRef, {
        action: "Forwarded to Inspector",
        forwardedBy,
        forwardedTo: selectedDivision,
        remarks: returnRemarks,
        status: "Open",
        dateTimeSubmitted,
        actionTimestamp: Date.now(),
        awdReferenceNumber: selectedDocument.awdReferenceNumber,
        subject: selectedDocument.subject,
        originatingOffice: selectedDocument.originatingOffice
      });

      // Reset form
      setSelectedDocument(null);
      setReturnRemarks("");
      setSelectedDivision("");
      setIsReturnMode(false);
      
      alert(`Document forwarded to ${selectedDivision} successfully!`);
    } catch (error) {
      console.error("Error forwarding to inspector:", error);
      alert("Failed to forward document");
    }
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => {
    const term = searchTerm.toLowerCase();
    return (
      doc.subject.toLowerCase().includes(term) ||
      doc.awdReferenceNumber.toLowerCase().includes(term) ||
      doc.forwardedBy.toLowerCase().includes(term) ||
      doc.remarks.toLowerCase().includes(term)
    );
  });

  // Handle document selection
  const handleSelectDocument = (doc: DocumentData) => {
    setSelectedDocument(doc);
    
    // Mark as read
    if (doc.id && unreadDocs.has(doc.id)) {
      const updatedUnread = new Set(unreadDocs);
      updatedUnread.delete(doc.id);
      setUnreadDocs(updatedUnread);
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
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                 
                </div>
              </div>

              <p className="mb-4 text-gray-600">
                Showing {filteredDocuments.length} of {documents.length} documents
              </p>

              <div className="overflow-x-auto">
                <Table className="border w-full">
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
                    {filteredDocuments.map((doc) => (
                      <TableRow
                         key={doc.id ?? ""} // Ensure `id` is a string
                        onClick={() => handleSelectDocument(doc)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <TableCell className="relative">
                          {unreadDocs.has(doc.id ?? "") && ( // Ensure `id` is a string
                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                          {doc.awdReceivedDate}
                        </TableCell>
                        <TableCell>{doc.awdReferenceNumber}</TableCell>
                        <TableCell className="truncate">{doc.subject}</TableCell>
                        <TableCell>{doc.forwardedBy}</TableCell>
                        <TableCell>{doc.forwardedTo}</TableCell>
                        <TableCell>{doc.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedDocument && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 gap-3 mb-6">
                    <p><strong>Subject:</strong> {selectedDocument.subject}</p>
                    <p><strong>AWD No.:</strong> {selectedDocument.awdReferenceNumber}</p>
                    <p><strong>Date Received:</strong> {selectedDocument.awdReceivedDate}</p>
                    <p><strong>Forwarded By:</strong> {selectedDocument.forwardedBy}</p>
                    <p><strong>Remarks:</strong> {selectedDocument.remarks}</p>
                    <p>
                      <strong>Working Days:</strong> {calculateWorkingDays(
                        selectedDocument.startDate,
                        selectedDocument.deadline
                      )} days remaining
                    </p>
                  </div>

                  {isReturnMode ? (
                    <>

                      <div className="mb-4">
                        <label className="block font-semibold mb-2">Return Remarks:</label>
                        <textarea
                          value={returnRemarks}
                          onChange={(e) => setReturnRemarks(e.target.value)}
                          className="w-full p-2 border rounded min-h-[100px]"
                          placeholder="Enter return remarks"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block font-semibold mb-2">Return Action:</label>
                        <div className="flex gap-4">
                          <Button
                            variant={returnAction === "operator" ? "default" : "outline"}
                            onClick={() => setReturnAction("operator")}
                          >
                            Return to Operator
                          </Button>
                          <Button
                            variant={returnAction === "inspector" ? "default" : "outline"}
                            onClick={() => setReturnAction("inspector")}
                          >
                            Forward to Inspector
                          </Button>

                            
                        </div>
                      </div>

                      {returnAction === "inspector" && (
                        <div className="mb-4">
                          <label className="block font-semibold mb-2">Select Division:</label>
                          <Select onValueChange={setSelectedDivision}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CATCID Admin">CATCID</SelectItem>
                              <SelectItem value="GACID Admin">GACID</SelectItem>
                              <SelectItem value="EARD Admin">EARD</SelectItem>
                              <SelectItem value="MOCSU Admin">MOCSU</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={returnAction === "operator" ? handleReturnToOperator : handleForwardToInspector}
                        disabled={
                          !returnRemarks.trim() || 
                          (returnAction === "inspector" && !selectedDivision)
                        }
                      >
                        {returnAction === "operator" 
                          ? "Return to Operator (Admin)" 
                          : `Forward to ${selectedDivision || "Inspector"}`}
                      </Button>

                      <Button
                              className="w-full mt-2"
                              variant="default"
                              onClick={() => setIsReturnMode(false)}
                            >
                              Cancel Return
                            </Button>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block font-semibold mb-2">Forward To:</label>
                        <select
                          value={forwardTo}
                          onChange={(e) => setForwardTo(e.target.value)}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Select destination</option>
                          <option value="CATCID Admin">CATCID Admin</option>
                          <option value="GACID Admin">GACID Admin</option>
                          <option value="EARD Admin">EARD Admin</option>
                          <option value="MOCSU Admin">MOCSU Admin</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block font-semibold mb-2">Forward To Name:</label>
                        <Input
                          type="text"
                          value={forwardToName}
                          onChange={(e) => setForwardToName(e.target.value)}
                          placeholder="Recipient name"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block font-semibold mb-2">Remarks:</label>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full p-2 border rounded min-h-[100px]"
                          placeholder="Enter remarks"
                        />
                      </div>

                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleForwardDocument}
                        disabled={!forwardTo}
                      >
                        Forward Document
                      </Button>
                       <Button
                       className="w-full mt-2 "
                    variant={isReturnMode ? "default" : "outline"}
                    onClick={() => setIsReturnMode(!isReturnMode)}
                  >
                    {isReturnMode ? "Cancel Return" : "Return Document"}
                  </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}