"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update } from "firebase/database";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ProtectedRoute from '@/components/protected-route';

export type DocData = {
  id: string;
  awdReceivedDate: string;
  awdReferenceNumber: string;
  subject: string;
  forwardedBy: string;
  forwardedTo: string;
  remarks: string;
  status: string;
  dateTimeSubmitted: string;
};

export default function PendingDocs() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [sortedDocuments, setSortedDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  
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
            if (doc.forwardedTo === "Admin" && doc.status === "Open") {
              fetchedDocs.push({ id: childSnapshot.key, ...doc });
            }
          });
          
          // Sort documents by AWD reference number in descending order
          const sorted = [...fetchedDocs].sort((a, b) => {
            // Extract numeric parts from AWD reference numbers for proper numeric sorting
            const getNumericPart = (ref: string) => {
              const match = ref.match(/\d+$/);
              return match ? parseInt(match[0], 10) : 0;
            };
            
            const aNum = getNumericPart(a.awdReferenceNumber);
            const bNum = getNumericPart(b.awdReferenceNumber);
            
            // First try numeric comparison
            if (aNum !== bNum) {
              return bNum - aNum;
            }
            // If numeric parts are equal, fall back to string comparison
            return b.awdReferenceNumber.localeCompare(a.awdReferenceNumber);
          });
          
          setDocuments(sorted);
          setSortedDocuments(sorted);
        } else {
          setDocuments([]);
          setSortedDocuments([]);
        }
      } catch (error) {
        console.error("Error processing documents:", error);
      }
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
  }, []);

  // Filter and paginate documents
  const filteredDocs = sortedDocuments.filter(doc => 
    doc.subject.toLowerCase().includes(search.toLowerCase()) ||
    doc.awdReferenceNumber.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate pagination values
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleProcessDocument = async () => {
    if (!selectedDoc || !forwardTo) return;
    try {
      const userUID = localStorage.getItem("authToken");
      if (!userUID) {
        alert("User not authenticated.");
        return;
      }

      // Fetch user's name and division from Firebase
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
      
      if (!userName || !userDivision) {
        return;
      }

      const forwardedBy = `${userName} (${userDivision})`;

      const dateTimeSubmitted = new Date().toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        forwardedBy: forwardedBy,
        forwardedTo: forwardTo,
      });

      const trackingRef = ref(database, `tracking/${selectedDoc.id}`);
      const trackingData: DocData = {
        id: selectedDoc.id,
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        forwardedBy: forwardedBy,
        forwardedTo: forwardTo,
        remarks: "Signed",
        status: "Processed",
        dateTimeSubmitted,
      };
      await update(trackingRef, trackingData);

      setSelectedDoc(null);
      setForwardTo("");
      alert("Document successfully forwarded and recorded in tracking table!");
    } catch (error) {
      console.error("Error processing document:", error);
    }
  };

  return (
    <ProtectedRoute allowedDivisions={['admin']}>
      <SidebarProvider>
        <div className="flex h-screen w-screen">
          <AppSidebar />
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
                    <BreadcrumbPage>Pending Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-4 md:p-6 w-full overflow-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-4xl font-bold">Pending Documents</h1>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>

              {/* Document Table */}
              <div className="w-full overflow-x-auto mb-4">
                <Table className="border w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[120px]">AWD No.</TableHead>
                      <TableHead className="min-w-[180px]">Subject</TableHead>
                      <TableHead className="min-w-[150px]">Forwarded By</TableHead>
                      <TableHead className="min-w-[150px]">Forwarded To</TableHead>
                      <TableHead className="min-w-[120px]">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length > 0 ? (
                      currentItems.map((doc) => (
                        <TableRow
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          <TableCell className="truncate max-w-[100px]">{doc.awdReceivedDate}</TableCell>
                          <TableCell className="truncate max-w-[120px] font-medium">{doc.awdReferenceNumber}</TableCell>
                          <TableCell className="truncate max-w-[180px]">{doc.subject}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{doc.forwardedBy}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{doc.forwardedTo}</TableCell>
                          <TableCell className="truncate max-w-[120px]">{doc.remarks}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          {documents.length === 0 ? "No pending documents found" : "No matching documents"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredDocs.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDocs.length)} of {filteredDocs.length} entries
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <Button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Document Details and Actions */}
              {selectedDoc && (
                <div className="mt-6 p-4 md:p-6 border rounded-lg shadow-lg bg-white w-full max-w-4xl mx-auto">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="text-sm md:text-lg"><strong>Subject:</strong> {selectedDoc.subject}</p>
                    <p className="text-sm md:text-lg"><strong>AWD No.:</strong> {selectedDoc.awdReferenceNumber}</p>
                    <p className="text-sm md:text-lg"><strong>Forwarded By:</strong> {selectedDoc.forwardedBy}</p>
                    <p className="text-sm md:text-lg"><strong>Remarks:</strong> {selectedDoc.remarks}</p>
                  </div>

                  {/* Forward Selection */}
                  <div className="mt-4">
                    <label className="block text-sm md:text-lg font-semibold mb-2">Forward To:</label>
                    <Select
                      value={forwardTo}
                      onValueChange={(value) => setForwardTo(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an Admin" />
                      </SelectTrigger>
                      <SelectContent>
                        {["CATCID Admin", "GACID Admin", "EARD Admin", "MOOCSU Admin", "Secretary", "FSIS"].map((admin, index) => (
                          <SelectItem key={index} value={admin}>{admin}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full mt-4 md:mt-6" 
                    onClick={handleProcessDocument} 
                    disabled={!forwardTo}
                  >
                    Mark as Signed & Forward
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