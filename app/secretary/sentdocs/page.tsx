"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
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
import { database } from "@/lib/firebase/firebase"; 
import { ref, onValue } from "firebase/database";
import ProtectedRoute from '@/components/protected-route';

export type docudata = {
  id: string;
  datetime: string;
  awdrefnu: string;
  subject: string;
  origioffice: string;
  fsisrefnum: string;
  forwardby: string;
  forwardto: string;
  remarks: string;
};

const ITEMS_PER_PAGE = 10;

const fetchDocuments = (setDocuments: React.Dispatch<React.SetStateAction<docudata[]>>) => {
  const dbRef = ref(database, "tracking");

  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Fetched Firebase Data:", data);

    if (data) {
      const seenAwdRefNums = new Set();
      const transformedData: docudata[] = [];

      Object.entries(data).forEach(([key, value]: [string, any]) => {
        const awdRefNum = value.awdReferenceNumber || "N/A";
        const forwardedBy = value.forwardedBy || "N/A";

        if (forwardedBy.includes("Secretary") && !seenAwdRefNums.has(awdRefNum)) {
          seenAwdRefNums.add(awdRefNum);

          transformedData.push({
            id: key,
            datetime: value.dateTimeSubmitted || "N/A",
            awdrefnu: awdRefNum,
            subject: value.subject || "N/A",
            origioffice: value.originatingOffice || "N/A",
            fsisrefnum: value.fsisReferenceNumber || "N/A",
            forwardby: forwardedBy,
            forwardto: value.forwardedTo || "N/A",
            remarks: value.remarks || "N/A",
          });
        }
      });

      // Sort documents by AWD reference number in descending order
      transformedData.sort((a, b) => {
        // Extract numeric parts for proper numeric sorting
        const extractNumber = (ref: string) => {
          const match = ref.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        };
        
        const aNum = extractNumber(a.awdrefnu);
        const bNum = extractNumber(b.awdrefnu);
        
        if (aNum !== bNum) {
          return bNum - aNum; // Descending order
        }
        return b.awdrefnu.localeCompare(a.awdrefnu);
      });

      setDocuments(transformedData);
    } else {
      setDocuments([]);
    }
  });
};

export default function SentDocs() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<docudata[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<docudata[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter(); 

  useEffect(() => {
    fetchDocuments(setDocuments);
  }, []);

  // Filter documents based on search
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredDocuments(documents);
      setCurrentPage(1);
    } else {
      const filtered = documents.filter((doc) => {
        const lowerSearch = search.toLowerCase();
        return (
          doc.subject?.toLowerCase().includes(lowerSearch) ||
          doc.awdrefnu?.toLowerCase().includes(lowerSearch) ||
          doc.forwardby?.toLowerCase().includes(lowerSearch) ||
          doc.forwardto?.toLowerCase().includes(lowerSearch) ||
          doc.remarks?.toLowerCase().includes(lowerSearch)
        );
      });
      setFilteredDocuments(filtered);
      setCurrentPage(1);
    }
  }, [search, documents]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const currentData = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = (awdrefnu: string) => {
    if (!awdrefnu || awdrefnu === "N/A") {
      console.error("awdReferenceNumber is undefined or missing!");
      return;
    }

    localStorage.setItem("selectedAwdRefNum", awdrefnu);
    router.push(`/secretary/subjectinformation`);
  };

  return (
    <ProtectedRoute allowedDivisions={['secretary']}>
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebarSecretary />
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
                    <BreadcrumbPage>Sent Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-4xl md:text-6xl font-bold p-3">Sent Documents</h1>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>
              
              <div className="rounded-md border overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date and Time</TableHead>
                      <TableHead>AWD Reference Number</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Forwarded By</TableHead>
                      <TableHead>Forwarded To</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.length ? (
                      currentData.map((doc) => (
                        <TableRow
                          key={doc.id}
                          className="cursor-pointer hover:bg-gray-200"
                          onClick={() => handleRowClick(doc.awdrefnu)}
                        >
                          <TableCell>{doc.datetime}</TableCell>
                          <TableCell>{doc.awdrefnu}</TableCell>
                          <TableCell>{doc.subject}</TableCell>
                          <TableCell>{doc.forwardby}</TableCell>
                          <TableCell>{doc.forwardto}</TableCell>
                          <TableCell>{doc.remarks}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          {documents.length === 0 ? "No sent documents found" : "No matching documents"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              {filteredDocuments.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocuments.length)} of{" "}
                    {filteredDocuments.length} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
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