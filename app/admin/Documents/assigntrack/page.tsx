"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { database, auth } from "@/lib/firebase/firebase";
import { ref, push, get } from "firebase/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import ProtectedRoute from '@/components/protected-route';

export default function AssignTrack() {
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

  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null);
  const [awdReferenceNumber, setAwdReferenceNumber] = useState("");
  const [isEditingAwd, setIsEditingAwd] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchAdminInfo(user.uid);
        await fetchAwdNumber();
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
      router.push("/admin/Documents/sentdocs");
    } catch (error) {
      console.error("Error submitting document:", error);
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
                    <BreadcrumbPage>Assign Track</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <form className="p-10" onSubmit={handleSubmit}>
              <h1 className="text-6xl font-bold mb-6">Assign Track</h1>
              
              {/* Display the AWD Reference Number */}
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
                  <Input name="originatingOffice" type="text" className="w-[500px] h-[50px]" onChange={handleChange} required />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">Subject</label>
                  <Input name="subject" type="text" className="w-[500px] h-[50px]" onChange={handleChange} required />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">Date of Document</label>
                  <Input name="dateOfDocument" type="date" className="w-[500px] h-[50px]" onChange={handleChange} required />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">FSIS Reference Number</label>
                  <Input name="fsisReferenceNumber" type="text" className="w-[500px] h-[50px]" onChange={handleChange} />
                </div>

                <div>
                  <label className="block text-xl font-semibold pb-2">AWD Received Date</label>
                  <Input name="awdReceivedDate" type="date" className="w-[500px] h-[50px]" onChange={handleChange} required />
                </div>

                <div>
                  <label className="block text-lg font-semibold pb-2">Forwarded To</label>
                   <Input name="forwardedtoname" type="text" className="w-[500px]  h-[50px]" onChange={handleChange}  />
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
                  <Input name="remarks" type="text" className="w-[500px] h-[50px]" onChange={handleChange} />
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
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}