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
          title: "Hold Documents",
          url: "/admin/Documents/holddocuments",
        },
        {
          title: "Division",
          url: "/admin/division",
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
          title: "Assign Track",
          url: "/admin/Documents/assigntrack",
        },
        {
          title: "Ongoing Documents",
          url: "/admin/Documents/ongoingdocs",
        },
        {
          title: "Sent Documents",
          url: "/admin/Documents/sentdocs",
        },
      ],
    },
    {
      title: "Outgoing Documents",
      items: [
        {
          title: "Pending Documents",
          url: "/admin/outgoingdocuments/pendingdocs",
        },
        {
          title: "Closed Documents",
          url: "/admin/outgoingdocuments/closeddocs",
        },
        {
          title: "Returned Documents",
          url: "/admin/outgoingdocuments/returneddocs",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
     <SidebarHeader className="flex items-center pt-2 font-bold justify-center text-2xl gap-2">
  {/* Add your logo image - adjust the src path as needed */}
  <img 
    src="/images/awdlogo.png" // Path to your logo in the public folder
    alt="Airworthiness Logo"
    className="w-20 h-20" // Adjust width and height as needed
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