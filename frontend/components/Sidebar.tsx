'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/authContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  UserPlus,
  GitFork,
  BarChart3,
  ShieldAlert,
  Bell,
  Settings,
  ShieldCheck,
  Building2
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, role } = useAuth();

  const isPlatformAdmin = user?.isPlatformAdmin || role === 'PLATFORM_ADMIN';
  const isOwner = role === 'ORG_OWNER' || isPlatformAdmin;
  const isPM = role === 'PROJECT_MANAGER' || isOwner;
  const isAuditor = role === 'AUDITOR';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true },
    { label: 'Projects', href: '/projects', icon: FolderKanban, visible: true },
    { label: 'Task Board', href: '/tasks', icon: CheckSquare, visible: !isAuditor },
    { label: 'Milestones', href: '/milestones', icon: GitFork, visible: isPM },
    { label: 'Team Members', href: '/teams', icon: Users, visible: isPM },
    { label: 'Invitations', href: '/invitations', icon: UserPlus, visible: isOwner },
    { label: 'Analytics & Reports', href: '/analytics', icon: BarChart3, visible: !isAuditor },
    { label: 'Workflows', href: '/workflows', icon: GitFork, visible: isOwner },
    { label: 'Audit Logs', href: '/audit', icon: ShieldCheck, visible: isAuditor || isOwner },
    { label: 'Notifications', href: '/notifications', icon: Bell, visible: true },
    { label: 'Platform Admin', href: '/admin', icon: Building2, visible: isPlatformAdmin },
    { label: 'Settings', href: '/settings', icon: Settings, visible: true }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="h-9 w-9 bg-brand-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/30">
          WS
        </div>
        <div>
          <span className="font-semibold text-white text-lg tracking-tight">WorkSphere</span>
          <span className="text-[10px] block text-brand-400 font-mono uppercase tracking-wider">SaaS Platform</span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-xs text-slate-400 mb-1">Current Role</div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
          {role || 'MEMBER'}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.visible).map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <span>WorkSphere v1.0</span>
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>
    </aside>
  );
};
