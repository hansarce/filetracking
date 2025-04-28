"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update, push, get } from "firebase/database";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectLabel, SelectItem, SelectGroup } from "@/components/ui/select";
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
  startDate?: string;
};

export default function PendingDocs() {
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocData | null>(null);
  const [assignedInspector, setAssignedInspector] = useState("");

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
            if (doc.forwardedTo === "Admin" && doc.status === "Open") {
              fetchedDocs.push({ 
                id: childSnapshot.key, 
                awdReceivedDate: doc.awdReceivedDate || "",
                awdReferenceNumber: doc.awdReferenceNumber || "",
                subject: doc.subject || "",
                dateOfDocument: doc.dateOfDocument || "",
                deadline: doc.deadline || "",
                fsisReferenceNumber: doc.fsisReferenceNumber || "",
                originatingOffice: doc.originatingOffice || "",
                forwardedBy: doc.forwardedBy || "",
                forwardedTo: doc.forwardedTo || "",
                remarks: doc.remarks || "",
                status: doc.status || "Open",
                workingDays: doc.workingDays || "",
                assignedInspector: doc.assignedInspector || "",
                dateTimeSubmitted: doc.dateTimeSubmitted || new Date().toISOString(),
                endDate: doc.endDate || "",
                startDate: doc.startDate || doc.dateTimeSubmitted || new Date().toISOString()
              });
            }
          });

          // Sort documents by AWD reference number in descending order
          const sorted = [...fetchedDocs].sort((a, b) => {
            const getNumericPart = (ref: string) => {
              const match = ref.match(/\d+$/);
              return match ? parseInt(match[0], 10) : 0;
            };
            
            const aNum = getNumericPart(a.awdReferenceNumber);
            const bNum = getNumericPart(b.awdReferenceNumber);
            
            if (aNum !== bNum) {
              return bNum - aNum;
            }
            return b.awdReferenceNumber.localeCompare(a.awdReferenceNumber);
          });

          setDocuments(sorted);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error("Error processing documents:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Calculate pagination
  const filteredDocuments = documents.filter(doc => {
    const searchTerm = search.toLowerCase();
    return (
      doc.subject.toLowerCase().includes(searchTerm) ||
      doc.awdReferenceNumber.toLowerCase().includes(searchTerm) ||
      (doc.forwardedBy && doc.forwardedBy.toLowerCase().includes(searchTerm)) ||
      (doc.remarks && doc.remarks.toLowerCase().includes(searchTerm))
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const calculateWorkingDays = (startDate: string, endDate: Date): number => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      let count = 0;
      const current = new Date(start);
      
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      
      return count;
    } catch (error) {
      console.error("Error calculating working days:", error);
      return 0;
    }
  };

  const handleForwardForRelease = async () => {
    if (!selectedDoc || !assignedInspector) return;

    try {
      const userUID = localStorage.getItem("authToken");
      if (!userUID) {
        alert("User not authenticated.");
        return;
      }

      const userRef = ref(database, `accounts/${userUID}`);
      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) {
        alert("User details not found in the database.");
        return;
      }

      const now = new Date();
      const dateTimeSubmitted = now.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const formattedEndDate = now.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });

      const startDateToUse = selectedDoc.startDate || selectedDoc.dateTimeSubmitted;
      const calculatedWorkingDays = calculateWorkingDays(startDateToUse, now);

      const docRef = ref(database, `documents/${selectedDoc.id}`);
      await update(docRef, {
        assignedInspector,
        status: "Closed",
        remarks: "For Release",
        forwardedBy: selectedDoc.forwardedTo,
        forwardedTo: "Admin",
        endDate: formattedEndDate,
        workingDays: calculatedWorkingDays.toString(),
        startDate: startDateToUse,
      });

      const trackingRef = ref(database, "tracking");
      await push(trackingRef, {
        id: selectedDoc.id,
        awdReceivedDate: selectedDoc.awdReceivedDate,
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        subject: selectedDoc.subject,
        dateOfDocument: selectedDoc.dateOfDocument,
        deadline: selectedDoc.deadline,
        fsisReferenceNumber: selectedDoc.fsisReferenceNumber,
        originatingOffice: selectedDoc.originatingOffice,
        forwardedBy: selectedDoc.forwardedTo,
        forwardedTo: "Admin",
        remarks: "For Release",
        status: "Closed",
        workingDays: calculatedWorkingDays.toString(),
        assignedInspector,
        dateTimeSubmitted,
        endDate: formattedEndDate,
        startDate: startDateToUse,
      });

      const mandaysRef = ref(database, "mandays");
      await push(mandaysRef, {
        awdReferenceNumber: selectedDoc.awdReferenceNumber,
        originalWorkingDays: selectedDoc.workingDays,
        actualWorkingDays: calculatedWorkingDays,
        inspectorName: assignedInspector,
        startDate: startDateToUse,
        endDate: formattedEndDate,
        dateRecorded: now.toISOString(),
      });

      setSelectedDoc(null);
      setAssignedInspector("");
      alert("Document successfully forwarded for release!");
    } catch (error) {
      console.error("Error processing document:", error);
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
                    <BreadcrumbPage>Pending Documents</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6 w-full overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl md:text-4xl font-bold">Pending Documents</h1>
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full md:w-64 border p-2 rounded"
                />
              </div>

              {/* Document Table */}
              <div className="overflow-x-auto w-full">
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
                    {currentItems.map((doc) => (
                      <TableRow
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <TableCell className="whitespace-nowrap">{doc.awdReceivedDate}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.awdReferenceNumber}</TableCell>
                        <TableCell className="min-w-[200px]">{doc.subject}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.forwardedBy}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.forwardedTo}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDocuments.length)} of {filteredDocuments.length} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <Button
                      key={number}
                      onClick={() => paginate(number)}
                      variant={currentPage === number ? "default" : "outline"}
                    >
                      {number}
                    </Button>
                  ))}
                  <Button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Document Details and Actions */}
              {selectedDoc && (
                <div className="mt-6 p-6 border rounded-lg shadow-lg bg-white w-full max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Document Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-semibold">AWD No.:</p>
                      <p>{selectedDoc.awdReferenceNumber}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Date Received:</p>
                      <p>{selectedDoc.awdReceivedDate}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Subject:</p>
                      <p>{selectedDoc.subject}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Date of Document:</p>
                      <p>{selectedDoc.dateOfDocument}</p>
                    </div>
                    <div>
                      <p className="font-semibold">FSIS Reference No.:</p>
                      <p>{selectedDoc.fsisReferenceNumber}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Originating Office:</p>
                      <p>{selectedDoc.originatingOffice}</p>
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
                      <p className="font-semibold">Deadline:</p>
                      <p>{selectedDoc.deadline}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Working Days:</p>
                      <p>{selectedDoc.workingDays}</p>
                    </div>
                  </div>

                  {/* Assign Inspector */}
                  <div className="mt-4">
                    <label className="block text-lg font-semibold mb-2">Assign Inspector:</label>
                    <Select onValueChange={(value) => setAssignedInspector(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an inspector" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px] overflow-y-auto">
                        {/* Group A */}
                        <SelectGroup>
                          <SelectLabel>A</SelectLabel>
                          <SelectItem value="ALCANTARA, JENNY T.">ALCANTARA, JENNY T.</SelectItem>
                          <SelectItem value="ALFORQUE, RICHIE E.">ALFORQUE, RICHIE E.</SelectItem>
                          <SelectItem value="ALVAREZ, FERNANDO R.">ALVAREZ, FERNANDO R.</SelectItem>
                          <SelectItem value="ANG, ALEXIS F.">ANG, ALEXIS F.</SelectItem>
                          <SelectItem value="APAO, AYMER M.">APAO, AYMER M.</SelectItem>
                          <SelectItem value="ARMENIO, JUDY O.">ARMENIO, JUDY O.</SelectItem>
                        </SelectGroup>

                        {/* Group B */}
                        <SelectGroup>
                          <SelectLabel>B</SelectLabel>
                          <SelectItem value="BAGASBAS, JOURVIE A.">BAGASBAS, JOURVIE A.</SelectItem>
                          <SelectItem value="BANTING, RHAMCEL CYRUS DC">BANTING, RHAMCEL CYRUS DC</SelectItem>
                          <SelectItem value="BATHAN, RODA C.">BATHAN, RODA C.</SelectItem>
                          <SelectItem value="BOCALBOS, EDGARDO S">BOCALBOS, EDGARDO S</SelectItem>
                          <SelectItem value="BRIONES, RODERICK D.">BRIONES, RODERICK D.</SelectItem>
                          <SelectItem value="BUIT, SAHARA THERESA H.">BUIT, SAHARA THERESA H.</SelectItem>
                          <SelectItem value="BUYA, BENEDICTO JOSE J.">BUYA, BENEDICTO JOSE J.</SelectItem>
                        </SelectGroup>

                        {/* Group C */}
                        <SelectGroup>
                          <SelectLabel>C</SelectLabel>
                          <SelectItem value="CAALIM, MARION KRISTIAN G.">CAALIM, MARION KRISTIAN G.</SelectItem>
                          <SelectItem value="COMIA, WILFREDO B.">COMIA, WILFREDO B.</SelectItem>
                          <SelectItem value="CRUZ, ROGELIO GINO S.">CRUZ, ROGELIO GINO S.</SelectItem>
                          <SelectItem value="CUMIGAD, JOHN C. JR.">CUMIGAD, JOHN C. JR.</SelectItem>
                          <SelectItem value="CUSI, LUCAS A. JR.">CUSI, LUCAS A. JR.</SelectItem>
                        </SelectGroup>

                        {/* Group D */}
                        <SelectGroup>
                          <SelectLabel>D</SelectLabel>
                          <SelectItem value="DADIS, YASMIN S.">DADIS, YASMIN S.</SelectItem>
                          <SelectItem value="DALISAY, HERNAN I">DALISAY, HERNAN I</SelectItem>
                          <SelectItem value="DE ARCA, REY ANTHONY D">DE ARCA, REY ANTHONY D</SelectItem>
                          <SelectItem value="DE GUZMAN, GILBERT B.">DE GUZMAN, GILBERT B.</SelectItem>
                          <SelectItem value="DELIMA, JORGE A.">DELIMA, JORGE A.</SelectItem>
                          <SelectItem value="DORADO, ROGER R.">DORADO, ROGER R.</SelectItem>
                        </SelectGroup>

                        {/* Group E */}
                        <SelectGroup>
                          <SelectLabel>E</SelectLabel>
                          <SelectItem value="ENGR. ECHAVEZ, IAN W.">ENGR. ECHAVEZ, IAN W.</SelectItem>
                          <SelectItem value="ENGR. LEONARD M. VILLAR">ENGR. LEONARD M. VILLAR</SelectItem>
                          <SelectItem value="ESTELLERO, RAMON R.">ESTELLERO, RAMON R.</SelectItem>
                          <SelectItem value="EVANGELISTA, SERLIND">EVANGELISTA, SERLIND</SelectItem>
                        </SelectGroup>

                        {/* Group F */}
                        <SelectGroup>
                          <SelectLabel>F</SelectLabel>
                          <SelectItem value="FLORES, ALFIN G.">FLORES, ALFIN G.</SelectItem>
                        </SelectGroup>

                        {/* Group G */}
                        <SelectGroup>
                          <SelectLabel>G</SelectLabel>
                          <SelectItem value="GARCIA, ALLAN G.">GARCIA, ALLAN G.</SelectItem>
                        </SelectGroup>

                        {/* Group I */}
                        <SelectGroup>
                          <SelectLabel>I</SelectLabel>
                          <SelectItem value="IBAÑEZ, DENNISE LEAH BRENDA T.">IBAÑEZ, DENNISE LEAH BRENDA T.</SelectItem>
                        </SelectGroup>

                        {/* Group J */}
                        <SelectGroup>
                          <SelectLabel>J</SelectLabel>
                          <SelectItem value="JARMIN, FELIX T">JARMIN, FELIX T</SelectItem>
                          <SelectItem value="JIMENEZ, CESAR S. JR.">JIMENEZ, CESAR S. JR.</SelectItem>
                          <SelectItem value="JOHN MICHAEL REY">JOHN MICHAEL REY</SelectItem>
                        </SelectGroup>

                        {/* Group L */}
                        <SelectGroup>
                          <SelectLabel>L</SelectLabel>
                          <SelectItem value="LAIG, RAPHAEL D.">LAIG, RAPHAEL D.</SelectItem>
                          <SelectItem value="LASMARIAS, CARLOS F. JR.">LASMARIAS, CARLOS F. JR.</SelectItem>
                        </SelectGroup>

                        {/* Group M */}
                        <SelectGroup>
                          <SelectLabel>M</SelectLabel>
                          <SelectItem value="MALVEDA, MARY GRACE D.">MALVEDA, MARY GRACE D.</SelectItem>
                          <SelectItem value="MANUEL, MICHAEL">MANUEL, MICHAEL</SelectItem>
                        </SelectGroup>

                        {/* Group N */}
                        <SelectGroup>
                          <SelectLabel>N</SelectLabel>
                          <SelectItem value="NARA, ALIMBEN P.">NARA, ALIMBEN P.</SelectItem>
                          <SelectItem value="NICDAO, LINO L.">NICDAO, LINO L.</SelectItem>
                        </SelectGroup>

                        {/* Group P */}
                        <SelectGroup>
                          <SelectLabel>P</SelectLabel>
                          <SelectItem value="PAGTULIGAN, ANDRES P.">PAGTULIGAN, ANDRES P.</SelectItem>
                        </SelectGroup>

                        {/* Group R */}
                        <SelectGroup>
                          <SelectLabel>R</SelectLabel>
                          <SelectItem value="RADA, JUVI ELVA MAYE B">RADA, JUVI ELVA MAYE B</SelectItem>
                          <SelectItem value="RAMIEZ, RONALD JOHN M.">RAMIEZ, RONALD JOHN M.</SelectItem>
                          <SelectItem value="RODA, ALDINO G.">RODA, ALDINO G.</SelectItem>
                        </SelectGroup>

                        {/* Group S */}
                        <SelectGroup>
                          <SelectLabel>S</SelectLabel>
                          <SelectItem value="SANDOVAL, DENNIS MORREL M.">SANDOVAL, DENNIS MORREL M.</SelectItem>
                        </SelectGroup>

                        {/* Group T */}
                        <SelectGroup>
                          <SelectLabel>T</SelectLabel>
                          <SelectItem value="TUMANUT, ALDEN">TUMANUT, ALDEN</SelectItem>
                        </SelectGroup>

                        {/* Group V */}
                        <SelectGroup>
                          <SelectLabel>V</SelectLabel>
                          <SelectItem value="VILLAVIEJA, ADOLFO JR.">VILLAVIEJA, ADOLFO JR.</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    onClick={handleForwardForRelease} 
                    disabled={!assignedInspector}
                  >
                    Forward for Release
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