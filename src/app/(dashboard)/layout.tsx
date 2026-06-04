"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Softphone from "@/components/softphone";
import {
  Phone,
  PhoneIncoming,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Headphones,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const navItems = [
  { href: "/queue", label: "Call Queue", icon: PhoneIncoming },
  { href: "/live", label: "Live Call", icon: Phone },
  { href: "/reviews", label: "Reviews", icon: ClipboardList },
  { href: "/", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-screen overflow-hidden">
        <aside
          className={cn(
            "border-r bg-sidebar flex flex-col transition-all duration-200",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <div className={cn(
            "flex items-center border-b h-14 shrink-0",
            collapsed ? "justify-center px-0" : "justify-between px-4",
          )}>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Headphones className="h-6 w-6 text-primary shrink-0" />
                <span className="font-semibold text-lg">CallCenter</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", collapsed && "mt-2")}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return collapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger>
                    <Link href={item.href}>
                      <Button
                        variant={active ? "secondary" : "ghost"}
                        size="icon"
                        className="w-full h-9"
                      >
                        <item.icon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 h-9"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className={cn(
            "border-t p-3",
            collapsed && "flex justify-center",
          )}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground h-9">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          {children}
          <Softphone />
        </main>
      </div>
    </TooltipProvider>
  );
}
