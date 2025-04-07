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
  const [isHoldMode, setIsHoldMode] = useState(false);
  const [assignedInspector, setAssignedInspector] = useState("");
  const [inspectors, setInspectors] = useState<string[]>([]);
  const [isReturnedMode, setIsReturnedMode] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState("");
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
              "JIMENEZ, CESAR S. JR.",
              "BRIONES, RODERICK D.",
              "PAGTULIGAN, ANDRES P.",
              "ARMENIO, JUDY O.",
              "DELIMA, JORGE A.",
              "COMIA, WILFREDO B.",
              "DALISAY, HERNAN I",
              "DORADO, ROGER R.",
              "ESTELLERO, RAMON R.",
              "IBAÑEZ, DENNISE LEAH BRENDA T.",
              "DADIS, YASMIN S.",
              "NICDAO, LINO L.",
              "ENGR. ECHAVEZ, IAN W.",
              "ALFORQUE, RICHIE E.",
              "ALVAREZ, FERNANDO R.",
              "CUMIGAD, JOHN C. JR.",
              "FLORES, ALFIN G.",
              "JOHN MICHAEL REY",
              "MALVEDA, MARY GRACE D.",
              "SANDOVAL, DENNIS MORREL M.",
              "BAGASBAS, JOURVIE A.",
              "TUMANUT, ALDEN",
              "ENGR. LEONARD M. VILLAR",
              "MANUEL, MICHAEL",
              "CRUZ, ROGELIO GINO S.",
              "ANG, ALEXIS F.",
              "DE GUZMAN, GILBERT B.",
              "EVANGELISTA, SERLIND",
              "BANTING, RHAMCEL CYRUS DC",
              "BATHAN, RODA C.",
              "BUIT, SAHARA THERESA H.",
              "RADA, JUVI ELVA MAYE B",
              "LAIG, RAPHAEL D.",
              "NICDAO, LINO L.",
              "DE ARCA, REY ANTHONY D",
              "JARMIN, FELIX T",
              "NARA, ALIMBEN P.",
              "ALCANTARA, JENNY T.",
              "APAO, AYMER M.",
              "CAALIM, MARION KRISTIAN G.",
              "CUSI, LUCAS A. JR.",
              "RAMIEZ, RONALD JOHN M.",
              "LASMARIAS, CARLOS F. JR.",
              "GARCIA, ALLAN G.",
              "RODA, ALDINO G.",
              "BUYA, BENEDICTO JOSE J.",
              "VILLAVIEJA, ADOLFO JR."
                        
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
      remarks: "FAA",
      status: "Open",
      workingDays: calculateWorkingDays(selectedDoc.startDate, selectedDoc.deadline),
      assignedInspector: selectedDoc.assignedInspector || ""
    });

    // Create a flat tracking entry at root level
    const trackingRef = ref(database, "tracking");
    const newTrackingEntry = {
      action: "Forwarded",
      forwardedBy,
      forwardedTo: forwardTo,
      remarks: "FAA",
      status: "Open",
      dateTimeSubmitted,
      actionTimestamp: Date.now(), // For sorting
      // Include essential document info for reference
      awdReferenceNumber: selectedDoc.awdReferenceNumber,
      subject: selectedDoc.subject,
      originatingOffice: selectedDoc.originatingOffice
    };
    
    await push(trackingRef, newTrackingEntry);

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
      remarks: returnRemarks || "Returned", // Use custom remarks if provided
      status: "Returned",
      awdReceivedDate: selectedDoc.awdReceivedDate,
      awdReferenceNumber: selectedDoc.awdReferenceNumber,
      subject: selectedDoc.subject,
      dateOfDocument: selectedDoc.dateOfDocument,
      deadline: selectedDoc.deadline,
      startDate: selectedDoc.startDate,
      fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
      originatingOffice: selectedDoc.originatingOffice,
      workingDays: calculateWorkingDays(selectedDoc.startDate, selectedDoc.deadline),
      assignedInspector: selectedDoc.assignedInspector || ""
    });

    const trackingRef = ref(database, `tracking`);
    await push(trackingRef, {
      ...selectedDoc,
      forwardedBy,
      forwardedTo: "FSIS",
      remarks: returnRemarks || "Returned", // Use custom remarks if provided
      status: "Returned",
      dateTimeSubmitted
    });

    setSelectedDoc(null);
    setIsReturnedMode(false);
    setReturnRemarks("");
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
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        dateOfDocument: selectedDoc.dateOfDocument,
        deadline: selectedDoc.deadline,
        startDate: selectedDoc.startDate,
        fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
        originatingOffice: selectedDoc.originatingOffice,
        forwardedBy: selectedDoc.forwardedBy,
        forwardedTo: selectedDoc.forwardedTo,
        workingDays: calculateWorkingDays(selectedDoc.startDate, selectedDoc.deadline)
      });

      const trackingRef = ref(database, `tracking/${selectedDoc.id}`);
      await push(trackingRef, {
        ...selectedDoc,
        forwardedBy: `${userName} (${userDivision})`,
        forwardedTo: "On Hold",
        remarks: `Assigned to ${assignedInspector}`,
        status: "On Hold",
        dateTimeSubmitted
      });

      setIsHoldMode(false);
      setSelectedDoc(null);
      setAssignedInspector("");
      alert(`Document placed on hold and assigned to ${assignedInspector}`);
    } catch (error) {
      console.error("Error putting document on hold:", error);
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
    setIsHoldMode(false);
    
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
         <AppSidebarSecretary pendingCount={filteredDocuments.length} />
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
                      <TableHead className="w-1/6">Deadline</TableHead>
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
                          onClick={() => {
                            handleDocClick(doc)
                            setSelectedDoc(doc);
                            setIsHoldMode(false);
                          }}
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

              {selectedDoc && !isHoldMode && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <p className="text-lg"><strong>Subject:</strong> {selectedDoc.subject}</p>
                    <p className="text-lg"><strong>AWD No.:</strong> {selectedDoc.awdReferenceNumber}</p>
                    <p className="text-lg"><strong>Date of Document:</strong> {selectedDoc.dateOfDocument}</p>
                    <p className="text-lg"><strong>Forwarded By:</strong> {selectedDoc.forwardedBy}</p>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong>
                      <Badge
                        variant={getDeadlineBadge(selectedDoc.startDate, selectedDoc.deadline).variant}
                        className={getDeadlineBadge(selectedDoc.startDate, selectedDoc.deadline).className}
                      >
                        {getDeadlineBadge(selectedDoc.startDate, selectedDoc.deadline).text}
                      </Badge>
                    </div>
                    <p className="text-lg"><strong>Working Days Left:</strong> {calculateWorkingDays(selectedDoc.startDate, selectedDoc.deadline)}</p>
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
                        onClick={() => {
                        setIsReturnedMode(true);
                        setIsHoldMode(false);
                        
                      }}
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
                           
                {selectedDoc && isReturnedMode && (
                  <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold mb-4">Return Document</h2>
                    <div className="grid grid-cols-1 gap-3">
                      <p className="text-lg"><strong>Subject:</strong> {selectedDoc.subject}</p>
                      <p className="text-lg"><strong>AWD No.:</strong> {selectedDoc.awdReferenceNumber}</p>
                    </div>

                    <div className="mt-6">
                      <label className="block text-lg font-semibold mb-2">Return Remarks:</label>
                      <textarea
                        value={returnRemarks}
                        onChange={(e) => setReturnRemarks(e.target.value)}
                        placeholder="Enter reason for returning..."
                        className="w-full p-2 border rounded-md text-lg min-h-[100px]"
                      />
                    </div>

                    <div className="mt-6 space-y-4">
                      <Button
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={handleReturnDocument}
                        disabled={!returnRemarks}
                      >
                        Confirm Return
                      </Button>

                      <Button
                        className="w-full bg-gray-400 hover:bg-gray-500"
                        onClick={() => {
                          setIsReturnedMode(false);
                          setReturnRemarks("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              
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