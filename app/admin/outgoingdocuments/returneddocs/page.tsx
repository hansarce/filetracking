"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update, push } from "firebase/database";
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
  forwardedtoname?: string;
  remarks: string;
  status: string;
  workingDays: string;
  dateTimeSubmitted: string;
};

export default function ReturnedDocuments() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [forwardedToName, setForwardedToName] = useState("");

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
            if (doc.status === "Returned") {
              fetchedDocs.push({ 
                id: childSnapshot.key, 
                ...doc,
                forwardedtoname: doc.forwardedtoname || ""
              });
            }
          });
          
          // Sort documents by AWD reference number in descending order
          const sortedDocs = [...fetchedDocs].sort((a, b) => {
            const extractNumber = (ref: string) => {
              const match = ref.match(/\d+$/);
              return match ? parseInt(match[0], 10) : 0;
            };
            
            const aNum = extractNumber(a.awdReferenceNumber);
            const bNum = extractNumber(b.awdReferenceNumber);
            
            if (aNum !== bNum) {
              return bNum - aNum;
            }
            return b.awdReferenceNumber.localeCompare(a.awdReferenceNumber);
          });
          
          setDocuments(sortedDocs);
          setFilteredDocuments(sortedDocs);
        } else {
          setDocuments([]);
          setFilteredDocuments([]);
        }
      } catch (error) {
        console.error("Error processing documents:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter documents based on search
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredDocuments(documents);
      setCurrentPage(1);
    } else {
      const filtered = documents.filter(doc => 
        doc.subject.toLowerCase().includes(search.toLowerCase()) ||
        doc.awdReferenceNumber.toLowerCase().includes(search.toLowerCase()) ||
        doc.forwardedBy?.toLowerCase().includes(search.toLowerCase()) ||
        doc.forwardedTo?.toLowerCase().includes(search.toLowerCase()) ||
        doc.remarks?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredDocuments(filtered);
      setCurrentPage(1);
    }
  }, [search, documents]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleForwardToDivision = async () => {
    if (!selectedDoc || !selectedDivision) return;

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

      if (!userName || !userDivision) return;

      const forwardedBy = `${userName} (${userDivision})`;
      const dateTimeSubmitted = new Date().toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Update the document in the "documents" table
      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        ...selectedDoc,
        forwardedBy,
        forwardedTo: selectedDivision,
        forwardedtoname: forwardedToName || selectedDivision,
        remarks: `Forwarded to ${selectedDivision}`,
        status: "Open",
        dateTimeSubmitted,
      });

      // Create a flat tracking entry with a unique ID
      const trackingRef = ref(database, "tracking");
      const newTrackingEntry = {
        documentId: selectedDoc.id,
        action: "Forwarded",
        forwardedBy,
        forwardedTo: selectedDivision,
        forwardedtoname: forwardedToName || selectedDivision,
        remarks: `Forwarded to ${selectedDivision}`,
        status: "Open",
        dateTimeSubmitted,
        actionTimestamp: Date.now(),
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        originatingOffice: selectedDoc.originatingOffice
      };
      
      await push(trackingRef, newTrackingEntry);

      setSelectedDoc(null);
      setSelectedDivision("");
      setForwardedToName("");
      alert(`Document successfully forwarded to ${selectedDivision}!`);
    } catch (error) {
      console.error("Error forwarding document:", error);
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
                    <BreadcrumbPage>Returned Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6 w-full overflow-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-4xl font-bold">Returned Documents</h1>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>

              {/* Document Table */}
              <div className="w-full overflow-x-auto mb-4">
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
                    {currentItems.length > 0 ? (
                      currentItems.map((doc) => (
                        <TableRow
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          <TableCell className="truncate max-w-[120px]">{doc.awdReceivedDate}</TableCell>
                          <TableCell className="truncate max-w-[120px]">{doc.awdReferenceNumber}</TableCell>
                          <TableCell className="truncate max-w-[200px]">{doc.subject}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{doc.forwardedBy}</TableCell>
                          <TableCell className="truncate max-w-[150px]">
                            {doc.forwardedtoname ? `${doc.forwardedtoname} (${doc.forwardedTo})` : doc.forwardedTo}
                          </TableCell>
                          <TableCell className="truncate max-w-[150px]">{doc.remarks}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          {documents.length === 0 ? "No returned documents found" : "No matching documents"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredDocuments.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDocuments.length)} of {filteredDocuments.length} entries
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
                    <p className="text-sm md:text-lg"><strong>Date of Document:</strong> {selectedDoc.dateOfDocument}</p>
                    <p className="text-sm md:text-lg"><strong>Deadline:</strong> {selectedDoc.deadline}</p>
                    <p className="text-sm md:text-lg"><strong>FSIS Reference No.:</strong> {selectedDoc.fsisReferenceNumber}</p>
                    <p className="text-sm md:text-lg"><strong>Originating Office:</strong> {selectedDoc.originatingOffice}</p>
                    <p className="text-sm md:text-lg"><strong>Working Days:</strong> {selectedDoc.workingDays}</p>
                    <p className="text-sm md:text-lg"><strong>Forwarded By:</strong> {selectedDoc.forwardedBy}</p>
                    <p className="text-sm md:text-lg col-span-1 md:col-span-2"><strong>Remarks:</strong> {selectedDoc.remarks}</p>
                  </div>

                  {/* Route to Division Dropdown */}
                  <div className="mt-4">
                    <label className="block text-lg font-semibold mb-2">Route to Division:</label>
                    <select
                      value={selectedDivision}
                      onChange={(e) => setSelectedDivision(e.target.value)}
                      className="w-full border p-2 rounded mb-4"
                    >
                      <option value="" disabled>Select a division</option>
                      <option value="CATCID Admin">CATCID Admin</option>
                      <option value="GACID Admin">GACID Admin</option>
                      <option value="EARD Admin">EARD Admin</option>
                      <option value="MOCSU Admin">MOCSU Admin</option>
                    </select>
                  </div>

                  {/* Forwarded To Name Input */}
                  <div className="mt-2">
                    <label className="block text-lg font-semibold mb-2">Forwarded To Name:</label>
                    <Input
                      type="text"
                      placeholder="Enter forwarded to name"
                      value={forwardedToName}
                      onChange={(e) => setForwardedToName(e.target.value)}
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <Button
                    className="w-full mt-4 md:mt-6 bg-blue-500 hover:bg-blue-600"
                    onClick={handleForwardToDivision}
                    disabled={!selectedDivision}
                  >
                    Forward to Division
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