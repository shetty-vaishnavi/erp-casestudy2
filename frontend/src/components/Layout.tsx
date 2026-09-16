import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  if (!token) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b text-xl font-bold">FundsRoom</div>
        <nav className="flex-1 p-4 space-y-2">
          
          <Link to="/enquiries" className="block p-2 rounded hover:bg-gray-200">Enquiries</Link>
          <Link to="/quotations" className="block p-2 rounded hover:bg-gray-200">Quotations</Link>
          <Link to="/sales-orders" className="block p-2 rounded hover:bg-gray-200">Sales Orders</Link>
        </nav>
        <div className="p-4 border-t">
          <p className="mb-2 text-sm text-gray-600">Role: {role}</p>
          <button onClick={handleLogout} className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600">Logout</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;

