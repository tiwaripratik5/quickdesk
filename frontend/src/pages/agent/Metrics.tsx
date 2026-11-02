import React, { useEffect, useState } from 'react';
import { Ticket, CheckCircle, BarChart2, Clock, TrendingUp } from 'lucide-react';
import client from '../../api/client';
import { Metrics as MetricsType } from '../../types';
import Navbar from '../../components/Navbar';

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await client.get<MetricsType>('/metrics');
        setMetrics(res.data);
      } catch {
        setError('Failed to load metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

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

  if (error || !metrics) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-red-500">{error || 'No metrics available'}</p>
        </main>
      </div>
    );
  }

  const categoryData = Object.entries(metrics.tickets_by_category).sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = Math.max(...Object.values(metrics.tickets_by_category), 1);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Metrics & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of helpdesk performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Open Tickets</span>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Ticket size={18} className="text-yellow-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.tickets_by_status.open}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting response</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Resolved</span>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle size={18} className="text-green-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.tickets_by_status.resolved}</p>
            <p className="text-xs text-gray-400 mt-1">Successfully closed</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Median Resolution</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock size={18} className="text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.median_resolution_time_minutes < 60
                ? `${Math.round(metrics.median_resolution_time_minutes)}m`
                : `${(metrics.median_resolution_time_minutes / 60).toFixed(1)}h`}
            </p>
            <p className="text-xs text-gray-400 mt-1">Average time to resolve</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">AI Override Rate</span>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp size={18} className="text-purple-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.ai_override_percentage.toFixed(1)}%</p>
            <p className="text-xs text-gray-400 mt-1">AI suggestions overridden</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Tickets by Category */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-500" />
              Tickets by Category
            </h2>
            {categoryData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-4">
                {categoryData.map(([category, count]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{category}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Table */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Summary</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Category</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-3">Count</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-3">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categoryData.map(([category, count]) => (
                  <tr key={category}>
                    <td className="py-3 text-sm text-gray-700">{category}</td>
                    <td className="py-3 text-sm font-semibold text-gray-900 text-right">{count}</td>
                    <td className="py-3 text-sm text-gray-500 text-right">
                      {metrics.total_tickets > 0
                        ? `${((count / metrics.total_tickets) * 100).toFixed(1)}%`
                        : '0%'}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200">
                  <td className="py-3 text-sm font-semibold text-gray-900">Total</td>
                  <td className="py-3 text-sm font-bold text-gray-900 text-right">{metrics.total_tickets}</td>
                  <td className="py-3 text-sm font-semibold text-gray-900 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
