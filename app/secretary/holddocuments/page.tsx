"use client";

import { useState, useEffect, useCallback } from "react";
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
};

const ITEMS_PER_PAGE = 10;

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
  const [filteredDocuments, setFilteredDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

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
          
          // Enhanced sorting by AWD reference number (numeric parts first)
          fetchedDocs.sort((a, b) => {
            const extractNumber = (ref: string) => {
              const match = ref.match(/\d+$/);
              return match ? parseInt(match[0], 10) : 0;
            };
            
            const aNum = extractNumber(a.awdReferenceNumber);
            const bNum = extractNumber(b.awdReferenceNumber);
            
            if (aNum !== bNum) {
              return bNum - aNum; // Descending order
            }
            return b.awdReferenceNumber.localeCompare(a.awdReferenceNumber);
          });
          
          setDocuments(fetchedDocs);
          setFilteredDocuments(fetchedDocs);
        } else {
          setDocuments([]);
          setFilteredDocuments([]);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
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
        doc.subject?.toLowerCase().includes(search.toLowerCase()) ||
        doc.awdReferenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
        doc.forwardedBy?.toLowerCase().includes(search.toLowerCase()) ||
        doc.forwardedTo?.toLowerCase().includes(search.toLowerCase()) ||
        doc.remarks?.toLowerCase().includes(search.toLowerCase())
      );
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

  const handleReturnToTracker = useCallback(async () => {
    if (!selectedDoc || !selectedDoc.id) return;
    try {
      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        status: "Open",
      });

      setDocuments(documents.filter(doc => doc.id !== selectedDoc.id));
      setSelectedDoc(null);
      alert(`Document ${selectedDoc.awdReferenceNumber} status changed to Open`);
    } catch (error) {
      console.error("Error returning document to tracker:", error);
    }
  }, [selectedDoc, documents]);

  const handleEdit = (id: string) => {
    localStorage.setItem("selectedAwdRefNum", id);
    router.push(`/admin/Documents/editaction`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this document?`)) {
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
                    <BreadcrumbPage>On Hold Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-4xl font-bold">On Hold Documents</h1>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>

              <div className="rounded-md border">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Submitted</TableHead>
                      <TableHead>AWD No.</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.length ? (
                      currentData.map((doc) => {
                        const deadlineStatus = getDeadlineStatus(doc.dateTimeSubmitted, doc.workingDays);
                        return (
                          <TableRow
                            key={doc.id}
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => setSelectedDoc(doc)}
                          >
                            <TableCell>{doc.dateTimeSubmitted}</TableCell>
                            <TableCell>{doc.awdReferenceNumber}</TableCell>
                            <TableCell>{doc.subject}</TableCell>
                            <TableCell>
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
                            <TableCell onClick={(e) => e.stopPropagation()}>
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
                        <TableCell colSpan={5} className="h-24 text-center">
                          {documents.length === 0 ? "No documents on hold" : "No matching documents"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Enhanced Pagination controls */}
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

              {selectedDoc && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <p className="text-lg"><strong>ID:</strong> {selectedDoc.id}</p>
                    <p className="text-lg"><strong>Subject:</strong> {selectedDoc.subject}</p>
                    <p className="text-lg"><strong>AWD No.:</strong> {selectedDoc.awdReferenceNumber}</p>
                    <p className="text-lg"><strong>Date Submitted:</strong> {selectedDoc.dateTimeSubmitted}</p>
                    <p className="text-lg"><strong>Deadline:</strong> 
                      <Badge
                        variant="default"
                        className={
                          getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).color === "red"
                            ? "bg-red-600 text-white ml-2"
                            : getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).color === "yellow"
                            ? "bg-yellow-400 text-white ml-2"
                            : getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).color === "green"
                            ? "bg-green-600 text-white ml-2"
                            : "bg-gray-500 text-white ml-2"
                        }
                      >
                        {getDeadlineStatus(selectedDoc.dateTimeSubmitted, selectedDoc.workingDays).status}
                      </Badge>
                    </p>
                    <p className="text-lg"><strong>Forwarded By:</strong> {selectedDoc.forwardedBy}</p>
                    <p className="text-lg"><strong>Forwarded To:</strong> {selectedDoc.forwardedTo}</p>
                    <p className="text-lg"><strong>Remarks:</strong> {selectedDoc.remarks}</p>
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