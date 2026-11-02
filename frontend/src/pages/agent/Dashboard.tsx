import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ExternalLink, Bell } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Ticket, TicketFilters } from '../../types';
import Badge, { getStatusVariant, getPriorityVariant, getCategoryVariant } from '../../components/Badge';
import Navbar from '../../components/Navbar';

const CATEGORIES = ['IT', 'HR', 'Finance', 'Admin', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [notification, setNotification] = useState('');
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchTickets = async (f?: TicketFilters) => {
    try {
      const params = new URLSearchParams();
      const activeFilters = f || filters;
      if (activeFilters.status) params.append('status', activeFilters.status);
      if (activeFilters.category) params.append('category', activeFilters.category);
      if (activeFilters.priority) params.append('priority', activeFilters.priority);
      if (activeFilters.search) params.append('search', activeFilters.search);

      const res = await client.get<Ticket[]>(`/agent/tickets?${params.toString()}`);
      setTickets(res.data);
    } catch {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // SSE connection
    if (token) {
      const es = new EventSource(`/api/sse/updates?token=${encodeURIComponent(token)}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_ticket') {
            setNotification(`New ticket received: "${data.title}"`);
            clearTimeout(notifTimer.current);
            notifTimer.current = setTimeout(() => setNotification(''), 5000);
            // Refresh the list
            fetchTickets();
          }
        } catch {}
      };

      es.onerror = () => es.close();
    }

    return () => {
      eventSourceRef.current?.close();
      clearTimeout(notifTimer.current);
    };
  }, [token]);

  const handleFilterChange = (key: keyof TicketFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    setLoading(true);
    fetchTickets(newFilters);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        {/* Live notification */}
        {notification && (
          <div className="fixed top-4 right-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm z-50 animate-pulse">
            <Bell size={16} />
            {notification}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and respond to support requests</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={18} className="text-gray-400" />

            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title..."
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status */}
            <select
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>

            {/* Category */}
            <select
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Priority */}
            <select
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No tickets found matching your filters.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 truncate max-w-xs">{ticket.title}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{ticket.employee_name || '—'}</td>
                    <td className="px-5 py-4">
                      <Badge
                        label={ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        variant={getStatusVariant(ticket.status)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      {(ticket.agent_category || ticket.ai_category) ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            label={ticket.agent_category || ticket.ai_category!}
                            variant={getCategoryVariant(ticket.agent_category || ticket.ai_category!)}
                          />
                          {!ticket.agent_category && ticket.ai_confidence !== undefined && ticket.ai_confidence !== null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-gray-100 text-gray-600">
                              {Math.round(ticket.ai_confidence * 100)}%
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {(ticket.agent_priority || ticket.ai_priority) ? (
                        <Badge
                          label={ticket.agent_priority || ticket.ai_priority!}
                          variant={getPriorityVariant(ticket.agent_priority || ticket.ai_priority!)}
                        />
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/agent/tickets/${ticket.id}`}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        View <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
