'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { API_BASE_URL, apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Paperclip,
  CheckSquare2,
  AlertCircle,
  FileText,
  Activity
} from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const router = useRouter();
  const { currentOrgId, role, user } = useAuth();

  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const loadTask = () => {
    if (!taskId || !currentOrgId) return;
    setLoading(true);

    apiClient<any>(`/tasks/${taskId}`)
      .then(data => {
        setTask(data);
        setSubtasks(data.subtasks || []);
        setComments(data.comments || []);
        setAttachments(data.attachments || []);
        setActivities(data.activities || []);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTask();
  }, [taskId, currentOrgId]);

  // Realtime comments and task updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('comment:added', ({ taskId: incomingTaskId, comment }: any) => {
      if (incomingTaskId === taskId) {
        setComments(prev => [comment, ...prev.filter(c => c.id !== comment.id)]);
      }
    });

    socket.on('task:updated', (updated: any) => {
      if (updated.id === taskId) {
        setTask(updated);
      }
    });

    return () => {
      socket.off('comment:added');
      socket.off('task:updated');
    };
  }, [taskId]);

  const handleUpdateStatus = async (status: string) => {
    setConflictError(null);
    try {
      const updated = await apiClient<any>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          version: task.version // Optimistic locking
        })
      });
      setTask(updated);
    } catch (err: any) {
      if (err.status === 409) {
        setConflictError(err.message || 'Concurrent modification detected. Latest task data loaded.');
        loadTask();
      } else {
        alert(err.message || 'Failed to update status');
      }
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    try {
      const created = await apiClient<any>('/subtasks', {
        method: 'POST',
        body: JSON.stringify({ taskId, title: newSubtask })
      });
      setSubtasks(prev => [...prev, created]);
      setNewSubtask('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    try {
      const updated = await apiClient<any>(`/subtasks/${subtaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !currentCompleted })
      });
      setSubtasks(prev => prev.map(s => (s.id === subtaskId ? updated : s)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const created = await apiClient<any>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment })
      });
      setComments(prev => [created, ...prev.filter(comment => comment.id !== created.id)]);
      setNewComment('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', taskId);

    const token = localStorage.getItem('worksphere_token');
    const orgId = localStorage.getItem('worksphere_org_id');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/attachments/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Organization-ID': orgId || ''
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setAttachments(prev => [data.data, ...prev]);
      } else {
        alert(data.error?.message || 'File upload failed');
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/attachments/download/${encodeURIComponent(attachment.storageKey)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('worksphere_token')}`,
          'X-Organization-ID': currentOrgId || ''
        }
      });
      if (!response.ok) throw new Error('Unable to download attachment. Please sign in again if your session expired.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  if (loading || !task) {
    return <div className="p-8 text-center text-slate-500">Loading task details...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back Button */}
      <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to Task Board
      </Link>

      {/* Conflict Notice */}
      {conflictError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{conflictError}</span>
        </div>
      )}

      {/* Task Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono font-semibold text-slate-500">Task #{task.id.slice(0, 8)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{task.priority}</span>
              <span className="text-xs font-mono text-slate-400">Lock Version: v{task.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{task.title}</h1>
            <p className="text-sm text-slate-500 mt-2">{task.description || 'No description provided.'}</p>
          </div>

          {role !== 'AUDITOR' && (
            <div className="flex items-center gap-2">
              <select
                value={task.status}
                onChange={e => handleUpdateStatus(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Subtasks & Comments */}
        <div className="md:col-span-2 space-y-6">
          {/* Subtasks Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckSquare2 className="h-5 w-5 text-brand-500" /> Subtasks Checklist
            </h2>

            <div className="space-y-2.5 mb-4">
              {subtasks.map(s => (
                <div
                  key={s.id}
                  onClick={() => role !== 'AUDITOR' && handleToggleSubtask(s.id, s.completed)}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-slate-100 transition cursor-pointer ${
                    s.completed ? 'bg-slate-50 text-slate-400 line-through' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={s.completed}
                    onChange={() => {}}
                    className="h-4 w-4 text-brand-600 rounded"
                  />
                  <span className="text-sm flex-1">{s.title}</span>
                </div>
              ))}
            </div>

            {role !== 'AUDITOR' && (
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  placeholder="Add a new subtask..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg"
                >
                  Add
                </button>
              </form>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Discussion & Comments</h2>

            {role !== 'AUDITOR' && (
              <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Post
                </button>
              </form>
            )}

            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">No comments yet. Start the conversation!</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{c.userName}</span>
                      <span className="text-slate-400">{new Date(c.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Attachments & Audit */}
        <div className="space-y-6">
          {/* Attachments Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-brand-500" /> Attachments
              </h3>
              {role !== 'AUDITOR' && (
                <label className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                  {uploading ? 'Uploading...' : '+ Upload'}
                  <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>

            <div className="space-y-2">
              {attachments.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No attachments uploaded.</div>
              ) : (
                attachments.map(att => (
                  <button
                    type="button"
                    key={att.id}
                    onClick={() => handleDownload(att)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs text-slate-700"
                  >
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="truncate flex-1 font-medium">{att.fileName}</span>
                    <span className="text-[10px] text-slate-400">{(att.fileSize / 1024).toFixed(1)} KB</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" /> Task History
            </h3>
            <div className="space-y-3">
              {activities.slice(0, 5).map(act => (
                <div key={act.id} className="text-xs border-b border-slate-100 pb-2 last:border-none">
                  <div className="font-medium text-slate-800">{act.action}</div>
                  <div className="text-[10px] text-slate-400">{new Date(act.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
