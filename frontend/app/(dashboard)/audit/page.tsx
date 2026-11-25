'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { ShieldCheck, Filter, Clock, Eye } from 'lucide-react';

export default function AuditPage() {
  const { currentOrgId, role } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    if (!currentOrgId) return;
    setLoading(true);
    apiClient<any[]>('/audit')
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentOrgId]);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
          <ShieldCheck className="h-3.5 w-3.5" /> Compliance & Governance Record
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit Logs</h1>
        <p className="text-sm text-slate-500">
          Immutable event trails tracking authentication, configuration modifications, and administrative operations.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No audit logs recorded for this tenant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{log.action}</code>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-600">{log.resourceType}</td>
                    <td className="py-3 px-4 text-xs text-slate-800">
                      <div className="font-semibold">{log.userName}</div>
                      <div className="text-[10px] text-slate-400">{log.userEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Viewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-2">Audit Event Payload</h2>
            <div className="text-xs text-slate-500 mb-4">
              Action: <span className="font-semibold text-slate-800">{selectedLog.action}</span>
            </div>
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs overflow-x-auto max-h-72">
              {JSON.stringify(selectedLog.metadata, null, 2)}
            </pre>
            <div className="flex justify-end pt-4 mt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
