"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Softphone from "@/components/softphone";
import {
  Phone,
  PhoneIncoming,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Headphones,
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

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 border-r bg-sidebar flex flex-col">
        <div className="flex items-center gap-2 px-6 py-4 border-b">
          <Headphones className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">CallCenter</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {children}
        <Softphone />
      </main>
    </div>
  );
}
