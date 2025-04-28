"use client";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { database } from "@/lib/firebase/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "@/lib/auth-context";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from the database
      const userRef = ref(database, `accounts/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        throw new Error("User data not found");
      }

      const userData = snapshot.val();
      const division = userData.division.toLowerCase();

      // Use the auth context to handle login
      login(user.uid, division);

       if (division === "admin") {
        router.push("/admin/dashboard");
      } else if (division === "secretary") {
        router.push("/secretary/dashboard");
      } else {
        throw new Error("Invalid division");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setError("Invalid email, password, or user division");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Airworthiness</title>
        <link rel="icon" href="/images/awdlogo.png" />
      </Head>
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{
          backgroundImage: "url('/images/airworthinessbg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Card className="bg-black w-[403px] h-[450px]">
            <CardHeader className="pt-10">
              <div className="flex flex-col items-center justify-center text-center">
                <CardTitle className="text-2xl text-white">Login</CardTitle>
                <CardDescription className="text-white pt-2">
                  Enter your email and password below
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label className="text-white text-md" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    className="text-white"
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-white text-md" htmlFor="password">
                    Password
                  </Label>
                  <Input
                    className="text-white"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button 
                  type="submit" 
                  className="w-full bg-white text-black" 
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}