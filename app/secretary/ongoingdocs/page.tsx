"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, query, orderByChild, update } from "firebase/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import ProtectedRoute from '@/components/protected-route';
import { Button } from "@/components/ui/button";

interface DocumentData {
  id: string;
  awdReferenceNumber: string;
  subject: string;
  status: string;
  workingDays: string;
  dateTimeSubmitted: string;
  forwardedBy?: string;
  forwardedTo?: string;
  remarks?: string;
}

const ITEMS_PER_PAGE = 10;

export default function OngoingDocuments() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const docsRef = ref(database, "documents");
    const unsubscribe = onValue(docsRef, (snapshot) => {
      try {
        const docs: DocumentData[] = [];
        snapshot.forEach((child) => {
          const doc = child.val();
          if (doc.status === "Open" || doc.status === "Returned") {
            docs.push({
              id: child.key || "",
              awdReferenceNumber: doc.awdReferenceNumber || "N/A",
              subject: doc.subject || "N/A",
              status: doc.status || "N/A",
              workingDays: doc.workingDays || "0",
              dateTimeSubmitted: doc.dateTimeSubmitted || doc.awdReceivedDate || "N/A",
              forwardedBy: doc.forwardedBy,
              forwardedTo: doc.forwardedTo,
              remarks: doc.remarks
            });
          }
        });

        // Sort documents by AWD reference number in descending order
        const sortedDocs = [...docs].sort((a, b) => {
          // Extract numeric parts from AWD reference numbers for proper numeric sorting
          const extractNumber = (ref: string) => {
            const match = ref.match(/\d+$/);
            return match ? parseInt(match[0], 10) : 0;
          };
          
          const aNum = extractNumber(a.awdReferenceNumber);
          const bNum = extractNumber(b.awdReferenceNumber);
          
          // First try numeric comparison
          if (aNum !== bNum) {
            return bNum - aNum; // Descending order
          }
          // If numeric parts are equal, fall back to string comparison
          return b.awdReferenceNumber.localeCompare(a.awdReferenceNumber);
        });

        setDocuments(sortedDocs);
        setFilteredDocuments(sortedDocs);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setLoading(false);
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
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const currentData = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getDeadlineStatus = (date: string, days: string) => {
    if (!date || date === "N/A") return { status: "N/A", color: "gray" };
    
    const daysNum = parseInt(days) || 0;
    const deadline = new Date(date);
    deadline.setDate(deadline.getDate() + daysNum);
    
    const diff = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (diff <= 0) return { status: "Overdue", color: "red" };
    if (diff <= 3) return { status: `${diff} day(s) left`, color: "red" };
    if (diff <= 7) return { status: `${diff} day(s) left`, color: "yellow" };
    if (diff <= 20) return { status: `${diff} day(s) left`, color: "green" };
    return { status: `${diff} day(s) left`, color: "gray" };
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
                    <BreadcrumbPage>Ongoing Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-4xl md:text-6xl font-bold p-3">Ongoing Documents</h1>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-xl text-gray-500">Loading documents...</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
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
                        {currentData.length > 0 ? (
                          currentData.map((doc) => {
                            const deadline = getDeadlineStatus(doc.dateTimeSubmitted, doc.workingDays);
                            return (
                              <TableRow
                                key={doc.id}
                                className="cursor-pointer hover:bg-gray-200"
                                onClick={() => router.push(`/admin/Documents/subjectinformation?awdRef=${doc.awdReferenceNumber}`)}
                              >
                                <TableCell>{doc.dateTimeSubmitted}</TableCell>
                                <TableCell>{doc.awdReferenceNumber}</TableCell>
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
                </>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}