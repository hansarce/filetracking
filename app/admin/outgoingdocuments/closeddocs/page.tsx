"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, query, orderByChild, equalTo } from "firebase/database";
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
import { useRouter } from "next/navigation";
import ProtectedRoute from '@/components/protected-route';
import { Button } from "@/components/ui/button";

export type DocData = {
  awdReceivedDate: string;
  awdReferenceNumber: string;
  subject: string;
  dateofDocument: string;
  deadline: string;
  originatingOffice: string;
  fsisReferenceNumber: string;
  workingDays: string;
  forwardedBy: string;
  forwardedTo: string;
  remarks: string;
  status: string;
  dateTimeSubmitted: string;
  endDate?: string;  // Changed from closedDate to endDate
};

export default function ClosedDocuments() {
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // You can adjust this number
  const router = useRouter();

  // Fetch documents with status "Closed"
  useEffect(() => {
    const docsRef = ref(database, "documents");
    const docsQuery = query(docsRef, orderByChild("status"), equalTo("Closed"));

    const unsubscribe = onValue(docsQuery, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const fetchedDocs: DocData[] = [];
          snapshot.forEach((childSnapshot) => {
            const doc = childSnapshot.val();
            fetchedDocs.push({ 
              awdReferenceNumber: childSnapshot.key, 
              ...doc,
              endDate: doc.endDate || doc.closedDate // Fallback to closedDate if endDate doesn't exist
            });
          });
          // Sort documents by AWD reference number in descending order
          fetchedDocs.sort((a, b) => 
            b.awdReferenceNumber.localeCompare(a.awdReferenceNumber)
          );
          setDocuments(fetchedDocs);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle row click
  const handleRowClick = (doc: DocData) => {
    localStorage.setItem("selectedAwdRefNum", doc.awdReferenceNumber);
    router.push(`/admin/Documents/subjectinformation`);
  };

  // Get current documents for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocuments = documents.slice(indexOfFirstItem, indexOfLastItem);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <ProtectedRoute allowedDivisions={['admin']}>
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebar />
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
                    <BreadcrumbPage>Closed Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6 max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold">Closed Documents</h1>
              </div>

              <div className="overflow-x-auto">
                <Table className="border w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead>Date Submitted</TableHead>
                      <TableHead>AWD No.</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Closed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDocuments.map((doc) => (
                      <TableRow
                        key={doc.awdReferenceNumber}
                        onClick={() => handleRowClick(doc)}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <TableCell>{doc.dateTimeSubmitted}</TableCell>
                        <TableCell>{doc.awdReferenceNumber}</TableCell>
                        <TableCell>{doc.subject}</TableCell>
                        <TableCell>{doc.endDate || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-center mt-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.ceil(documents.length / itemsPerPage) }, (_, i) => (
                    <Button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === Math.ceil(documents.length / itemsPerPage)}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}