import * as React from "react"
import { ChevronRight } from "lucide-react"
import { NavUser } from "@/components/nav-user"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Image from "next/image"

const data = {
  navMain: [
    {
      title: "Home",
      items: [
        {
          title: "Dashboard",
          url: "/admin/dashboard",
        },
        
        {
          title: "Mandays",
          url: "/admin/mandays",
        },
      ],
    },
    {
      title: "Accounts",
      items: [
        {
          title: "Manage Accounts",
          url: "/admin/Accounts/manageacc",
        },
        {
          title: "Create Accounts",
          url: "/admin/Accounts/createacc",
        },
      ],
    },
    {
      title: "Incoming Documents",
      items: [
        {
          title: "Incoming Documents",
          url: "/admin/Documents/assigntrack",
        },
        {
          title: "Division",
          url: "/admin/division",
        },
      ],
    },
    {
      title: "Outgoing Documents",
      items: [
        {
          title: "Outgoing Documents",
          url: "/admin/outgoingdocuments/closeddocs",
        },
        {
          title: "Pending Documents",
          url: "/admin/outgoingdocuments/pendingdocs",
        },
        
        
        
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="flex items-center pt-2 font-bold justify-center text-2xl gap-2">
        <Image 
          src="/images/awdlogo.png" 
          alt="Airworthiness Logo"
          width={80}
          height={80}
          className="w-20 h-20" 
        />
        AIRWORTHINESS
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {data.navMain.map((item) => (
          <Collapsible
            key={item.title}
            title={item.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <CollapsibleTrigger>
                  {item.title}{" "}
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <Link href={item.url}>{item.title}</Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}