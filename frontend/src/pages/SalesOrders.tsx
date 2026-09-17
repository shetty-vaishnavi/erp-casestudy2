import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config";

const SalesOrders = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const headers = { Authorization: `Bearer ${token}` };

  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [dispatchForm, setDispatchForm] = useState<{ orderId: number; vehicle: string; driver: string } | null>(null);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      const [pRes] = await Promise.all([
        axios.get(`${API}/products`, { headers }),
      ]);
      setInventory(pRes.data);

      // ADMIN can see all orders; SALES sees inventory panel only
      if (role === "ADMIN") {
        const oRes = await axios.get(`${API}/sales-orders`, { headers });
        setOrders(oRes.data);
      }
    } catch (e) {}
  };

  useEffect(() => { fetchAll(); }, []);

  const confirmOrder = async (id: number) => {
    try {
      setError("");
      await axios.post(`${API}/sales-orders/${id}/confirm`, {}, { headers });
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to confirm order");
    }
  };

  const cancelOrder = async (id: number) => {
    if (!window.confirm("Cancel this order? Reserved inventory will be released.")) return;
    try {
      setError("");
      await axios.post(`${API}/sales-orders/${id}/cancel`, {}, { headers });
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel order");
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
      setError("");
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to dispatch order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED": return "bg-blue-100 text-blue-800";
      case "DISPATCHED": return "bg-green-100 text-green-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Sales Orders</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 border border-red-200">{error}</div>}

      {/* Dispatch Modal */}
      {dispatchForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Dispatch Order #{dispatchForm.orderId}</h3>
            <form onSubmit={dispatchOrder} className="space-y-3">
              <div>
                <label className="block mb-1 text-sm font-medium">Vehicle Number *</label>
                <input
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-green-300 focus:outline-none"
                  value={dispatchForm.vehicle}
                  onChange={e => setDispatchForm({ ...dispatchForm, vehicle: e.target.value })}
                  placeholder="e.g. MH-12-AB-1234"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Driver Name *</label>
                <input
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-green-300 focus:outline-none"
                  value={dispatchForm.driver}
                  onChange={e => setDispatchForm({ ...dispatchForm, driver: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium">
                  Confirm Dispatch
                </button>
                <button type="button" onClick={() => setDispatchForm(null)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Orders Table (ADMIN only) */}
        {role === "ADMIN" ? (
          <div className="xl:col-span-2 bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Orders ({orders.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-sm font-semibold">Order No</th>
                    <th className="p-3 text-sm font-semibold">Customer</th>
                    <th className="p-3 text-sm font-semibold">Quotation</th>
                    <th className="p-3 text-sm font-semibold">Total</th>
                    <th className="p-3 text-sm font-semibold">Date</th>
                    <th className="p-3 text-sm font-semibold">Status</th>
                    <th className="p-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? orders.map((order: any) => (
                    <React.Fragment key={order.id}>
                      <tr
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      >
                        <td className="p-3 font-mono text-sm font-medium">{order.order_no}</td>
                        <td className="p-3">{order.customer?.company_name}</td>
                        <td className="p-3 text-xs text-gray-500 font-mono">
                          {order.quotation?.enquiry?.enquiry_no ?? "–"}
                        </td>
                        <td className="p-3 font-semibold">₹{order.total_amount?.toFixed(2)}</td>
                        <td className="p-3 text-sm">{new Date(order.date).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 space-x-1" onClick={e => e.stopPropagation()}>
                          {order.status === "PENDING" && (
                            <button
                              onClick={() => confirmOrder(order.id)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              Confirm & Reserve
                            </button>
                          )}
                          {order.status === "CONFIRMED" && (
                            <>
                              <button
                                onClick={() => setDispatchForm({ orderId: order.id, vehicle: "", driver: "" })}
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                              >
                                Dispatch
                              </button>
                              <button
                                onClick={() => cancelOrder(order.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {order.status === "PENDING" && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="bg-gray-400 text-white px-3 py-1 rounded text-xs hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          )}
                          {order.status === "DISPATCHED" && order.dispatch && (
                            <span className="text-xs text-gray-500">
                              {order.dispatch.vehicle_number}
                            </span>
                          )}
                        </td>
                      </tr>
                      {/* Expanded row: show items */}
                      {expandedOrder === order.id && (
                        <tr className="bg-blue-50">
                          <td colSpan={7} className="px-6 py-3">
                            <div className="text-sm font-semibold text-gray-700 mb-2">Order Items:</div>
                            <table className="text-sm w-auto">
                              <thead>
                                <tr className="text-gray-600">
                                  <th className="pr-8 text-left font-medium">Product</th>
                                  <th className="pr-8 text-left font-medium">Qty</th>
                                  <th className="text-left font-medium">Code</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items?.map((it: any) => (
                                  <tr key={it.id}>
                                    <td className="pr-8 py-1">{it.product?.name ?? `#${it.product_id}`}</td>
                                    <td className="pr-8 py-1">{it.quantity} {it.product?.unit}</td>
                                    <td className="py-1 text-gray-500 font-mono">{it.product?.code}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {order.dispatch && (
                              <div className="mt-2 text-xs text-gray-500">
                                Dispatched via <strong>{order.dispatch.vehicle_number}</strong> by {order.dispatch.driver_name} on {new Date(order.dispatch.date).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-500">No sales orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="xl:col-span-2 bg-white p-6 rounded shadow-md flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-3">📦</div>
              <p className="font-medium">Sales orders are managed by the Admin.</p>
              <p className="text-sm mt-1">Check the inventory panel on the right to see stock availability.</p>
            </div>
          </div>
        )}

        {/* Inventory Panel (visible to both roles) */}
        <div className="bg-white p-6 rounded shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4">Inventory Availability</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-2 text-xs font-semibold">Product</th>
                  <th className="p-2 text-xs font-semibold text-center">Physical</th>
                  <th className="p-2 text-xs font-semibold text-center">Reserved</th>
                  <th className="p-2 text-xs font-semibold text-center">Available</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((p: any) => {
                  const available = p.available_inventory ?? 0;
                  return (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="font-medium text-xs">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.code}</div>
                      </td>
                      <td className="p-2 text-center">{p.inventory?.physical_quantity ?? 0}</td>
                      <td className="p-2 text-center text-orange-600">{p.inventory?.reserved_quantity ?? 0}</td>
                      <td className="p-2 text-center">
                        <span className={`font-bold ${available <= 0 ? "text-red-600" : available < 20 ? "text-orange-500" : "text-green-600"}`}>
                          {available}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">Available = Physical − Reserved</p>
        </div>
      </div>
    </div>
  );
};

export default SalesOrders;
