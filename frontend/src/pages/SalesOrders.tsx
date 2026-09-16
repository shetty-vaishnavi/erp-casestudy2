import React, { useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const SalesOrders = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const headers = { Authorization: `Bearer ${token}` };

  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [dispatchForm, setDispatchForm] = useState<{ orderId: number; vehicle: string; driver: string } | null>(null);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    try {
      const [oRes, pRes] = await Promise.all([
        axios.get(`${API}/sales-orders`, { headers }),
        axios.get(`${API}/products`, { headers }),
      ]);
      setOrders(oRes.data);
      setInventory(pRes.data);
    } catch (e) {}
  };

  useEffect(() => { fetchAll(); }, []);

  const confirmOrder = async (id: number) => {
    try {
      await axios.post(`${API}/sales-orders/${id}/confirm`, {}, { headers });
      setError("");
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to confirm order");
    }
  };

  const dispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm) return;
    try {
      await axios.post(`${API}/sales-orders/${dispatchForm.orderId}/dispatch`, {
        dispatch_no: `DSP-${Date.now()}`,
        vehicle_number: dispatchForm.vehicle,
        driver_name: dispatchForm.driver,
      }, { headers });
      setDispatchForm(null);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to dispatch order");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Sales Orders</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {dispatchForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Dispatch Order #{dispatchForm.orderId}</h3>
            <form onSubmit={dispatchOrder} className="space-y-3">
              <div>
                <label className="block mb-1 text-sm font-medium">Vehicle Number *</label>
                <input className="w-full border p-2 rounded" value={dispatchForm.vehicle} onChange={e => setDispatchForm({...dispatchForm, vehicle: e.target.value})} required />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Driver Name *</label>
                <input className="w-full border p-2 rounded" value={dispatchForm.driver} onChange={e => setDispatchForm({...dispatchForm, driver: e.target.value})} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Dispatch</button>
                <button type="button" onClick={() => setDispatchForm(null)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-bold mb-4">Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3">Order No</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  {role === "ADMIN" && <th className="p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? orders.map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{order.order_no}</td>
                    <td className="p-3">{order.customer?.company_name}</td>
                    <td className="p-3 font-semibold">?{order.total_amount?.toFixed(2)}</td>
                    <td className="p-3 text-sm">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                        order.status === "DISPATCHED" ? "bg-green-100 text-green-800" :
                        order.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>{order.status}</span>
                    </td>
                    {role === "ADMIN" && (
                      <td className="p-3 space-x-2">
                        {order.status === "PENDING" && (
                          <button onClick={() => confirmOrder(order.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Confirm & Reserve</button>
                        )}
                        {order.status === "CONFIRMED" && (
                          <button onClick={() => setDispatchForm({ orderId: order.id, vehicle: "", driver: "" })} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Dispatch</button>
                        )}
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan={role === "ADMIN" ? 6 : 5} className="p-3 text-center text-gray-500">No sales orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4">Inventory Availability</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-2">Product</th>
                  <th className="p-2">Physical</th>
                  <th className="p-2">Reserved</th>
                  <th className="p-2">Available</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{p.inventory?.physical_quantity ?? 0}</td>
                    <td className="p-2">{p.inventory?.reserved_quantity ?? 0}</td>
                    <td className="p-2">
                      <span className={`font-semibold ${p.available_inventory < 10 ? "text-red-500" : "text-green-600"}`}>
                        {p.available_inventory ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrders;

