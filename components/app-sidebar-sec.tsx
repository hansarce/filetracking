import * as React from "react"
import { ChevronRight } from "lucide-react"
import { NavUser } from "@/components/nav-user"
import Link from "next/link";
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
          url: "/secretary/dashboard",
        },
        {
          title: "Division",
          url: "/secretary/division",
        },
        {
          title: "Hold Documents",
          url: "/secretary/holddocuments",
        },
      ],
    },
    {
      title: "Documents",
      items: [
        {
          title: "Ongoing Documents",
          url: "/secretary/ongoingdocs",
        },
        {
          title: "Pending Documents",
          url: "/secretary/pendingdocs",
        },
        {
          title: "Sent Documents",
          url: "/secretary/sentdocs",
        },
      ],
    },
  ],
}

export function AppSidebarSecretary({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
          <SidebarHeader className="flex items-center pt-2 font-bold justify-center text-2xl gap-2">
        <img 
          src="/images/awdlogo.png" 
          alt="Airworthiness Logo"
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