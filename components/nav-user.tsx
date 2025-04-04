"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function NavUser() {
  const { logout, userDivision } = useAuth();

  return (
    <div className="flex items-center gap-4 p-4">
      <Avatar>
        <AvatarImage src="" />
        <AvatarFallback className="bg-gray-500 text-white">
          {userDivision?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium capitalize">{userDivision}</span>
        <Button 
          variant="link" 
          className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}