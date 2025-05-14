"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { database, auth } from "@/lib/firebase/firebase";
import { ref, push, get, onValue, update, DataSnapshot } from "firebase/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProtectedRoute from '@/components/protected-route';

// Document interfaces
interface DocumentData {
  id: string;
  awdReferenceNumber: string;
  subject: string;
  status: string;
  workingDays: string;
  dateTimeSubmitted: string;
  startDate?: string;
  forwardedBy?: string;
  forwardedTo?: string;
  forwardedtoname?: string;
  remarks?: string;
}

interface DocuData {
  id: string;
  datetime: string;
  awdrefnu: string;
  subject: string;
  workingDays: string;
  startDate?: string;
  endDate?: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("assign");

  // Assign Track Form State
  const [formData, setFormData] = useState({
    originatingOffice: "",
    subject: "",
    dateOfDocument: "",
    fsisReferenceNumber: "",
    awdReceivedDate: "",
    forwardedBy: "",
    forwardedTo: "",
    forwardedtoname: "",
    remarks: "",
    status: "Open",
    workingDays: "3",
  });
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null);
  const [awdReferenceNumber, setAwdReferenceNumber] = useState("");
  const [isEditingAwd, setIsEditingAwd] = useState(false);

  // Ongoing Documents State
  const [searchOngoing, setSearchOngoing] = useState("");
  const [ongoingDocuments, setOngoingDocuments] = useState<DocumentData[]>([]);
  const [loadingOngoing, setLoadingOngoing] = useState(true);
  const [currentPageOngoing, setCurrentPageOngoing] = useState(1);
  const itemsPerPage = 10;

  // Sent Documents State
  const [searchSent, setSearchSent] = useState("");
  const [sentDocuments, setSentDocuments] = useState<DocuData[]>([]);
  const [currentPageSent, setCurrentPageSent] = useState(1);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchAdminInfo(user.uid);
        await fetchAwdNumber();
        fetchOngoingDocuments();
        fetchSentDocuments();
      } else {
        console.error("User is not logged in.");
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAdminInfo = async (uid: string) => {
    try {
      const userRef = ref(database, `accounts/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const adminData = snapshot.val();
        setAdmin({ name: adminData.name, role: adminData.role || "Admin" });
      } else {
        console.warn("User data not found in 'accounts'.");
      }
    } catch (error) {
      console.error("Error fetching admin info:", error);
    }
  };

  const fetchAwdNumber = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const docsRef = ref(database, "documents");
      const snapshot = await get(docsRef);

      let maxNumber = 0;
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const doc = childSnapshot.val();
          if (doc.awdReferenceNumber) {
            const match = doc.awdReferenceNumber.match(new RegExp(`AWD-${currentYear}-(\\d{4})`));
            if (match) {
              const number = parseInt(match[1], 10);
              if (number > maxNumber) {
                maxNumber = number;
              }
            }
          }
        });
      }

      const newNumber = maxNumber + 1;
      setAwdReferenceNumber(`AWD-${currentYear}-${newNumber.toString().padStart(4, "0")}`);
    } catch (error) {
      console.error("Error fetching AWD number:", error);
    }
  };

  const fetchOngoingDocuments = () => {
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
              startDate: doc.startDate || doc.dateTimeSubmitted || "N/A",
              forwardedBy: doc.forwardedBy,
              forwardedTo: doc.forwardedTo,
              forwardedtoname: doc.forwardedtoname,
              remarks: doc.remarks
            });
          }
        });
        
        const sorted = [...docs].sort((a, b) => {
          const extractNumber = (ref: string) => {
            const match = ref.match(/\d+$/);
            return match ? parseInt(match[0]) : 0;
          };
          return extractNumber(b.awdReferenceNumber) - extractNumber(a.awdReferenceNumber);
        });
        
        setOngoingDocuments(sorted);
        setLoadingOngoing(false);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setLoadingOngoing(false);
      }
    });

    return () => unsubscribe();
  };

  const fetchSentDocuments = () => {
    const dbRef = ref(database, "tracking");
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const seenAwdRefNums = new Set<string>();
        const transformedData: DocuData[] = [];

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
        
        const sorted = transformedData.sort((a, b) => {
          const extractNumber = (ref: string) => {
            const match = ref.match(/\d+$/);
            return match ? parseInt(match[0]) : 0;
          };
          return extractNumber(b.awdrefnu) - extractNumber(a.awdrefnu);
        });
        
        setSentDocuments(sorted);
      } else {
        setSentDocuments([]);
      }
    });

    return () => unsubscribe();
  };

  // Assign Track Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return alert("User not authenticated.");

    const now = new Date();
    const dateTimeSubmitted = now.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).replace(",", "");

    const formattedOriginatingOffice = formData.originatingOffice.toUpperCase();
    const formattedSubject = formData.subject.toUpperCase();

    const calculateDeadline = (startDate: Date, workingDays: number): Date => {
      const deadline = new Date(startDate);
      let daysAdded = 0;

      while (daysAdded < workingDays) {
        deadline.setDate(deadline.getDate() + 1);
        const dayOfWeek = deadline.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysAdded++;
        }
      }
      return deadline;
    };

    const deadline = calculateDeadline(now, parseInt(formData.workingDays, 10));

    try {
      const formattedForwardedBy = `${admin.name} (${admin.role})`;
      const documentData = {
        ...formData,
        originatingOffice: formattedOriginatingOffice,
        subject: formattedSubject,
        dateTimeSubmitted,
        awdReferenceNumber,
        forwardedBy: formattedForwardedBy,
        forwardedtoname: formData.forwardedtoname,
        deadline: deadline.toISOString(),
        startDate: now.toISOString(),
      };

      await push(ref(database, "documents"), documentData);
      await push(ref(database, "tracking"), documentData);

      alert("Document successfully assigned!");
      setFormData({
        originatingOffice: "",
        subject: "",
        dateOfDocument: "",
        fsisReferenceNumber: "",
        awdReceivedDate: "",
        forwardedBy: "",
        forwardedTo: "",
        forwardedtoname: "",
        remarks: "",
        status: "Open",
        workingDays: "3",
      });

      await fetchAwdNumber();
      setActiveTab("ongoing");
    } catch (error) {
      console.error("Error submitting document:", error);
    }
  };

  // Document List Handlers
  const getDeadlineStatus = (startDate: string, workingDaysStr: string, endDate?: string) => {
    if (endDate) return { status: "Closed", color: "gray" };
    if (!startDate || startDate === "N/A" || !workingDaysStr) {
      return { status: "N/A", color: "gray" };
    }

    const totalWorkingDays = parseInt(workingDaysStr) || 0;
    if (totalWorkingDays <= 0) return { status: "No deadline", color: "gray" };

    const parseDate = (dateStr: string) => {
      if (dateStr.includes("/")) {
        const [month, day, year] = dateStr.split("/");
        return new Date(`${year}-${month}-${day}`);
      }
      return new Date(dateStr);
    };

    const start = parseDate(startDate);
    if (isNaN(start.getTime())) return { status: "Invalid date", color: "gray" };

    const calculateDeadline = (fromDate: Date, daysToAdd: number) => {
      const result = new Date(fromDate);
      let addedDays = 0;
      
      while (addedDays < daysToAdd) {
        result.setDate(result.getDate() + 1);
        if (result.getDay() !== 0 && result.getDay() !== 6) {
          addedDays++;
        }
      }
      return result;
    };

    const deadline = calculateDeadline(start, totalWorkingDays);

    const calculateRemainingWorkingDays = (from: Date, to: Date) => {
      const current = new Date(from); 
      current.setDate(current.getDate() + 1);
      let remainingDays = 0;
      
      while (current <= to) {
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          remainingDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      return remainingDays;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(23, 59, 59, 999);

    if (today > deadline) {
      return { status: "Overdue", color: "red" };
    }

    const remainingDays = calculateRemainingWorkingDays(today, deadline);

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

    if (remainingDays === 0) return { status: statusText, color: "red" };
    if (remainingDays <= 3) return { status: statusText, color: "red" };
    if (remainingDays <= 7) return { status: statusText, color: "yellow" };
    return { status: statusText, color: "green" };
  };

  const handleEdit = (id: string) => {
    localStorage.setItem("selectedAwdRefNum", id);
    router.push("/admin/Documents/editaction");
  };

  const handleDelete = async (id: string, type: 'ongoing' | 'sent') => {
    if (!confirm(`Delete document?`)) return;
    
    try {
      if (type === 'ongoing') {
        await update(ref(database, `documents/${id}`), { status: "Deleted" });
      } else {
        const [documentsSnapshot, trackingSnapshot, returnedSnapshot] = await Promise.all([
          get(ref(database, "documents")),
          get(ref(database, "tracking")),
          get(ref(database, "returned"))
        ]);

        const updates = {
          ...getUpdates(documentsSnapshot, "documents", id),
          ...getUpdates(trackingSnapshot, "tracking", id),
          ...getUpdates(returnedSnapshot, "returned", id)
        };

        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }
      }
      alert("Document deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document.");
    }
  };

  const getUpdates = (snapshot: DataSnapshot, tableName: string, awdrefnu: string) => {
    const updates: Record<string, null> = {};
    snapshot.forEach((childSnapshot: DataSnapshot) => {
      const doc = childSnapshot.val();
      if (doc.awdReferenceNumber === awdrefnu) {
        updates[`${tableName}/${childSnapshot.key}`] = null;
      }
    });
    return updates;
  };

  const handleRowClick = (awdrefnu: string) => {
    if (!awdrefnu || awdrefnu === "N/A") return;
    localStorage.setItem("selectedAwdRefNum", awdrefnu);
    router.push(`/admin/Documents/subjectinformation`);
  };

  // Pagination functions
  const paginateOngoing = (pageNumber: number) => setCurrentPageOngoing(pageNumber);
  const paginateSent = (pageNumber: number) => setCurrentPageSent(pageNumber);

  // Filter and paginate documents
  const filteredOngoing = ongoingDocuments.filter(doc => 
    doc.subject.toLowerCase().includes(searchOngoing.toLowerCase()) ||
    doc.awdReferenceNumber.toLowerCase().includes(searchOngoing.toLowerCase())
  );

  const filteredSent = sentDocuments.filter(doc => 
    doc.subject.toLowerCase().includes(searchSent.toLowerCase()) ||
    doc.awdrefnu.toLowerCase().includes(searchSent.toLowerCase())
  );

  // Calculate pagination
  const indexOfLastOngoing = currentPageOngoing * itemsPerPage;
  const indexOfFirstOngoing = indexOfLastOngoing - itemsPerPage;
  const currentOngoingItems = filteredOngoing.slice(indexOfFirstOngoing, indexOfLastOngoing);
  const totalPagesOngoing = Math.ceil(filteredOngoing.length / itemsPerPage);

  const indexOfLastSent = currentPageSent * itemsPerPage;
  const indexOfFirstSent = indexOfLastSent - itemsPerPage;
  const currentSentItems = filteredSent.slice(indexOfFirstSent, indexOfLastSent);
  const totalPagesSent = Math.ceil(filteredSent.length / itemsPerPage);

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
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-12">
                  <TabsTrigger value="assign" className="text-lg">Assign Track</TabsTrigger>
                  <TabsTrigger value="ongoing" className="text-lg">Ongoing Documents</TabsTrigger>
                  <TabsTrigger value="sent" className="text-lg">Sent Documents</TabsTrigger>
                </TabsList>

                {/* Assign Track Tab */}
                <TabsContent value="assign">
                  <form className="p-4" onSubmit={handleSubmit}>
                    <h1 className="text-4xl font-bold mb-6">Assign Track</h1>
                    
                    <div className="mb-6">
                      <label className="block text-xl font-semibold pb-2">AWD Reference Number</label>
                      <div className="flex items-center gap-4">
                        {isEditingAwd ? (
                          <Input
                            name="awdReferenceNumber"
                            type="text"
                            className="w-[500px] h-[50px]"
                            value={awdReferenceNumber}
                            onChange={(e) => setAwdReferenceNumber(e.target.value)}
                          />
                        ) : (
                          <div className="w-[500px] h-[50px] border rounded-md flex items-center px-4 bg-gray-100">
                            <span className="text-lg font-medium">{awdReferenceNumber || "Generating..."}</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditingAwd(!isEditingAwd)}
                          className="h-[50px]"
                        >
                          {isEditingAwd ? "Save" : "Edit"}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {isEditingAwd
                          ? "You can now edit the AWD Reference Number."
                          : "This will be automatically assigned to the document."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className="block text-xl font-semibold pb-2">Originating Office</label>
                        <Input name="originatingOffice" type="text" className="w-full h-[50px]" onChange={handleChange} required />
                      </div>

                      <div>
                        <label className="block text-xl font-semibold pb-2">Subject</label>
                        <Input name="subject" type="text" className="w-full h-[50px]" onChange={handleChange} required />
                      </div>

                      <div>
                        <label className="block text-xl font-semibold pb-2">Date of Document</label>
                        <Input name="dateOfDocument" type="date" className="w-full h-[50px]" onChange={handleChange} required />
                      </div>

                      <div>
                        <label className="block text-xl font-semibold pb-2">FSIS Reference Number</label>
                        <Input name="fsisReferenceNumber" type="text" className="w-full h-[50px]" onChange={handleChange} />
                      </div>

                      <div>
                        <label className="block text-xl font-semibold pb-2">AWD Received Date</label>
                        <Input name="awdReceivedDate" type="date" className="w-full h-[50px]" onChange={handleChange} required />
                      </div>

                      <div>
                        <label className="block text-lg font-semibold pb-2">Forwarded To</label>
                        <Input name="forwardedtoname" type="text" className="w-full h-[50px]" onChange={handleChange}  />
                        <Select onValueChange={(value) => setFormData({ ...formData, forwardedTo: value })} required>
                          <SelectTrigger className="w-full h-12">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="CATCID Admin">CATCID Admin</SelectItem>
                              <SelectItem value="GACID Admin">GACID Admin</SelectItem>
                              <SelectItem value="MOOCSU Admin">MOOCSU Admin</SelectItem>
                              <SelectItem value="EARD Admin">EARD Admin</SelectItem>
                              <SelectItem value="Secretary">Secretary</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-xl font-semibold pb-2">Remarks</label>
                        <Input name="remarks" type="text" className="w-full h-[50px]" onChange={handleChange} />
                      </div>
                      
                      <div>
                        <label className="block text-xl font-semibold pb-2">Working Days</label>
                        <Select 
                          value={formData.workingDays}
                          onValueChange={(value) => setFormData({ ...formData, workingDays: value })}
                        >
                          <SelectTrigger className="w-full h-[50px]">
                            <SelectValue placeholder="Select working days" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="3">3 Days</SelectItem>
                              <SelectItem value="7">7 Days</SelectItem>
                              <SelectItem value="20">20 Days</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-10">
                      <Button type="submit" className="w-40 h-20 text-[20px] font-bold">Create Track</Button>
                    </div>
                  </form>
                </TabsContent>

                {/* Ongoing Documents Tab */}
                <TabsContent value="ongoing">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-4xl font-bold">Ongoing Documents</h1>
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={searchOngoing}
                        onChange={(e) => {
                          setSearchOngoing(e.target.value);
                          setCurrentPageOngoing(1);
                        }}
                        className="w-64 border p-2 rounded"
                      />
                    </div>

                    {loadingOngoing ? (
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
                              {currentOngoingItems.length > 0 ? (
                                currentOngoingItems.map((doc) => {
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
                                            <DropdownMenuItem onClick={() => handleDelete(doc.id, 'ongoing')}>
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
                                    {ongoingDocuments.length === 0
                                      ? "No ongoing documents found."
                                      : "No results match your search."}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {filteredOngoing.length > 0 && (
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-600">
                              Showing {indexOfFirstOngoing + 1} to {Math.min(indexOfLastOngoing, filteredOngoing.length)} of {filteredOngoing.length} entries
                            </div>
                            <div className="flex gap-2 flex-wrap justify-center">
                              <Button
                                onClick={() => paginateOngoing(currentPageOngoing - 1)}
                                disabled={currentPageOngoing === 1}
                                variant="outline"
                                size="sm"
                              >
                                Previous
                              </Button>
                              {Array.from({ length: Math.min(5, totalPagesOngoing) }, (_, i) => {
                                let pageNum;
                                if (totalPagesOngoing <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPageOngoing <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPageOngoing >= totalPagesOngoing - 2) {
                                  pageNum = totalPagesOngoing - 4 + i;
                                } else {
                                  pageNum = currentPageOngoing - 2 + i;
                                }
                                return (
                                  <Button
                                    key={pageNum}
                                    onClick={() => paginateOngoing(pageNum)}
                                    variant={currentPageOngoing === pageNum ? "default" : "outline"}
                                    size="sm"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                              <Button
                                onClick={() => paginateOngoing(currentPageOngoing + 1)}
                                disabled={currentPageOngoing === totalPagesOngoing}
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
                </TabsContent>

                {/* Sent Documents Tab */}
                <TabsContent value="sent">
                  <div className="p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <h1 className="text-4xl font-bold">Sent Documents</h1>
                      <Input
                        type="text"
                        placeholder="Search documents..."
                        value={searchSent}
                        onChange={(e) => {
                          setSearchSent(e.target.value);
                          setCurrentPageSent(1);
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
                          {currentSentItems.length ? (
                            currentSentItems.map((doc) => {
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
                                        <DropdownMenuItem onClick={() => handleDelete(doc.awdrefnu, 'sent')}>
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
                                {sentDocuments.length ? "No matching documents" : "No sent documents"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {filteredSent.length > 0 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-600">
                          Showing {indexOfFirstSent + 1} to {Math.min(indexOfLastSent, filteredSent.length)} of {filteredSent.length} entries
                        </div>
                        <div className="flex gap-2 flex-wrap justify-center">
                          <Button
                            onClick={() => paginateSent(currentPageSent - 1)}
                            disabled={currentPageSent === 1}
                            variant="outline"
                            size="sm"
                          >
                            Previous
                          </Button>
                          {Array.from({ length: Math.min(5, totalPagesSent) }, (_, i) => {
                            let pageNum;
                            if (totalPagesSent <= 5) {
                              pageNum = i + 1;
                            } else if (currentPageSent <= 3) {
                              pageNum = i + 1;
                            } else if (currentPageSent >= totalPagesSent - 2) {
                              pageNum = totalPagesSent - 4 + i;
                            } else {
                              pageNum = currentPageSent - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                onClick={() => paginateSent(pageNum)}
                                variant={currentPageSent === pageNum ? "default" : "outline"}
                                size="sm"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          <Button
                            onClick={() => paginateSent(currentPageSent + 1)}
                            disabled={currentPageSent === totalPagesSent}
                            variant="outline"
                            size="sm"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}