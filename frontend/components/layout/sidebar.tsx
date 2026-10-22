"use client";

import { useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reports", label: "P&L Report" },
  { href: "/invoices", label: "Invoices" },
  { href: "/expenses", label: "Expenses" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/categories", label: "Categories" },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = useMemo(() => {
    if (!user?.fullName) return "U";
    return user.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.fullName]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex min-h-screen w-[156px] flex-col justify-between border-r border-[#d7d0c3] bg-[#efede3] px-3 py-5">
      <div>
        <div className="mb-7">
          <div className="flex items-center gap-1 text-[31px] leading-none text-[#154f3b]">
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Ledger</span>
            <ChevronDown className="mt-1 h-3 w-3 stroke-[2.5]" />
          </div>
          <p className="mt-1 text-[11px] italic text-[#6c736d]">Books that keep themselves.</p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-[13px] font-medium leading-5 transition-colors",
                  isActive
                    ? "bg-[#0f5a42] text-[#f6f3ec]"
                    : "text-[#23392f] hover:bg-[#e2ddce]"
                )}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-[#d9d2c6] pt-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f5a42] text-[11px] font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-[#22342e]">{user?.fullName || "User"}</p>
            <p className="truncate text-[10px] text-[#6b736d]">{user?.email || "Signed in"}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-[#7a7a72]">Demo data • stored in this browser</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[11px] font-medium text-[#0f5a42] transition hover:text-[#0b4935]"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
