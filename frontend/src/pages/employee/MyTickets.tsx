import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Ticket, Clock, CheckCircle } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Ticket as TicketType } from '../../types';
import Badge, { getStatusVariant, getPriorityVariant, getCategoryVariant } from '../../components/Badge';
import Navbar from '../../components/Navbar';

export default function MyTickets() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchTickets = async () => {
    try {
      const res = await client.get<TicketType[]>('/tickets/my');
      setTickets(res.data);
    } catch {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // SSE connection for live updates
    if (token) {
      const es = new EventSource(`/api/sse/updates?token=${encodeURIComponent(token)}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ticket_resolved') {
            setTickets((prev) =>
              prev.map((t) =>
                t.id === data.ticket_id
                  ? { ...t, status: 'resolved', final_reply: data.final_reply }
                  : t
              )
            );
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
      };
    }

    return () => {
      eventSourceRef.current?.close();
    };
  }, [token]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
            <p className="text-gray-500 text-sm mt-1">Track your support requests</p>
          </div>
          <Link
            to="/employee/submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <PlusCircle size={18} />
            New Ticket
          </Link>
        </div>

        {/* Stats / Quick Filters */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`text-left rounded-xl border p-5 transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{tickets.length}</p>
              </div>
              <Ticket size={24} className={statusFilter === 'all' ? 'text-indigo-600' : 'text-indigo-400'} />
            </div>
            <p className="text-xs text-gray-400 mt-2">Click to view all</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
            className={`text-left rounded-xl border p-5 transition-all cursor-pointer ${
              statusFilter === 'open'
                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-200 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Open Tickets</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {tickets.filter((t) => t.status === 'open').length}
                </p>
              </div>
              <Clock size={24} className={statusFilter === 'open' ? 'text-amber-600' : 'text-yellow-400'} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {statusFilter === 'open' ? 'Filtering active (click to clear)' : 'Click to filter open'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
            className={`text-left rounded-xl border p-5 transition-all cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-200 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Resolved Tickets</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {tickets.filter((t) => t.status === 'resolved').length}
                </p>
              </div>
              <CheckCircle size={24} className={statusFilter === 'resolved' ? 'text-emerald-600' : 'text-green-400'} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {statusFilter === 'resolved' ? 'Filtering active (click to clear)' : 'Click to filter resolved'}
            </p>
          </button>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tickets yet. Submit your first ticket!</p>
            <Link
              to="/employee/submit"
              className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
            >
              Submit a ticket →
            </Link>
          </div>
        ) : tickets.filter((t) => statusFilter === 'all' || t.status === statusFilter).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 p-8">
            <Ticket size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No {statusFilter} tickets found.</p>
            <button
              onClick={() => setStatusFilter('all')}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Show all tickets →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets
              .filter((t) => statusFilter === 'all' || t.status === statusFilter)
              .map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge
                        label={ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        variant={getStatusVariant(ticket.status)}
                      />
                      {ticket.ai_category && (
                        <Badge label={ticket.ai_category} variant={getCategoryVariant(ticket.ai_category)} />
                      )}
                      {ticket.ai_priority && (
                        <Badge label={ticket.ai_priority} variant={getPriorityVariant(ticket.ai_priority)} />
                      )}
                      {ticket.ai_confidence !== undefined && ticket.ai_confidence !== null && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          {Math.round(ticket.ai_confidence * 100)}% AI Conf.
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{ticket.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.description}</p>

                    {ticket.status === 'resolved' && ticket.final_reply && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-semibold text-green-700 mb-1">Agent Reply:</p>
                        <p className="text-sm text-green-800">{ticket.final_reply}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(ticket.created_at)}</p>
                    {ticket.attachment_filename && (
                      <p className="text-xs text-indigo-500 mt-1">📎 {ticket.attachment_filename}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
