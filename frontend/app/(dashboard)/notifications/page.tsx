'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';

export default function NotificationsPage() {
  const { currentOrgId } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    if (!currentOrgId) return;
    setLoading(true);
    apiClient<{ notifications: any[]; unreadCount: number }>('/notifications')
      .then(res => setNotifications(res.notifications))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, [currentOrgId]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications Center</h1>
          <p className="text-sm text-slate-500">Live operational alerts, assignments, and workflow notices.</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-xs transition"
        >
          <CheckCheck className="h-4 w-4 text-emerald-600" /> Mark All as Read
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No notifications yet. You are all caught up!</div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition ${
                n.isRead ? 'bg-white' : 'bg-brand-50/30'
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                    n.isRead ? 'bg-transparent' : 'bg-brand-500'
                  }`}
                ></div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    View <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
