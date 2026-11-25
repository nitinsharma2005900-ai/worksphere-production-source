'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  BarChart3,
  Download,
  CheckCircle2,
  Clock,
  TrendingUp,
  Cpu,
  FileSpreadsheet,
  Mail
} from 'lucide-react';

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const { currentOrgId, user } = useAuth();
  const [workload, setWorkload] = useState<any>(null);
  const [cycleTime, setCycleTime] = useState<any>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportEmail, setReportEmail] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrgId) return;
    setLoading(true);

    Promise.all([
      apiClient<any>('/analytics/workload'),
      apiClient<any>('/analytics/cycle-time'),
      apiClient<any>('/analytics/delivery')
    ])
      .then(([wData, cData, dData]) => {
        setWorkload(wData);
        setCycleTime(cData);
        setDelivery(dData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentOrgId]);

  useEffect(() => {
    if (user?.email) setReportEmail(user.email);
  }, [user?.email]);

  const handleEmailReport = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendingReport(true);
    setReportMessage(null);
    setReportError(null);
    try {
      const result = await apiClient<{ emailMode: 'mock' | 'resend' }>('/analytics/report/email', {
        method: 'POST',
        body: JSON.stringify({ to: reportEmail })
      });
      setReportMessage(result.emailMode === 'mock'
        ? `Report generated for ${reportEmail}, but no email was sent. Configure Resend to deliver it.`
        : `Analytics report queued for ${reportEmail}.`);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Could not queue the analytics report.');
    } finally {
      setSendingReport(false);
    }
  };

  const workloadChartData = (workload?.members || []).map((m: any) => ({
    name: m.assignee_name || m.assignee_id,
    tasks: m.total_tasks,
    hours: m.total_estimated_hours,
    utilization: m.utilization_rate_percent
  }));

  const cyclePriorityData = Object.entries(cycleTime?.priority_breakdown || {}).map(([prio, hours]) => ({
    name: prio,
    hours
  }));

  const handleExportCSV = async () => {
    try {
      const tasks = await apiClient<any[]>('/tasks');
      if (tasks.length === 0) {
        alert('No tasks to export.');
        return;
      }

      // Convert tasks to CSV string
      const headers = ['id', 'title', 'status', 'priority', 'dueDate', 'estimatedHours', 'actualHours'];
      const csvRows = [headers.join(',')];

      for (const t of tasks) {
        csvRows.push([
          t.id,
          `"${(t.title || '').replace(/"/g, '""')}"`,
          t.status,
          t.priority,
          t.dueDate || '',
          t.estimatedHours || 0,
          t.actualHours || 0
        ].join(','));
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worksphere_tasks_${currentOrgId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Python analytics telemetry...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
            <Cpu className="h-3.5 w-3.5" /> Powered by FastAPI Analytics Service
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Productivity & Workload Analytics</h1>
          <p className="text-sm text-slate-500">
            Real-time calculations for cycle time, team utilization, and delivery benchmarks.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <form onSubmit={handleEmailReport} className="flex flex-wrap gap-2 sm:justify-end">
            <input
              type="email"
              required
              aria-label="Report recipient email"
              value={reportEmail}
              onChange={event => setReportEmail(event.target.value)}
              placeholder="report recipient"
              className="min-w-52 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sendingReport}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              <Mail className="h-4 w-4" /> {sendingReport ? 'Sending...' : 'Email Analytics'}
            </button>
          </form>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-900 sm:self-end"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV Report
          </button>
          {reportMessage && <p role="status" className="text-sm text-emerald-700">{reportMessage}</p>}
          {reportError && <p role="alert" className="text-sm text-rose-700">{reportError}</p>}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Cycle Time</span>
            <Clock className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{cycleTime?.average_cycle_time_hours || 0} hrs</div>
          <div className="text-xs text-slate-500 mt-2">
            Median: {cycleTime?.median_cycle_time_hours || 0} hrs across completed tasks
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On-Time Delivery</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{delivery?.on_time_delivery_rate_percent || 100}%</div>
          <div className="text-xs text-emerald-600 font-medium mt-2">
            {delivery?.on_time_tasks_count || 0} tasks resolved before deadline
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned Work</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{workload?.unassigned_tasks_count || 0}</div>
          <div className="text-xs text-slate-500 mt-2">Tasks pending team allocation</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Workload Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Team Workload Distribution (Estimated Hours)</h2>
          {workloadChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No assigned tasks yet to calculate workload.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadChartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cycle Time by Priority */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Cycle Time by Priority (Hours)</h2>
          {cyclePriorityData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No completed tasks to calculate cycle time breakdown.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cyclePriorityData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
