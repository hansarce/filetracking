"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, query, orderByChild, equalTo, update, push, get } from "firebase/database";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataSnapshot } from "firebase/database";

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

const FORWARD_TO_OPTIONS = [
  "CATCID Admin",
  "GACID Admin",
  "EARD Admin",
  "MOCSU Admin",
  "Secretary"
];

export default function ClosedDocuments() {
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocData[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [receiverName, setReceiverName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [forwardedTo, setForwardedTo] = useState("");
  const router = useRouter();

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

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
              id: childSnapshot.key || "",
              ...doc,
              dateTimeSubmitted: formatDateTime(doc.dateTimeSubmitted)
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

  const toggleRowSelection = (id: string) => {
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
      const timestamp = formatDateTime(new Date().toISOString());
      
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

  const returnDocuments = async () => {
    if (selectedRows.size === 0 || !remarks.trim() || !forwardedTo) return;
    
    try {
      setIsReturning(true);
      const updates: Record<string, unknown> = {};
      const timestamp = formatDateTime(new Date().toISOString());
      
      const selectedDocs = documents.filter(doc => selectedRows.has(doc.id));
      
      for (const doc of selectedDocs) {
        // Create return record
        const returnData = {
          ...doc,
          dateTimeSubmitted: timestamp,
          remarks,
          forwardedTo,
          status: "Open",
          returnedBy: doc.receivedBy || "Unknown"
        };
        
        // Add to returntoawd table
        await push(ref(database, "returntoawd"), returnData);
        
        // Add to tracking table
        const trackingData = {
          ...returnData,
          dateTimeSubmitted: timestamp,
          status: "Open"
        };
        await push(ref(database, "tracking"), trackingData);
        
        // Update document
        updates[`documents/${doc.id}/status`] = "Open";
        updates[`documents/${doc.id}/remarks`] = remarks;
        updates[`documents/${doc.id}/forwardedTo`] = forwardedTo;
        updates[`documents/${doc.id}/endDate`] = null;
        updates[`documents/${doc.id}/dateTimeSubmitted`] = timestamp;
        
        // Remove from mandays table if exists
        const mandaysQuery = query(
          ref(database, "mandays"),
          orderByChild("awdReferenceNumber"),
          equalTo(doc.awdReferenceNumber)
        );
        
        const mandaysSnapshot = await get(mandaysQuery);
        if (mandaysSnapshot.exists()) {
          mandaysSnapshot.forEach((child: DataSnapshot) => {
            updates[`mandays/${child.key}`] = null;
          });
        }
      }
      
      await update(ref(database), updates);
      
      setRemarks("");
      setForwardedTo("");
      setSelectedRows(new Set());
    } catch (error) {
      console.error("Error returning documents:", error);
    } finally {
      setIsReturning(false);
    }
  };

  const copySelectedToClipboard = () => {
    if (selectedRows.size === 0) return;

    const selectedDocs = documents.filter(doc => selectedRows.has(doc.id));
    
    const rows = selectedDocs.map(doc => [
      doc.awdReferenceNumber,
      doc.originatingOffice,
      doc.subject,
      doc.receivedBy || "Not received yet"
    ].join("\t"));

    const csvContent = rows.join("\n");

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
                <div className="flex flex-col gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex gap-2 items-center">
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
                      disabled={isUpdating || isReturning}
                    >
                      Copy Selected
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedRows(new Set())}
                      disabled={isUpdating || isReturning}
                    >
                      Clear Selection
                    </Button>
                    <span className="text-sm text-gray-600 ml-2">
                      {selectedRows.size} document(s) selected
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Return Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Select value={forwardedTo} onValueChange={setForwardedTo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select forwarded to" />
                          </SelectTrigger>
                          <SelectContent>
                            {FORWARD_TO_OPTIONS.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Textarea
                          placeholder="Enter remarks"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button 
                        onClick={returnDocuments}
                        disabled={!remarks.trim() || !forwardedTo || isReturning}
                      >
                        {isReturning ? "Returning..." : "Return Selected Documents"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="">
                <Table className="border w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead>
                        <Checkbox
                          checked={allRowsSelected}
                          onClick={() => toggleAllRowsSelection()}
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
                          <TableCell onClick={() => toggleRowSelection(doc.id)}>
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