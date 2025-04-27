"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update } from "firebase/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import ProtectedRoute from '@/components/protected-route';

interface DocumentData {
  id: string;
  awdReferenceNumber: string;
  subject: string;
  status: string;
  workingDays: string;
  dateTimeSubmitted: string;
  startDate?: string; // Added this field
  forwardedBy?: string;
  forwardedTo?: string;
  remarks?: string;
}

export default function OngoingDocuments() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [sortedDocuments, setSortedDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const docsRef = ref(database, "documents");
    const unsubscribe = onValue(docsRef, (snapshot) => {
      try {
        const docs: DocumentData[] = [];
        snapshot.forEach((child) => {
          const doc = child.val();
          // Only include documents with status "Open" or "Returned" (exclude "Closed")
          if (doc.status === "Open" || doc.status === "Returned") {
            docs.push({
              id: child.key || "",
              awdReferenceNumber: doc.awdReferenceNumber || "N/A",
              subject: doc.subject || "N/A",
              status: doc.status || "N/A",
              workingDays: doc.workingDays || "0",
              dateTimeSubmitted: doc.dateTimeSubmitted || doc.awdReceivedDate || "N/A",
              startDate: doc.startDate || doc.dateTimeSubmitted || "N/A", // Use startDate if available, fallback to dateTimeSubmitted
              forwardedBy: doc.forwardedBy,
              forwardedTo: doc.forwardedTo,
              remarks: doc.remarks
            });
          }
        });
        
        // Sort documents by AWD reference number in descending order
        const sorted = [...docs].sort((a, b) => {
          // Extract the numeric part from AWD reference numbers
          const extractNumber = (ref: string) => {
            const match = ref.match(/\d+$/);
            return match ? parseInt(match[0]) : 0;
          };
          return extractNumber(b.awdReferenceNumber) - extractNumber(a.awdReferenceNumber);
        });
        
        setDocuments(sorted);
        setSortedDocuments(sorted);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter and paginate documents
  const filteredDocs = sortedDocuments.filter(doc => 
    doc.subject.toLowerCase().includes(search.toLowerCase()) ||
    doc.awdReferenceNumber.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

   // Improved getDeadlineStatus function
const getDeadlineStatus = (startDate: string, workingDaysStr: string) => {
  if (!startDate || startDate === "N/A" || !workingDaysStr) {
    return { status: "N/A", color: "gray" };
  }

  const totalWorkingDays = parseInt(workingDaysStr) || 0;
  if (totalWorkingDays <= 0) return { status: "No deadline", color: "gray" };

  // Parse start date (handle both ISO and MM/DD/YYYY formats)
  const parseDate = (dateStr: string) => {
    if (dateStr.includes("/")) {
      const [month, day, year] = dateStr.split("/");
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date(dateStr);
  };

  const start = parseDate(startDate);
  if (isNaN(start.getTime())) return { status: "Invalid date", color: "gray" };

  // Calculate deadline date by adding working days (excluding weekends)
  const calculateDeadline = (fromDate: Date, daysToAdd: number) => {
    const result = new Date(fromDate);
    let addedDays = 0;
    
    while (addedDays < daysToAdd) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) { // Skip weekends
        addedDays++;
      }
    }
    return result;
  };

  const deadline = calculateDeadline(start, totalWorkingDays);

  // Calculate remaining working days between today and deadline
  const calculateRemainingWorkingDays = (from: Date, to: Date) => {
    const current = new Date(from); // Changed 'let' to 'const'
    current.setDate(current.getDate() + 1); // Start counting from tomorrow
    let remainingDays = 0;
    
    while (current <= to) {
      if (current.getDay() !== 0 && current.getDay() !== 6) { // Count only weekdays
        remainingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    return remainingDays;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  deadline.setHours(23, 59, 59, 999); // Normalize to end of deadline day

  if (today > deadline) {
    return { status: "Overdue", color: "red" };
  }

  const remainingDays = calculateRemainingWorkingDays(today, deadline);

  // Format the status text
  const formatStatusText = (days: number, dueDate: Date) => {
    const formattedDate = dueDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    if (days === 0) {
      return `Due today (${formattedDate})`;
    }
    return `${days} working day${days !== 1 ? 's' : ''} left (due ${formattedDate})`;
  };

  const statusText = formatStatusText(remainingDays, deadline);

  // Determine color based on urgency
  if (remainingDays === 0) return { status: statusText, color: "red" };
  if (remainingDays <= 3) return { status: statusText, color: "red" };
  if (remainingDays <= 7) return { status: statusText, color: "yellow" };
  return { status: statusText, color: "green" };
};

  const handleEdit = (id: string) => {
    localStorage.setItem("selectedAwdRefNum", id);
    router.push("/admin/Documents/editaction");
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Delete document ${id}?`)) {
      try {
        await update(ref(database, `documents/${id}`), { status: "Deleted" });
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Delete failed. Please try again.");
      }
    }
  };

  return (
    <ProtectedRoute allowedDivisions={['admin']}>
      <SidebarProvider>
        <div className="flex h-screen w-screen">
          <AppSidebar />
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
                    <BreadcrumbPage>Ongoing Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-6xl p-3 font-bold">Ongoing Documents</h1>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="w-64 border p-2 rounded"
                />
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-xl text-gray-500">Loading documents...</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date Submitted</TableHead>
                          <TableHead>AWD No.</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentItems.length > 0 ? (
                          currentItems.map((doc) => {
                            // Use startDate for deadline calculation if available, otherwise fallback to dateTimeSubmitted
                            const deadlineDate = doc.startDate || doc.dateTimeSubmitted;
                            const deadline = getDeadlineStatus(deadlineDate, doc.workingDays);
                            return (
                              <TableRow
                                key={doc.id}
                                className="cursor-pointer hover:bg-gray-200"
                                onClick={() => {
                                  localStorage.setItem("selectedAwdRefNum", doc.awdReferenceNumber);
                                  router.push(`/admin/Documents/subjectinformation`);
                                }}
                              >
                                <TableCell>{doc.dateTimeSubmitted}</TableCell>
                                <TableCell className="font-medium">{doc.awdReferenceNumber}</TableCell>
                                <TableCell>{doc.subject}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      doc.status === "Returned"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-green-100 text-green-800"
                                    }
                                  >
                                    {doc.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="default"
                                    className={
                                      deadline.color === "red"
                                        ? "bg-red-600 text-white"
                                        : deadline.color === "yellow"
                                        ? "bg-yellow-400 text-white"
                                        : deadline.color === "green"
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-500 text-white"
                                    }
                                  >
                                    {deadline.status}
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
                            <TableCell colSpan={6} className="h-24 text-center">
                              {documents.length === 0
                                ? "No ongoing documents found."
                                : "No results match your search."}
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
                </>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}