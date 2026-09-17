import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  if (!token) {
    navigate('/login');
    return null;
  }

  const navItems = [
    { to: '/enquiries', label: '📋 Enquiries' },
    { to: '/quotations', label: '📄 Quotations' },
    { to: '/sales-orders', label: '📦 Sales Orders' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <div className="text-xl font-bold text-blue-700">⚙ ERP System</div>
          <div className="text-xs text-gray-400 mt-1">Manufacturing & Supply</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`block p-2 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-800">{username || 'User'}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
              role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
