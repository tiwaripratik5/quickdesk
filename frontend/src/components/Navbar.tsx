import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Ticket, BarChart2, PlusCircle, List } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path
      ? 'bg-indigo-700 text-white'
      : 'text-indigo-200 hover:bg-indigo-700 hover:text-white';

  return (
    <div className="flex h-screen flex-col fixed left-0 top-0 w-64 bg-indigo-900 text-white z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-indigo-700">
        <Ticket size={24} className="text-indigo-300" />
        <span className="text-xl font-bold tracking-tight">QuickDesk</span>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-indigo-700">
        <p className="text-sm text-indigo-300">Signed in as</p>
        <p className="font-semibold truncate">{user?.name}</p>
        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-indigo-600 text-indigo-100 capitalize">
          {user?.role}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {user?.role === 'employee' && (
          <>
            <Link
              to="/employee/tickets"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/employee/tickets')}`}
            >
              <List size={18} />
              My Tickets
            </Link>
            <Link
              to="/employee/submit"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/employee/submit')}`}
            >
              <PlusCircle size={18} />
              Submit Ticket
            </Link>
          </>
        )}

        {user?.role === 'agent' && (
          <>
            <Link
              to="/agent/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/agent/dashboard')}`}
            >
              <List size={18} />
              All Tickets
            </Link>
            <Link
              to="/agent/metrics"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/agent/metrics')}`}
            >
              <BarChart2 size={18} />
              Metrics
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-indigo-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-indigo-200 hover:bg-indigo-700 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
