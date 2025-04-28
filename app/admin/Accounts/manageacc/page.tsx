"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, database } from "@/lib/firebase/firebase";
import { ref, onValue, remove } from "firebase/database";
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from '@/components/protected-route';

interface Account {
  id: string;
  name: string;
  email: string;
  division: string;
  password: string;
}

export default function ManageAccounts() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const accountsPerPage = 10;

  useEffect(() => {
    const accountsRef = ref(database, "accounts");
    const unsubscribe = onValue(accountsRef, (snapshot) => {
      const accountsData = snapshot.val();
      const accountsList: Account[] = [];
      
      for (const id in accountsData) {
        accountsList.push({
          id,
          ...accountsData[id]
        });
      }
      
      setAccounts(accountsList);
    });

    return () => unsubscribe();
  }, []);

  const handleEdit = (accountId: string) => {
    router.push(`/admin/Accounts/editacc/${accountId}`);
  };

  const handleDeleteClick = (accountId: string) => {
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (accountToDelete) {
      try {
        await remove(ref(database, `accounts/${accountToDelete}`));
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Error deleting account:", error);
      }
    }
  };

  // Pagination logic
  const indexOfLastAccount = currentPage * accountsPerPage;
  const indexOfFirstAccount = indexOfLastAccount - accountsPerPage;
  const currentAccounts = accounts.slice(indexOfFirstAccount, indexOfLastAccount);
  const totalPages = Math.ceil(accounts.length / accountsPerPage);

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
                    <BreadcrumbPage>Manage Accounts</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="flex-1 overflow-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Accounts</h1>
                <Button 
                  onClick={() => router.push("/admin/Accounts/createacc")}
                  className="h-10"
                >
                  Create New Account
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAccounts.length > 0 ? (
                      currentAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>{account.email}</TableCell>
                          <TableCell>{account.division}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(account.id)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteClick(account.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              {accounts.length > accountsPerPage && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </SidebarInset>
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarProvider>
    </ProtectedRoute>
  );
}