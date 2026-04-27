import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type CommandItem = {
  label: string;
  to: string;
  keywords: string;
};

function commandsForBase(base: string): CommandItem[] {
  return [
    { label: "Dashboard", to: `${base}/dashboard`, keywords: "dashboard overview home analytics" },
    { label: "Employees", to: `${base}/employees`, keywords: "employees team staff people" },
    { label: "Attendance", to: `${base}/attendance`, keywords: "attendance logs clock sessions" },
    { label: "Reports", to: `${base}/reports`, keywords: "reports exports payroll" },
    { label: "Leave Management", to: `${base}/leaves`, keywords: "leave vacation requests" },
    { label: "Profile", to: `${base}/profile`, keywords: "profile account user" },
    { label: "Notifications", to: `${base}/notifications`, keywords: "notifications alerts updates" },
    { label: "Settings", to: `${base}/settings`, keywords: "settings configuration workspace" },
    { label: "Activity Log", to: `${base}/activity`, keywords: "activity audit logs" },
    { label: "Clock", to: `${base}/clock`, keywords: "clock timer shift start stop" },
    { label: "Timesheet", to: `${base}/timesheet`, keywords: "timesheet my hours work log" },
  ];
}

export function CommandPalette() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const base = useMemo(() => {
    if (location.pathname.startsWith("/admin")) return "/admin";
    if (location.pathname.startsWith("/manager")) return "/manager";
    return "/employee";
  }, [location.pathname]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = commandsForBase(base);
    if (!q) return all;
    return all.filter((item) => item.label.toLowerCase().includes(q) || item.keywords.includes(q));
  }, [base, query]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-foreground/20 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="glass-panel w-full max-w-xl rounded-2xl shadow-premium-lg" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border/70 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search pages and actions..."
              className="h-9 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">No matching commands.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.to}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-secondary"
                onClick={() => {
                  navigate(item.to);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.to}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
