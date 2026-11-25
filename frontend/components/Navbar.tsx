'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import { apiClient } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Bell, LogOut, ChevronDown, Check } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, currentOrgId, role, memberships, logout, switchOrganization } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  useEffect(() => {
    if (!currentOrgId) return;

    // Load initial notification count
    apiClient<{ unreadCount: number }>('/notifications')
      .then(res => setUnreadCount(res.unreadCount))
      .catch(() => {});

    // Listen to real-time notification socket events
    const socket = getSocket();
    if (socket) {
      socket.on('notification:new', () => {
        setUnreadCount(prev => prev + 1);
      });
    }

    return () => {
      if (socket) socket.off('notification:new');
    };
  }, [currentOrgId]);

  const currentOrg = memberships.find(m => m.organizationId === currentOrgId);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Organization Switcher */}
      <div className="relative">
        <button
          onClick={() => setShowOrgMenu(!showOrgMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-sm font-medium text-slate-800"
        >
          <span className="font-semibold">{currentOrg?.organizationName || 'Select Organization'}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {showOrgMenu && (
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your Organizations
            </div>
            {memberships.map(m => (
              <button
                key={m.organizationId}
                onClick={() => {
                  switchOrganization(m.organizationId);
                  setShowOrgMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between text-slate-700"
              >
                <div>
                  <div className="font-medium">{m.organizationName}</div>
                  <div className="text-xs text-slate-400">{m.role}</div>
                </div>
                {m.organizationId === currentOrgId && <Check className="h-4 w-4 text-brand-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Navigation: Notifications & User profile */}
      <div className="flex items-center gap-4">
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
