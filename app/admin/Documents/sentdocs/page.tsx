"use client";

import { useState, useEffect } from "react";
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
import { ref, onValue, get, update } from "firebase/database";
import ProtectedRoute from '@/components/protected-route';

export type docudata = {
  id: string;
  datetime: string;
  awdrefnu: string;
  subject: string;
  workingDays: string;
  startDate?: string;
  endDate?: string;
};

const fetchDocuments = (setDocuments: React.Dispatch<React.SetStateAction<docudata[]>>) => {
  const dbRef = ref(database, "tracking");

  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const seenAwdRefNums = new Set<string>();
      const transformedData: docudata[] = [];

      Object.entries(data as Record<string, Record<string, unknown>>).forEach(([key, value]) => {
        const awdRefNum = (value.awdReferenceNumber as string) || "N/A";
        const forwardedBy = (value.forwardedBy as string) || "N/A";

        if (forwardedBy.includes("Admin") && !seenAwdRefNums.has(awdRefNum)) {
          seenAwdRefNums.add(awdRefNum);
          transformedData.push({
            id: key,
            datetime: (value.dateTimeSubmitted as string) || "N/A",
            awdrefnu: awdRefNum,
            subject: (value.subject as string) || "N/A",
            workingDays: (value.workingDays as string) || "N/A",
            startDate: (value.startDate as string) || (value.dateTimeSubmitted as string) || "N/A",
            endDate: (value.endDate as string) || undefined,
          });
        }
      });
      
      // Sort documents by AWD reference number in descending order
      const sorted = transformedData.sort((a, b) => {
        // Extract the numeric part from AWD reference numbers
        const extractNumber = (ref: string) => {
          const match = ref.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        };
        return extractNumber(b.awdrefnu) - extractNumber(a.awdrefnu);
      });
      
      setDocuments(sorted);
    } else {
      setDocuments([]);
    }
  });
};

const getDeadlineStatus = (startDate: string, workingDays: string, endDate?: string) => {
  if (endDate) return { status: "Closed", color: "gray" };
  if (!startDate || startDate === "N/A") return { status: "N/A", color: "gray" };
  
  const daysToAdd = parseInt(workingDays) || 0;
  const deadlineDate = new Date(startDate);
  deadlineDate.setDate(deadlineDate.getDate() + daysToAdd);
  
  const diff = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (diff <= 0) return { status: "Overdue", color: "red" };
  if (diff <= 3) return { status: `${diff} day(s) left`, color: "red" };
  if (diff <= 7) return { status: `${diff} day(s) left`, color: "yellow" };
  if (diff <= 20) return { status: `${diff} day(s) left`, color: "green" };
  return { status: `${diff} day(s) left`, color: "gray" };
};

export default function SentDocs() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<docudata[]>([]);
  const router = useRouter();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchDocuments(setDocuments);
  }, []);

  const filteredData = documents.filter((doc) => {
    const lowerSearch = search.toLowerCase();
    return (
      doc.subject?.toLowerCase().includes(lowerSearch) ||
      doc.awdrefnu?.toLowerCase().includes(lowerSearch)
    );
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleRowClick = (awdrefnu: string) => {
    if (!awdrefnu || awdrefnu === "N/A") return;
    localStorage.setItem("selectedAwdRefNum", awdrefnu);
    router.push(`/admin/Documents/subjectinformation`);
  };

  const handleEdit = (awdrefnu: string) => {
    localStorage.setItem("selectedAwdRefNum", awdrefnu);
    router.push(`/admin/Documents/editaction`);
  };

  const handleDelete = async (awdrefnu: string) => {
    if (!confirm(`Delete document ${awdrefnu}?`)) return;
    
    try {
      const [documentsSnapshot, trackingSnapshot, returnedSnapshot] = await Promise.all([
        get(ref(database, "documents")),
        get(ref(database, "tracking")),
        get(ref(database, "returned"))
      ]);

      const updates = {
        ...getUpdates(documentsSnapshot, "documents", awdrefnu),
        ...getUpdates(trackingSnapshot, "tracking", awdrefnu),
        ...getUpdates(returnedSnapshot, "returned", awdrefnu)
      };

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
        alert("Document deleted successfully!");
      } else {
        alert("No matching documents found.");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document.");
    }
  };

  const getUpdates = (
    snapshot: import("@firebase/database").DataSnapshot, // Replaced 'any' with the correct type
    tableName: string,
    awdrefnu: string
  ) => {
    const updates: Record<string, null> = {};
    snapshot.forEach((childSnapshot) => {
      const doc = childSnapshot.val() as Record<string, unknown>;
      if (doc.awdReferenceNumber === awdrefnu) {
        updates[`${tableName}/${childSnapshot.key}`] = null;
      }
    });
    return updates;
  };

  return (
    <ProtectedRoute allowedDivisions={['admin']}>
      <SidebarProvider>
        <div className="flex h-screen w-screen">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col w-full">
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

            <div className="p-6 w-full overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-4xl md:text-6xl font-bold">Sent Documents</h1>
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

              <div className="rounded-md border w-full overflow-x-auto mb-4">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Date and Time</TableHead>
                      <TableHead className="min-w-[150px]">AWD No.</TableHead>
                      <TableHead className="min-w-[250px]">Subject</TableHead>
                      <TableHead className="min-w-[150px]">Deadline Status</TableHead>
                      <TableHead className="min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length ? (
                      currentItems.map((doc) => {
                        const deadline = getDeadlineStatus(doc.startDate || doc.datetime, doc.workingDays, doc.endDate);
                        return (
                          <TableRow
                            key={doc.id}
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => handleRowClick(doc.awdrefnu)}
                          >
                            <TableCell className="whitespace-nowrap">{doc.datetime}</TableCell>
                            <TableCell className="whitespace-nowrap font-medium">{doc.awdrefnu}</TableCell>
                            <TableCell>{doc.subject}</TableCell>
                            <TableCell>
                              <Badge
                                variant="default"
                                className={
                                  deadline.color === "red" ? "bg-red-600 text-white" :
                                  deadline.color === "yellow" ? "bg-yellow-400 text-white" :
                                  deadline.color === "green" ? "bg-green-600 text-white" :
                                  "bg-gray-500 text-white"
                                }
                              >
                                {deadline.status}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger>
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleEdit(doc.awdrefnu)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(doc.awdrefnu)}>
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
                          {documents.length ? "No matching documents" : "No sent documents"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} entries
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
            </div>
          </SidebarInset>
        </div>  
      </SidebarProvider>
    </ProtectedRoute>
  );
}