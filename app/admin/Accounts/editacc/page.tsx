"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, onValue, update } from "firebase/database";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProtectedRoute from '@/components/protected-route';

export default function EditAccount() {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string | null>(null);
  
  // State for form inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [division, setDivision] = useState("");
  const [loading, setLoading] = useState(true);

  // Get account ID from localStorage
  useEffect(() => {
    const id = localStorage.getItem('currentAccountId');
    if (!id) {
      router.push("/admin/Accounts/manageacc");
      return;
    }
    setAccountId(id);
  }, [router]);

  // Fetch account data
  useEffect(() => {
    if (!accountId) return;

    const accountRef = ref(database, `accounts/${accountId}`);
    const unsubscribe = onValue(accountRef, (snapshot) => {
      const accountData = snapshot.val();
      if (accountData) {
        // Split name into first and last
        const nameParts = accountData.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        setEmail(accountData.email || "");
        setPassword(accountData.password || "");
        setDivision(accountData.division || "");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [accountId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    
    const name = `${firstName} ${lastName}`; // Combine names

    try {
      // Update user details in Firebase Realtime Database
      await update(ref(database, "accounts/" + accountId), {
        name,
        email,
        division,
        password,
      });

      alert("Account updated successfully!");
      router.push("/admin/Accounts/manageacc");
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
        alert("Error updating account: " + error.message);
      } else {
        console.error("An unknown error occurred", error);
        alert("An unknown error occurred.");
      }
    }
  };

  if (loading || !accountId) {
    return (
      <ProtectedRoute allowedDivisions={['admin']}>
        <SidebarProvider>
          <div className="flex h-screen">
            <AppSidebar />
            <SidebarInset className="flex flex-1 flex-col">
              <div className="p-44">
                <h1 className="text-6xl font-bold mb-6">Loading Account...</h1>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </ProtectedRoute>
    );
  }
  return (
    <ProtectedRoute allowedDivisions={['admin']}>
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbPage>Account</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Edit Account</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="flex">
              <form onSubmit={handleSubmit}>
                <div className="p-44">
                  <h1 className="text-6xl font-bold mb-6">Edit Account</h1>

                  <div className="grid gap-6 grid-cols-2">
                    <div>
                      <label className="block text-3xl font-semibold pb-5">First Name</label>
                      <Input
                        type="text"
                        className="w-full h-[50px]"
                        placeholder="Juan"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-3xl font-semibold pb-5">Last Name</label>
                      <Input
                        type="text"
                        placeholder="Dela Cruz"
                        className="w-full h-[50px]"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-3xl font-semibold pb-5">Email</label>
                      <Input
                        type="email"
                        placeholder="juandelacruz@gmail.com"
                        className="w-[500px] h-[50px]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-3xl font-semibold pb-5">Password</label>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        className="w-[500px] h-[50px]"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-3xl font-semibold pb-5">Division</label>
                    <Select onValueChange={(value) => setDivision(value)} value={division} required>
                      <SelectTrigger className="w-[500px] h-[50px]">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Division</SelectLabel>
                          <SelectItem value="CATCID">CATCID</SelectItem>
                          <SelectItem value="GACID">GACID</SelectItem>
                          <SelectItem value="MOOCSU">MOOCSU</SelectItem>
                          <SelectItem value="EARD">EARD</SelectItem>
                          <SelectItem value="Secretary">Secretary</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-6 space-x-4">
                    <Button type="submit" className="w-40 h-20 text-[20px] font-bold">
                      Update Account
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-40 h-20 text-[20px] font-bold"
                      onClick={() => router.push("/admin/Accounts/manageacc")}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}