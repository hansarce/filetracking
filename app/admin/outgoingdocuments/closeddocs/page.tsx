"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, query, orderByChild, equalTo, update } from "firebase/database";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type DocData = {
  id: string;
  awdReferenceNumber: string;
  originatingOffice: string;
  subject: string;
  receivedBy?: string;
  assignedInspector: string;
  awdReceivedDate: string;
  dateOfDocument: string;
  dateTimeSubmitted: string;
  deadline: string;
  endDate: string;
  forwardedBy: string;
  forwardedTo: string;
  fsisReferenceNumber: string;
  remarks: string;
  startDate: string;
  status: string;
  workingDays: string;
};

export default function ClosedDocuments() {
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocData[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [receiverName, setReceiverName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

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
              id: childSnapshot.key,
              ...doc
            });
          });
          fetchedDocs.sort((a, b) => 
            b.awdReferenceNumber.localeCompare(a.awdReferenceNumber)
          );
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

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDocuments(documents);
      setCurrentPage(1);
    } else {
      const filtered = documents.filter(doc => 
        doc.awdReferenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocuments(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, documents]);

  const handleRowClick = (doc: DocData) => {
    localStorage.setItem("selectedAwdRefNum", doc.awdReferenceNumber);
    router.push(`/admin/Documents/subjectinformation`);
  };

  const toggleRowSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const toggleAllRowsSelection = () => {
    const currentDocNumbers = currentDocuments.map(doc => doc.id);
    const allSelected = currentDocNumbers.every(num => selectedRows.has(num));
    
    const newSelection = new Set(selectedRows);
    
    if (allSelected) {
      currentDocNumbers.forEach(num => newSelection.delete(num));
    } else {
      currentDocNumbers.forEach(num => newSelection.add(num));
    }
    
    setSelectedRows(newSelection);
  };

  const updateReceivedBy = async () => {
    if (selectedRows.size === 0 || !receiverName.trim()) return;
    
    try {
      setIsUpdating(true);
      const updates: Record<string, string> = {};
      const timestamp = new Date().toLocaleString();
      
      Array.from(selectedRows).forEach(docId => {
        updates[`documents/${docId}/receivedBy`] = `${receiverName.trim()} (${timestamp})`;
      });
      
      await update(ref(database), updates);
      setReceiverName("");
      setSelectedRows(new Set());
    } catch (error) {
      console.error("Error updating documents:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const copySelectedToClipboard = () => {
    if (selectedRows.size === 0) return;

    // Get all selected documents (including those not on current page)
    const selectedDocs = documents.filter(doc => selectedRows.has(doc.id));
    
    // Create tab-separated rows without headers
    const rows = selectedDocs.map(doc => [
      doc.awdReferenceNumber,
      doc.originatingOffice,
      doc.subject,
      doc.receivedBy || "Not received yet"
    ].join("\t"));

    const csvContent = rows.join("\n");

    // Copy to clipboard
    navigator.clipboard.writeText(csvContent)
      .then(() => alert(`${selectedRows.size} documents copied to clipboard!`))
      .catch(err => console.error("Failed to copy:", err));
  };

  const selectAllMatching = () => {
    if (searchTerm.trim() === "") return;
    
    const matchingDocs = filteredDocuments.map(doc => doc.id);
    const newSelection = new Set(selectedRows);
    
    matchingDocs.forEach(docId => {
      newSelection.add(docId);
    });
    
    setSelectedRows(newSelection);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocuments = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const allRowsSelected = currentDocuments.length > 0 && 
    currentDocuments.every(doc => selectedRows.has(doc.id));

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
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by AWD number"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  {searchTerm && (
                    <Button 
                      variant="outline"
                      onClick={selectAllMatching}
                    >
                      Select All Matching
                    </Button>
                  )}
                </div>
              </div>

              {selectedRows.size > 0 && (
                <div className="flex gap-2 items-center mb-4 p-4 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="Enter receiver name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-64"
                  />
                  <Button 
                    onClick={updateReceivedBy}
                    disabled={!receiverName.trim() || isUpdating}
                  >
                    {isUpdating ? "Updating..." : "Mark as Received"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copySelectedToClipboard}
                    disabled={isUpdating}
                  >
                    Copy Selected
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedRows(new Set())}
                    disabled={isUpdating}
                  >
                    Clear Selection
                  </Button>
                  <span className="text-sm text-gray-600 ml-2">
                    {selectedRows.size} document(s) selected
                  </span>
                </div>
              )}

              <div className="">
                <Table className="border w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead>
                        <Checkbox
                          checked={allRowsSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAllRowsSelection();
                          }}
                        />
                      </TableHead>
                      <TableHead>AWD No.</TableHead>
                      <TableHead>Originating Office</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Received By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDocuments.length > 0 ? (
                      currentDocuments.map((doc) => (
                        <TableRow
                          key={doc.id}
                          onClick={() => handleRowClick(doc)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          <TableCell onClick={(e) => toggleRowSelection(doc.id, e)}>
                            <Checkbox 
                              checked={selectedRows.has(doc.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>{doc.awdReferenceNumber}</TableCell>
                          <TableCell>{doc.originatingOffice}</TableCell>
                          <TableCell>{doc.subject}</TableCell>
                          <TableCell>{doc.receivedBy || "Not received yet"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          {searchTerm ? "No matching documents found" : "No closed documents available"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredDocuments.length)} of {filteredDocuments.length} documents
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.ceil(filteredDocuments.length / itemsPerPage) }, (_, i) => (
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
                    disabled={currentPage === Math.ceil(filteredDocuments.length / itemsPerPage)}
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