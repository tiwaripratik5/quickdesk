import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Send, Edit3, BookOpen, AlertCircle } from 'lucide-react';
import client from '../../api/client';
import { Ticket, AuditLog, DraftReply } from '../../types';
import Badge, { getStatusVariant, getPriorityVariant, getCategoryVariant } from '../../components/Badge';
import Navbar from '../../components/Navbar';

const CATEGORIES = ['IT', 'HR', 'Finance', 'Admin', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Draft
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [citations, setCitations] = useState<string[]>([]);

  // Override
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overridePriority, setOverridePriority] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Reply
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  const fetchTicket = async () => {
    try {
      const [ticketRes, auditRes] = await Promise.all([
        client.get<Ticket>(`/agent/tickets/${id}`),
        client.get<AuditLog[]>(`/agent/tickets/${id}/audit`),
      ]);
      setTicket(ticketRes.data);
      setAuditLogs(auditRes.data);
      setOverrideCategory(ticketRes.data.agent_category || ticketRes.data.ai_category || '');
      setOverridePriority(ticketRes.data.agent_priority || ticketRes.data.ai_priority || '');
      if (ticketRes.data.ai_draft_reply) {
        setDraft(ticketRes.data.ai_draft_reply);
      }
    } catch {
      setError('Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    try {
      const res = await client.get<DraftReply>(`/agent/tickets/${id}/draft`);
      setDraft(res.data.draft);
      setCitations(res.data.citations);
      setReplyText(res.data.draft);
    } catch {
      alert('Failed to generate AI draft. Please check your Groq API key.');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleOverride = async () => {
    setOverrideLoading(true);
    try {
      const res = await client.patch<Ticket>(`/agent/tickets/${id}/override`, {
        ai_category: overrideCategory || null,
        ai_priority: overridePriority || null,
      });
      setTicket(res.data);
      // Refresh audit logs
      const auditRes = await client.get<AuditLog[]>(`/agent/tickets/${id}/audit`);
      setAuditLogs(auditRes.data);
    } catch {
      alert('Failed to save override.');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const res = await client.post<Ticket>(`/agent/tickets/${id}/reply`, { reply: replyText });
      setTicket(res.data);
      setReplySuccess(true);
    } catch {
      alert('Failed to send reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </main>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-red-500">{error || 'Ticket not found'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 ml-64 p-8 max-w-5xl">
        {/* Back button */}
        <button
          onClick={() => navigate('/agent/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-3 gap-6">
          {/* Left column - Ticket info */}
          <div className="col-span-2 space-y-6">
            {/* Ticket Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <Badge
                  label={ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  variant={getStatusVariant(ticket.status)}
                />
                <span className="text-xs text-gray-400">{formatDate(ticket.created_at)}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
              <p className="text-gray-600 text-sm leading-relaxed">{ticket.description}</p>

              {ticket.attachment_filename && (
                <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
                  <span>📎</span>
                  <span>{ticket.attachment_filename}</span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Submitted by:</span> {ticket.employee_name || ticket.employee_id}
                </p>
                {ticket.resolved_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Resolved:</span> {formatDate(ticket.resolved_at)}
                  </p>
                )}
              </div>
            </div>

            {/* AI Draft Reply */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  AI Draft Reply
                </h2>
                <button
                  onClick={handleGenerateDraft}
                  disabled={draftLoading}
                  className="flex items-center gap-2 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {draftLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate Draft
                    </>
                  )}
                </button>
              </div>

              {citations.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
                  <BookOpen size={14} className="text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-blue-700">
                    <span className="font-medium">Sources:</span> {citations.join(', ')}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Edit reply before sending:</span>
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={8}
                  placeholder={draft || "Generate an AI draft or type your reply directly..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>

              {ticket.status === 'resolved' ? (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">✓ This ticket has been resolved</p>
                  {ticket.final_reply && (
                    <p className="text-sm text-green-600 mt-1">{ticket.final_reply}</p>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  {replySuccess && (
                    <p className="text-sm text-green-600 font-medium flex-1">✓ Reply sent successfully!</p>
                  )}
                  <button
                    onClick={handleSendReply}
                    disabled={replyLoading || !replyText.trim()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm ml-auto"
                  >
                    {replyLoading ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send size={14} />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Audit Log */}
            {auditLogs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Override History</h2>
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                      <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                      <span className="text-gray-600">
                        <span className="font-medium">{log.agent_name || 'Agent'}</span> changed{' '}
                        <span className="font-medium">{log.field_changed}</span> from{' '}
                        <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">{log.old_value}</span> to{' '}
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{log.new_value}</span>
                      </span>
                      <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                        {new Date(log.changed_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Metadata & Override */}
          <div className="space-y-6">
            {/* AI Suggestions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">AI Suggestions</h2>
                {ticket.ai_confidence !== undefined && ticket.ai_confidence !== null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ticket.ai_confidence >= 0.8
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : ticket.ai_confidence >= 0.6
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {Math.round(ticket.ai_confidence * 100)}% Confidence
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <Badge
                    label={ticket.ai_category || 'Unknown'}
                    variant={getCategoryVariant(ticket.ai_category || '')}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Priority</p>
                  <Badge
                    label={ticket.ai_priority || 'Unknown'}
                    variant={getPriorityVariant(ticket.ai_priority || '')}
                  />
                </div>
              </div>
            </div>

            {/* Override */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Override AI Suggestions</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select
                    value={overrideCategory}
                    onChange={(e) => setOverrideCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select
                    value={overridePriority}
                    onChange={(e) => setOverridePriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleOverride}
                  disabled={overrideLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {overrideLoading ? 'Saving...' : 'Save Override'}
                </button>
                {(ticket.agent_category || ticket.agent_priority) && (
                  <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertCircle size={12} />
                    Overridden by agent
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">Ticket Info</h2>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">ID</span>
                  <span className="font-mono truncate ml-2">{ticket.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Employee</span>
                  <span>{ticket.employee_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Agent</span>
                  <span>{ticket.agent_name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
