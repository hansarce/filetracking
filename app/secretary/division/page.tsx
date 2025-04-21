"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update, push, get } from "firebase/database";
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
import ProtectedRoute from '@/components/protected-route';

export type DocData = {
  id: string;
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
  dateTimeSubmitted: string;
};

export default function DivisionDocs() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const [managerRemarks, setManagerRemarks] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const docsRef = ref(database, "documents");
    const unsubscribe = onValue(docsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const fetchedDocs: DocData[] = [];
          snapshot.forEach((childSnapshot) => {
            const doc = childSnapshot.val();
            if (
              (doc.forwardedTo === "CATCID Admin" || 
              doc.forwardedTo === "GACID Admin" || 
              doc.forwardedTo === "EARD Admin" || 
              doc.forwardedTo === "MOCSU Admin") && 
              doc.status === "Open"
            ) {
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
                status: doc.status || "Open",
                workingDays: doc.workingDays || "",
                dateTimeSubmitted: doc.dateTimeSubmitted || new Date().toISOString(),
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

    return () => unsubscribe();
  }, []);

  // Calculate pagination
  const filteredDocuments = documents.filter(doc => {
    const searchTerm = search.toLowerCase();
    return (
      doc.awdReferenceNumber.toLowerCase().includes(searchTerm) ||
      doc.subject.toLowerCase().includes(searchTerm) ||
      (doc.forwardedBy && doc.forwardedBy.toLowerCase().includes(searchTerm)) ||
      (doc.forwardedTo && doc.forwardedTo.toLowerCase().includes(searchTerm)) ||
      (doc.remarks && doc.remarks.toLowerCase().includes(searchTerm))
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleManagersEndorsement = async () => {
    if (!selectedDoc || !managerRemarks.trim()) return;

    try {
      const now = new Date();
      const formattedDate = now.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });

      // Update the original document
      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        forwardedTo: "Secretary",
        remarks: managerRemarks,
        endorsementDate: formattedDate,
      });

      // Create a tracking record
      const trackingRef = ref(database, "tracking");
      await push(trackingRef, {
        id: selectedDoc.id,
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        dateOfDocument: selectedDoc.dateOfDocument,
        deadline: selectedDoc.deadline,
        fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
        originatingOffice: selectedDoc.originatingOffice,
        forwardedBy: selectedDoc.forwardedTo, // Current division is forwarding
        forwardedTo: "Secretary",
        remarks: managerRemarks,
        status: selectedDoc.status,
        workingDays: selectedDoc.workingDays,
        dateTimeSubmitted: selectedDoc.dateTimeSubmitted,
        endorsementDate: formattedDate,
      });

      setSelectedDoc(null);
      setManagerRemarks("");
      alert("Document successfully forwarded to Manager!");
    } catch (error) {
      console.error("Error forwarding document:", error);
      alert("Failed to forward document. Please try again.");
    }
  };

  return (
    <ProtectedRoute allowedDivisions={['secretary']}>
      <SidebarProvider>
        <div className="flex h-screen w-screen">
          <AppSidebarSecretary />
          <SidebarInset className="flex flex-1 flex-col w-full">
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
                    <BreadcrumbPage>Division Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6 w-full overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl md:text-4xl font-bold">Division Documents</h1>
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>

              {/* Document Table */}
              <div className="overflow-x-auto w-full">
                <Table className="border w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="min-w-[120px]">Date</TableHead>
                      <TableHead className="min-w-[120px]">AWD No.</TableHead>
                      <TableHead className="min-w-[200px]">Subject</TableHead>
                      <TableHead className="min-w-[150px]">Forwarded By</TableHead>
                      <TableHead className="min-w-[150px]">Forwarded To</TableHead>
                      <TableHead className="min-w-[150px]">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((doc) => (
                      <TableRow
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <TableCell className="whitespace-nowrap">{doc.awdReceivedDate}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.awdReferenceNumber}</TableCell>
                        <TableCell className="min-w-[200px]">{doc.subject}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.forwardedBy}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.forwardedTo}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDocuments.length)} of {filteredDocuments.length} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <Button
                      key={number}
                      onClick={() => paginate(number)}
                      variant={currentPage === number ? "default" : "outline"}
                    >
                      {number}
                    </Button>
                  ))}
                  <Button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Document Details and Actions */}
              {selectedDoc && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white w-full max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-semibold">AWD No.:</p>
                      <p>{selectedDoc.awdReferenceNumber}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Date Received:</p>
                      <p>{selectedDoc.awdReceivedDate}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Subject:</p>
                      <p>{selectedDoc.subject}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Date of Document:</p>
                      <p>{selectedDoc.dateOfDocument}</p>
                    </div>
                    <div>
                      <p className="font-semibold">FSIS Reference No.:</p>
                      <p>{selectedDoc.fsisReferenceNumber}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Originating Office:</p>
                      <p>{selectedDoc.originatingOffice}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Forwarded By:</p>
                      <p>{selectedDoc.forwardedBy}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Forwarded To:</p>
                      <p>{selectedDoc.forwardedTo}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Deadline:</p>
                      <p>{selectedDoc.deadline}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Working Days:</p>
                      <p>{selectedDoc.workingDays}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-lg font-semibold mb-2">Remarks:</label>
                    <Input
                      type="text"
                      placeholder="Enter remarks..."
                      value={managerRemarks}
                      onChange={(e) => setManagerRemarks(e.target.value)}
                      className="w-full border p-2 rounded"
                    />
                  </div>
                  <Button 
                    className="w-full mt-6" 
                    onClick={handleManagersEndorsement} 
                    disabled={!managerRemarks.trim()}
                  >
                    Forward to Manager
                  </Button>
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}