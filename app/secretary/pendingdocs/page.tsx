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
  const [isHoldMode, setIsHoldMode] = useState(false);
  const [assignedInspector, setAssignedInspector] = useState("");
  const [inspectors, setInspectors] = useState<string[]>([]);

  useEffect(() => {
    const docsRef = ref(database, "documents");
    const unsubscribe = onValue(docsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const fetchedDocs: DocData[] = [];
          snapshot.forEach((childSnapshot) => {
            const doc = childSnapshot.val();
            if (doc.forwardedTo === "Secretary" && doc.status === "Open") {
              fetchedDocs.push({
                id: childSnapshot.key,
                awdReceivedDate: doc.awdReceivedDate || "",
                awdReferenceNumber: doc.awdReferenceNumber || "",
                subject: doc.subject || "",
                dateOfDocument: doc.dateOfDocument || "",
                deadline: doc.deadline || "",
                fsisReferenceNumber: doc.fsisReferenceNumber || "",
                originatingOffice: doc.originatingOffice || "",
                forwardedBy: doc.forwardedBy || "",
                forwardedTo: doc.forwardedTo || "",
                remarks: doc.remarks || "",
                status: doc.status || "",
                workingDays: doc.workingDays || "",
                dateTimeSubmitted: doc.dateTimeSubmitted || new Date().toISOString(),
                assignedInspector: doc.assignedInspector || ""
              });
            }
          });
          setDocuments(fetchedDocs);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error("Error processing documents:", error);
      }
    });

    const inspectorsRef = ref(database, "inspectors");
    const inspectorsUnsubscribe = onValue(inspectorsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const fetchedInspectors: string[] = [];
          snapshot.forEach((childSnapshot) => {
            const inspector = childSnapshot.val();
            fetchedInspectors.push(inspector.name);
          });
          setInspectors(fetchedInspectors);
        } else {
          setInspectors([
            "BOCALBOS, EDGARDO S",
            // ... rest of the inspector list
          ]);
        }
      } catch (error) {
        console.error("Error fetching inspectors:", error);
      }
    });

    return () => {
      unsubscribe();
      inspectorsUnsubscribe();
    };
  }, []);

  const calculateWorkingDays = (deadline: string): number => {
    if (!deadline) return 0;
    const deadlineDate = new Date(deadline);
    const today = new Date();

    if (deadlineDate < today) return -1;

    let workingDays = 0;
    const currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= deadlineDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
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
    if (!selectedDoc || !forwardTo) return;
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

      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        forwardedBy,
        forwardedTo: forwardTo,
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        dateOfDocument: selectedDoc.dateOfDocument,
        deadline: selectedDoc.deadline,
        fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
        originatingOffice: selectedDoc.originatingOffice,
        remarks: "FAA",
        status: "Open",
        workingDays: selectedDoc.workingDays,
        assignedInspector: selectedDoc.assignedInspector || ""
      });

      const trackingRef = ref(database, `tracking/${selectedDoc.id}`);
      await push(trackingRef, {
        ...selectedDoc,
        forwardedBy,
        forwardedTo: forwardTo,
        remarks: "FAA",
        dateTimeSubmitted
      });

      setSelectedDoc(null);
      setForwardTo("");
      alert("Document successfully forwarded!");
    } catch (error) {
      console.error("Error processing document:", error);
    }
  };

  const handleReturnDocument = async () => {
    if (!selectedDoc) return;

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

      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        forwardedBy: "Secretary",
        forwardedTo: "FSIS",
        remarks: "Returned",
        status: "Returned",
        // Include all other fields
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        dateOfDocument: selectedDoc.dateOfDocument,
        deadline: selectedDoc.deadline,
        fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
        originatingOffice: selectedDoc.originatingOffice,
        workingDays: selectedDoc.workingDays,
        assignedInspector: selectedDoc.assignedInspector || ""
      });

      const trackingRef = ref(database, `tracking/${selectedDoc.id}`);
      await push(trackingRef, {
        ...selectedDoc,
        forwardedBy,
        forwardedTo: "FSIS",
        remarks: "Returned",
        status: "Returned",
        dateTimeSubmitted
      });

      setSelectedDoc(null);
      alert("Document successfully returned!");
    } catch (error) {
      console.error("Error returning document:", error);
    }
  };

  const handleHoldDocument = async () => {
    if (!selectedDoc || !assignedInspector) return;

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

      const dateTimeSubmitted = getCurrentDateTime();

      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        status: "On Hold",
        assignedInspector,
        remarks: `On Hold - Assigned to ${assignedInspector}`,
        // Include all other fields
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        dateOfDocument: selectedDoc.dateOfDocument,
        deadline: selectedDoc.deadline,
        fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
        originatingOffice: selectedDoc.originatingOffice,
        forwardedBy: selectedDoc.forwardedBy,
        forwardedTo: selectedDoc.forwardedTo,
        workingDays: selectedDoc.workingDays
      });

      setIsHoldMode(false);
      setSelectedDoc(null);
      setAssignedInspector("");
      alert(`Document placed on hold and assigned to ${assignedInspector}`);
    } catch (error) {
      console.error("Error putting document on hold:", error);
    }
  };

  const getDeadlineBadge = (deadline: string) => {
    const workingDays = calculateWorkingDays(deadline);

    if (!deadline) {
      return { variant: "outline" as const, text: "No deadline", className: "" };
    }

    if (workingDays < 0) {
      return {
        variant: "destructive" as const,
        text: "Overdue",
        className: "bg-black text-white"
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
        className: "bg-orange-400"
      };
    } else if (workingDays <= 20) {
      return {
        variant: "default" as const,
        text: `${workingDays} working days left`,
        className: "bg-green-500"
      };
    } else {
      return {
        variant: "default" as const,
        text: `${workingDays} working days left`,
        className: ""
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

              {/* Document Count */}
              <p className="mb-4 text-gray-600">
                Showing {filteredDocuments.length} of {documents.length} documents
              </p>

              {/* Document Table */}
              <div className="overflow-x-auto">
                <Table className="border w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="w-1/6">Date</TableHead>
                      <TableHead className="w-1/6">AWD No.</TableHead>
                      <TableHead className="w-2/6">Subject</TableHead>
                      <TableHead className="w-1/6">Forwarded By</TableHead>
                      <TableHead className="w-1/6">Forwarded To</TableHead>
                      <TableHead className="w-1/6">Deadline</TableHead>
                      <TableHead className="w-1/6">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => {
                      const badgeProps = getDeadlineBadge(doc.deadline);

                      return (
                        <TableRow
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsHoldMode(false);
                          }}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          <TableCell className="truncate">{doc.awdReceivedDate}</TableCell>
                          <TableCell className="truncate">{doc.awdReferenceNumber}</TableCell>
                          <TableCell className="truncate">{doc.subject}</TableCell>
                          <TableCell className="truncate">{doc.forwardedBy}</TableCell>
                          <TableCell className="truncate">{doc.forwardedTo}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">

                              <Badge
                                variant={badgeProps.variant}
                                className={badgeProps.className}
                              >
                                {badgeProps.text}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="truncate">{doc.remarks}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Document Details and Actions */}
              {selectedDoc && !isHoldMode && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <p className="text-lg"><strong>Subject:</strong> {selectedDoc.subject}</p>
                    <p className="text-lg"><strong>AWD No.:</strong> {selectedDoc.awdReferenceNumber}</p>
                    <p className="text-lg"><strong>Date of Document:</strong> {selectedDoc.dateOfDocument}</p>
                    <p className="text-lg"><strong>Forwarded By:</strong> {selectedDoc.forwardedBy}</p>
                    <p className="text-lg"><strong>Deadline:</strong> {selectedDoc.deadline}</p>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong>
                      <Badge
                        variant={getDeadlineBadge(selectedDoc.deadline).variant}
                        className={getDeadlineBadge(selectedDoc.deadline).className}
                      >
                        {getDeadlineBadge(selectedDoc.deadline).text}
                      </Badge>
                    </div>
                    <p className="text-lg"><strong>Working Days Left:</strong> {calculateWorkingDays(selectedDoc.deadline)}</p>
                    <p className="text-lg"><strong>Remarks:</strong> {selectedDoc.remarks}</p>
                  </div>

                  {/* Forward Selection */}
                  <div className="mt-6">
                    <label className="block text-lg font-semibold mb-2">Forward To:</label>
                    <select
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      className="w-full p-2 border rounded-md text-lg"
                    >
                      <option value="" disabled>Select an Admin</option>
                      {["CATCID Admin", "GACID Admin", "EARD Admin", "MOOCSU Admin", "Admin"].map((admin, index) => (
                        <option key={index} value={admin}>{admin}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">

                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        onClick={() => setIsHoldMode(true)}
                      >
                        Hold Document
                      </Button>


                      <Button
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={()=> setIsHoldMode(true) }
                      >
                        Return Document
                      </Button>


                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleProcessDocument}
                      disabled={!forwardTo}
                    >
                      Mark as Signed & Forward
                    </Button>
                  </div>
                </div>
              )}
              

              {/* Hold Mode Interface */}
              {selectedDoc && isHoldMode && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Hold Document</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <p className="text-lg"><strong>Subject:</strong> {selectedDoc.subject}</p>
                    <p className="text-lg"><strong>AWD No.:</strong> {selectedDoc.awdReferenceNumber}</p>
                  </div>

                  <div className="mt-6">
                    <label className="block text-lg font-semibold mb-2">Assign to Inspector:</label>
                    <select
                      value={assignedInspector}
                      onChange={(e) => setAssignedInspector(e.target.value)}
                      className="w-full p-2 border rounded-md text-lg"
                    >
                      <option value="" disabled>Select an Inspector</option>
                      {inspectors.map((inspector, index) => (
                        <option key={index} value={inspector}>{inspector}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-6 space-y-4">
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={handleHoldDocument}
                      disabled={!assignedInspector}
                    >
                      Confirm Hold & Assign
                    </Button>

                    <Button
                      className="w-full bg-gray-400 hover:bg-gray-500"
                      onClick={() => setIsHoldMode(false)}
                    >
                      Cancel
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