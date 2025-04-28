"use client";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { database, auth } from "@/lib/firebase/firebase";
import { ref, get, update } from "firebase/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import ProtectedRoute from '@/components/protected-route';

export default function EditInformation() {
  const [formData, setFormData] = useState({
    originatingOffice: "",
    subject: "",
    dateOfDocument: "",
    fsisReferenceNumber: "",
    awdReceivedDate: "",
    forwardedBy: "",
    forwardedTo: "",
    remarks: "",
    status: "Open",
    workingDays: "3",
  });
  const params = useParams();
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminInfo = useCallback(async (uid: string) => {
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
  }, []);

  const fetchDocumentData = useCallback(async (id: string) => {
    try {
      const docRef = ref(database, `documents/${id}`);
      const snapshot = await get(docRef);

      if (snapshot.exists()) {
        const docData = snapshot.val();
        setFormData({
          originatingOffice: docData.originatingOffice || "",
          subject: docData.subject || "",
          dateOfDocument: docData.dateOfDocument || "",
          fsisReferenceNumber: docData.fsisReferenceNumber || "",
          awdReceivedDate: docData.awdReceivedDate || "",
          forwardedBy: docData.forwardedBy || "",
          forwardedTo: docData.forwardedTo || "",
          remarks: docData.remarks || "",
          status: docData.status || "Open",
          workingDays: docData.workingDays || "3",
        });
      } else {
        const trackRef = ref(database, `tracking/${id}`);
        const trackSnapshot = await get(trackRef);

        if (trackSnapshot.exists()) {
          const trackData = trackSnapshot.val();
          setFormData({
            originatingOffice: trackData.originatingOffice || "",
            subject: trackData.subject || "",
            dateOfDocument: trackData.dateOfDocument || "",
            fsisReferenceNumber: trackData.fsisReferenceNumber || "",
            awdReceivedDate: trackData.awdReceivedDate || "",
            forwardedBy: trackData.forwardedBy || "",
            forwardedTo: trackData.forwardedTo || "",
            remarks: trackData.remarks || "",
            status: trackData.status || "Open",
            workingDays: trackData.workingDays || "3",
          });
        } else {
          console.warn("Document not found in either location.");
          alert("Document not found. Redirecting back to sent documents.");
          router.push("/admin/Documents/sentdocs");
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching document data:", error);
      alert("Error loading document data. Please try again.");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const storedAwdRef = localStorage.getItem("selectedAwdRefNum");
    const routeParams = params as { awdrefnu?: string };
    const awdrefnuFromRoute = routeParams.awdrefnu;
    
    let awdrefnuFromSearch = null;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      awdrefnuFromSearch = searchParams.get("awdrefnu");
    }
    
    const finalAwdRefnu = awdrefnuFromRoute || awdrefnuFromSearch;
    
    if (finalAwdRefnu) {
      setDocumentId(finalAwdRefnu);
    } else {
      if (storedAwdRef) {
        setDocumentId(storedAwdRef);
      }
    }
  }, [params]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchAdminInfo(user.uid);
        
        if (documentId) {
          console.log("Fetching data for:", documentId);
          await fetchDocumentData(documentId);
        } else {
          console.warn("No AWD reference number found");
          setLoading(false);
        }
      } else {
        router.push("/login");
      }
    });
    
    return () => unsubscribe();
  }, [documentId, router, fetchAdminInfo, fetchDocumentData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin || !documentId) {
      alert("User not authenticated or document ID missing.");
      return;
    }

    const formattedOriginatingOffice = formData.originatingOffice.toUpperCase();
    const formattedSubject = formData.subject.toUpperCase();

    try {
      const updatedData = {
        ...formData,
        originatingOffice: formattedOriginatingOffice,
        subject: formattedSubject,
        awdReferenceNumber: documentId,
      };

      await update(ref(database, `documents/${documentId}`), updatedData);
      await update(ref(database, `tracking/${documentId}`), updatedData);

      alert("Document successfully updated!");
      router.push("/admin/Documents/sentdocs");
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Failed to update document. Please try again.");
    }
  };

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
                  <BreadcrumbPage>Edit Document</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xl">Loading document data...</p>
            </div>
          ) : (
            <form className="p-10" onSubmit={handleSubmit}>
              <h1 className="text-6xl font-bold mb-6">Edit Document</h1>
              {documentId && (
                <div className="mb-6">
                  <p className="text-lg font-semibold">AWD Reference Number: {documentId}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-xl font-semibold pb-2">Originating Office</label>
                  <Input
                    name="originatingOffice"
                    type="text"
                    className="w-full h-[50px]"
                    value={formData.originatingOffice}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">Subject</label>
                  <Input
                    name="subject"
                    type="text"
                    className="w-full h-[50px]"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">Date of Document</label>
                  <Input
                    name="dateOfDocument"
                    type="date"
                    className="w-full h-[50px]"
                    value={formData.dateOfDocument}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">FSIS Reference Number</label>
                  <Input
                    name="fsisReferenceNumber"
                    type="text"
                    className="w-full h-[50px]"
                    value={formData.fsisReferenceNumber}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">AWD Received Date</label>
                  <Input
                    name="awdReceivedDate"
                    type="date"
                    className="w-full h-[50px]"
                    value={formData.awdReceivedDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold pb-2">Forwarded To</label>
                  <Select
                    value={formData.forwardedTo}
                    onValueChange={(value) => setFormData({ ...formData, forwardedTo: value })}
                    required
                  >
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
                  <Input
                    name="remarks"
                    type="text"
                    className="w-full h-[50px]"
                    value={formData.remarks}
                    onChange={handleChange}
                  />
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

              <div className="mt-10 flex gap-4">
                <Button type="submit" className="w-40 h-20 text-[20px] font-bold">Update Document</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-40 h-20 text-[20px] font-bold"
                  onClick={() => router.push("/admin/Documents/sentdocs")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
    </ProtectedRoute>
  );
}