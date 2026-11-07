"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  BookOpenCheck,
  ClipboardList,
  FileText,
  Gauge,
  Menu,
  Radar,
  Repeat2,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ProjectProvider, useProject } from "@/lib/store";
import { DEMO_PROJECTS, getCity } from "@/lib/data";
import { VerdictChip } from "./VerdictBanner";
import { cn } from "./ui/primitives";

const NAV = [
  { href: "/", label: "Overview", icon: Gauge, step: null },
  { href: "/intake", label: "Intake & Verdict", icon: ClipboardList, step: 1 },
  { href: "/conflicts", label: "Conflict Radar", icon: Radar, step: 2 },
  { href: "/flip", label: "By-Right Flip", icon: Repeat2, step: 2 },
  { href: "/clocks", label: "Two-Clock Ledger", icon: Timer, step: null },
  { href: "/package", label: "Submittal Package", icon: FileText, step: 3 },
  { href: "/registry", label: "Requirements Registry", icon: BookOpenCheck, step: null },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Primary">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
              active ? "text-white" : "text-white/60 hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-white/[0.12] ring-1 ring-white/15"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            <Icon className="relative size-4" aria-hidden />
            <span className="relative flex-1">{item.label}</span>
            {item.step && (
              <span className="relative rounded-md bg-white/10 px-1.5 text-[10px] font-semibold text-white/70">
                Step {item.step}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-[#0e1424] p-4 text-white">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-2 pt-1">
        <motion.div
          initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#3b6cf6] to-[#1baf7a] shadow-lg shadow-blue-500/30"
        >
          <Zap className="size-5" aria-hidden />
        </motion.div>
        <div>
          <p className="text-[15px] font-semibold leading-tight">Byright</p>
          <p className="text-[11px] text-white/50">By-Right Pathway Engine</p>
        </div>
      </Link>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto rounded-xl bg-white/[0.06] p-3 text-[11px] leading-relaxed text-white/55 ring-1 ring-white/10">
        Verdicts read <span className="font-semibold text-white/80">“Likely”</span> — never approved or guaranteed. Final determination rests with
        municipal staff.
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { project, evaluation, loadDemo } = useProject();
  const city = getCity(project.cityId);
  return (
    <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-black/[0.06] bg-plane/80 px-4 py-3 backdrop-blur-xl md:px-8">
      <button type="button" onClick={onMenu} className="rounded-lg p-1.5 text-ink-2 hover:bg-black/5 lg:hidden" aria-label="Open navigation">
        <Menu className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="demo-project">
          Active project
        </label>
        <select
          id="demo-project"
          value={DEMO_PROJECTS.some((d) => d.id === project.id) ? project.id : DEMO_PROJECTS[0].id}
          onChange={(e) => loadDemo(e.target.value)}
          className="max-w-full cursor-pointer truncate rounded-lg bg-transparent py-0.5 pr-2 text-sm font-semibold text-ink outline-none hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-brand-100"
        >
          {DEMO_PROJECTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <p className="truncate text-xs text-ink-2">
          {project.address} · APN {project.apn} · {city.name}
        </p>
      </div>
      <VerdictChip verdict={evaluation.verdict} confidence={evaluation.confidence} />
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">
        <Sidebar />
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 z-10 rounded-lg p-1 text-white/70 hover:bg-white/10"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ProjectProvider>
        <Shell>{children}</Shell>
      </ProjectProvider>
    </MotionConfig>
  );
}
