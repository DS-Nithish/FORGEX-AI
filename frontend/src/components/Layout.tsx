import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview", icon: OverviewIcon },
  { to: "/approvals", label: "Approvals", icon: ApprovalsIcon },
  { to: "/attack-lab", label: "Attack Lab", icon: AttackLabIcon },
  { to: "/security-events", label: "Security Events", icon: SecurityEventsIcon },
];

function Layout() {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-[#EDEDED]">
      {/* Minimal Sidebar */}
      <aside className="fixed top-0 left-0 z-40 flex h-screen w-60 flex-col border-r border-white/[0.06] bg-[#0D0E12]">
        {/* Clean Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6">
          <div className="flex h-7 w-7 items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-base font-bold text-white tracking-tight">
            AgentShield
          </span>
        </div>

        {/* Nav links: Minimal & Crisp */}
        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Minimal Footer */}
        <div className="border-t border-white/[0.06] px-6 py-4">
          <p className="text-xs text-neutral-500 font-mono">AgentShield · v2.4</p>
        </div>
      </aside>

      {/* Main content area */}
      <main className="ml-60 flex-1 min-h-screen bg-[#0A0A0A]">
        <Outlet />
      </main>
    </div>
  );
}

/* ── Inline SVG icon components ── */

function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ApprovalsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M9 12l2 2 4-4" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}

function AttackLabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function SecurityEventsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default Layout;
