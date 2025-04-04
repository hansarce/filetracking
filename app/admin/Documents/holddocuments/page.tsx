"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update, query, orderByChild, equalTo } from "firebase/database";
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
  assignedInspector: string;
  dateTimeSubmitted: string;
  endDate?: string;
};

const getDeadlineStatus = (dateTimeSubmitted: string, workingDays: string) => {
  const daysToAdd = parseInt(workingDays, 10);
  const submittedDate = new Date(dateTimeSubmitted);
  const deadlineDate = new Date(submittedDate);
  deadlineDate.setDate(submittedDate.getDate() + daysToAdd);

  const currentDate = new Date();
  const timeDifference = deadlineDate.getTime() - currentDate.getTime();
  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  if (daysDifference <= 3) {
    return { status: `${daysDifference} day(s) left`, color: "red" };
  } else if (daysDifference <= 7) {
    return { status: `${daysDifference} day(s) left`, color: "yellow" };
  } else if (daysDifference <= 20) {
    return { status: `${daysDifference} day(s) left`, color: "green" };
  } else {
    return { status: `${daysDifference} day(s) left`, color: "gray" };
  }
};

export default function HoldDocuments() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [sortedDocuments, setSortedDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const router = useRouter();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract numeric part from AWD reference number for sorting
  const extractAwdNumber = (awdRef: string) => {
    const match = awdRef.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  };

  useEffect(() => {
    const docsRef = ref(database, "documents");
    const docsQuery = query(docsRef, orderByChild("status"), equalTo("On Hold"));

    const unsubscribe = onValue(docsQuery, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const fetchedDocs: DocData[] = [];
          snapshot.forEach((childSnapshot) => {
            const doc = childSnapshot.val();
            fetchedDocs.push({ 
              id: childSnapshot.key,
              awdReferenceNumber: childSnapshot.key,
              ...doc 
            });
          });
          
          // Sort by AWD reference number in descending order
          const sorted = [...fetchedDocs].sort((a, b) => {
            return extractAwdNumber(b.awdReferenceNumber) - extractAwdNumber(a.awdReferenceNumber);
          });
          
          setDocuments(sorted);
          setSortedDocuments(sorted);
        } else {
          setDocuments([]);
          setSortedDocuments([]);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter documents based on search
  const filteredDocuments = sortedDocuments.filter(doc => 
    doc.awdReferenceNumber.toLowerCase().includes(search.toLowerCase()) ||
    doc.subject.toLowerCase().includes(search.toLowerCase()) ||
    doc.forwardedBy.toLowerCase().includes(search.toLowerCase()) ||
    doc.forwardedTo.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleReturnToTracker = useCallback(async () => {
    if (!selectedDoc) return;
    try {
      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        status: "Open",
        forwardedTo: "Tracker"
      });

      setSelectedDoc(null);
      alert("Document successfully returned to tracker!");
    } catch (error) {
      console.error("Error returning document to tracker:", error);
    }
  }, [selectedDoc]);

  const handleRowClick = (doc: DocData) => {
    setSelectedDoc(doc);
  };

  const handleEdit = (id: string) => {
    localStorage.setItem("selectedAwdRefNum", id);
    router.push(`/admin/Documents/editaction`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this document (${id})?`)) {
      try {
        const docRef = ref(database, `documents/${id}`);
        await update(docRef, {
          status: "Deleted",
        });
        alert("Document marked as deleted successfully!");
      } catch (error) {
        console.error("Error deleting document:", error);
      }
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
                    <BreadcrumbPage>On Hold Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6 w-full overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl md:text-4xl font-bold">On Hold Documents</h1>
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>

              <div className="overflow-x-auto w-full">
                <Table className="border w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="min-w-[120px]">Date Submitted</TableHead>
                      <TableHead className="min-w-[120px]">AWD No.</TableHead>
                      <TableHead className="min-w-[200px]">Subject</TableHead>
                      <TableHead className="min-w-[150px]">Deadline</TableHead>
                      <TableHead className="min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length > 0 ? (
                      currentItems.map((doc) => {
                        const deadlineStatus = getDeadlineStatus(doc.dateTimeSubmitted, doc.workingDays);
                        return (
                          <TableRow
                            key={doc.id}
                            onClick={() => handleRowClick(doc)}
                            className="cursor-pointer hover:bg-gray-100"
                          >
                            <TableCell className="whitespace-nowrap">{doc.dateTimeSubmitted}</TableCell>
                            <TableCell className="whitespace-nowrap font-medium">{doc.awdReferenceNumber}</TableCell>
                            <TableCell className="min-w-[200px]">{doc.subject}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge
                                variant="default"
                                className={
                                  deadlineStatus.color === "red"
                                    ? "bg-red-600 text-white"
                                    : deadlineStatus.color === "yellow"
                                    ? "bg-yellow-400 text-white"
                                    : deadlineStatus.color === "green"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-500 text-white"
                                }
                              >
                                {deadlineStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger>
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleEdit(doc.id)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(doc.id)}>
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No documents found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
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
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}

              {selectedDoc && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white w-full max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-semibold">AWD No.:</p>
                      <p>{selectedDoc.awdReferenceNumber}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Date Submitted:</p>
                      <p>{selectedDoc.dateTimeSubmitted}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Subject:</p>
                      <p>{selectedDoc.subject}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Deadline:</p>
                      <Badge
                        variant="default"
                        className={
                          getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).color === "red"
                            ? "bg-red-600 text-white"
                            : getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).color === "yellow"
                            ? "bg-yellow-400 text-white"
                            : getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).color === "green"
                            ? "bg-green-600 text-white"
                            : "bg-gray-500 text-white"
                        }
                      >
                        {getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).status}
                      </Badge>
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
                      <p className="font-semibold">Remarks:</p>
                      <p>{selectedDoc.remarks}</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700" 
                    onClick={handleReturnToTracker}
                  >
                    Return to Tracker (Set Status to Open)
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