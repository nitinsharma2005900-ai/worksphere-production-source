'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { GitFork, Plus, Zap, Check, AlertCircle } from 'lucide-react';

export default function WorkflowsPage() {
  const { currentOrgId, role } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('TASK_STATUS_CHANGED');
  const [actionType, setActionType] = useState('SEND_NOTIFICATION');

  const loadRules = () => {
    if (!currentOrgId) return;
    setLoading(true);
    apiClient<any[]>('/workflows')
      .then(setRules)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRules();
  }, [currentOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          triggerType,
          actionType,
          triggerConfig: { trigger: triggerType },
          actionConfig: { action: actionType }
        })
      });
      setShowModal(false);
      setName('');
      setDescription('');
      loadRules();
    } catch (err: any) {
      alert(err.message || 'Error creating workflow rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow Automation</h1>
          <p className="text-sm text-slate-500">Configure event-driven triggers and automated actions across your projects.</p>
        </div>

        {role !== 'AUDITOR' && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-brand-500/30 transition"
          >
            <Plus className="h-4 w-4" /> New Automation Rule
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading automation rules...</div>
      ) : rules.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Zap className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No automation rules configured</h3>
          <p className="text-sm text-slate-500 mt-1">Set up rules to automatically notify stakeholders or trigger jobs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rules.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-base">{r.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {r.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{r.description || 'Automation rule.'}</p>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div>
                  Trigger: <span className="font-mono font-semibold text-slate-800">{r.triggerType}</span>
                </div>
                <div>
                  Action: <span className="font-mono font-semibold text-brand-600">{r.actionType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Automation Rule</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Notify Owner on Blocked Task"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Trigger Event</label>
                <select
                  value={triggerType}
                  onChange={e => setTriggerType(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="TASK_STATUS_CHANGED">When task status changes</option>
                  <option value="TASK_PRIORITY_URGENT">When task is marked URGENT</option>
                  <option value="DUE_DATE_APPROACHING">When due date is within 24 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Automated Action</label>
                <select
                  value={actionType}
                  onChange={e => setActionType(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="SEND_NOTIFICATION">Send in-app & email notification</option>
                  <option value="REASSIGN_TASK">Reassign to Project Manager</option>
                  <option value="CHANGE_STATUS">Auto-move to IN_REVIEW</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg"
                >
                  Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
