"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, database } from "@/lib/firebase/firebase"; // Import Firebase instance
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
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

export default function CreateAcc() {
  const router = useRouter();
  // State for form inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [division, setDivision] = useState("");

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = `${firstName} ${lastName}`; // Combine names

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user details in Firebase Realtime Database
      await set(ref(database, "accounts/" + user.uid), {
        name,
        email,
        division,
        password,
      });

      alert("Account created successfully!");
      router.push("/admin/Accounts/manageacc");
    } catch (error) {
  if (error instanceof Error) {
    console.error(error);
    alert("Error creating account: " + error.message);
  } else {
    console.error("An unknown error occurred", error);
    alert("An unknown error occurred.");
  }
}

  };

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
                  <BreadcrumbPage>Create Account</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex">
            <form onSubmit={handleSubmit}>
              <div className="p-44">
                <h1 className="text-6xl font-bold mb-6">Create Account</h1>

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
                  <Select onValueChange={(value) => setDivision(value)} required>
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

                <div className="mt-6">
                  <Button type="submit" className="w-40 h-20 text-[20px] font-bold">
                    Create Account
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
