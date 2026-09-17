import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config";

const Quotations = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const headers = { Authorization: `Bearer ${token}` };

  const [quotations, setQuotations] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Form state
  const [enquiryId, setEnquiryId] = useState<number>(0);
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_pct: number;
    gst_pct: number;
  }[]>([{ product_id: 0, quantity: 1, unit_price: 0, discount_pct: 0, gst_pct: 18 }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAll = async () => {
    try {
      const [qRes, eRes, pRes] = await Promise.all([
        axios.get(`${API}/quotations`, { headers }),
        axios.get(`${API}/enquiries`, { headers }),
        axios.get(`${API}/products`, { headers }),
      ]);
      setQuotations(qRes.data);
      setEnquiries(eRes.data);
      setProducts(pRes.data);
    } catch (e) {}
  };

  useEffect(() => { fetchAll(); }, []);

  const addItem = () => setItems([...items, { product_id: 0, quantity: 1, unit_price: 0, discount_pct: 0, gst_pct: 18 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = val;
    setItems(updated);
  };

  // Auto-fill unit_price from product base_price
  const handleProductChange = (i: number, productId: number) => {
    const prod = products.find((p: any) => p.id === productId);
    const updated = [...items];
    updated[i].product_id = productId;
    if (prod) updated[i].unit_price = prod.base_price;
    setItems(updated);
  };

  const calcLineAmount = (item: typeof items[0]) => {
    const base = item.quantity * item.unit_price;
    const afterDiscount = base - base * (item.discount_pct / 100);
    return afterDiscount + afterDiscount * (item.gst_pct / 100);
  };

  const calcTotal = () => items.reduce((sum, item) => sum + calcLineAmount(item), 0);

  const getEnquiry = (id: number) => enquiries.find(e => e.id === id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const enq = getEnquiry(enquiryId);
    if (!enq) { setError("Please select a valid enquiry"); return; }
    const validItems = items.filter(i => i.product_id > 0 && i.quantity > 0 && i.unit_price >= 0);
    if (validItems.length === 0) { setError("Please add at least one product."); return; }

    try {
      await axios.post(`${API}/quotations`, {
        quotation_no: `QT-${Date.now()}`,
        enquiry_id: enquiryId,
        customer_id: enq.customer_id,
        valid_until: validUntil,
        items: validItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_pct: i.discount_pct,
          gst_pct: i.gst_pct,
        })),
      }, { headers });

      setSuccess("Quotation created successfully!");
      setEnquiryId(0); setValidUntil("");
      setItems([{ product_id: 0, quantity: 1, unit_price: 0, discount_pct: 0, gst_pct: 18 }]);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create quotation");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await axios.patch(`${API}/quotations/${id}/status`, { status }, { headers });
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  };

  const convertToOrder = async (id: number) => {
    if (!window.confirm("Convert this quotation to a Sales Order?")) return;
    try {
      await axios.post(`${API}/quotations/${id}/convert`, {}, { headers });
      alert("✅ Sales Order created successfully!");
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to convert quotation");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-yellow-100 text-yellow-800";
      case "SENT": return "bg-blue-100 text-blue-800";
      case "ACCEPTED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Quotations</h1>

      {/* Create form – only for SALES */}
      {role === "SALES" && (
        <div className="bg-white p-6 rounded shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">Create Quotation</h2>
          {error && <p className="text-red-500 mb-3 p-2 bg-red-50 rounded">{error}</p>}
          {success && <p className="text-green-600 mb-3 p-2 bg-green-50 rounded">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium text-sm">Select Enquiry *</label>
                <select
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  value={enquiryId}
                  onChange={e => setEnquiryId(parseInt(e.target.value))}
                  required
                >
                  <option value={0}>Select enquiry...</option>
                  {enquiries.map((enq: any) => (
                    <option key={enq.id} value={enq.id}>
                      {enq.enquiry_no} – {enq.customer?.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium text-sm">Valid Until *</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Products *</h3>
                <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline font-medium">+ Add Product</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">Unit Price (₹)</th>
                      <th className="p-2 text-left">Discount %</th>
                      <th className="p-2 text-left">GST %</th>
                      <th className="p-2 text-left">Line Amount (₹)</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">
                          <select
                            className="border p-1 rounded w-full focus:ring-1 focus:ring-blue-300 focus:outline-none"
                            value={item.product_id}
                            onChange={e => handleProductChange(i, parseInt(e.target.value))}
                            required
                          >
                            <option value={0}>Select...</option>
                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="number" min={1} className="border p-1 rounded w-20" value={item.quantity} onChange={e => updateItem(i, "quantity", parseInt(e.target.value))} />
                        </td>
                        <td className="p-2">
                          <input type="number" min={0} step="0.01" className="border p-1 rounded w-28" value={item.unit_price} onChange={e => updateItem(i, "unit_price", parseFloat(e.target.value))} />
                        </td>
                        <td className="p-2">
                          <input type="number" min={0} max={100} className="border p-1 rounded w-20" value={item.discount_pct} onChange={e => updateItem(i, "discount_pct", parseFloat(e.target.value))} />
                        </td>
                        <td className="p-2">
                          <input type="number" min={0} max={100} className="border p-1 rounded w-20" value={item.gst_pct} onChange={e => updateItem(i, "gst_pct", parseFloat(e.target.value))} />
                        </td>
                        <td className="p-2 font-semibold text-gray-800">
                          ₹{calcLineAmount(item).toFixed(2)}
                        </td>
                        <td className="p-2">
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)} className="text-red-500 font-bold">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={5} className="p-2 text-right font-bold">Grand Total:</td>
                      <td className="p-2 font-bold text-blue-700 text-base">₹{calcTotal().toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium">
              Create Quotation
            </button>
          </form>
        </div>
      )}

      {/* Quotations Table */}
      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-bold mb-4">All Quotations ({quotations.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-sm font-semibold">Quotation No</th>
                <th className="p-3 text-sm font-semibold">Enquiry</th>
                <th className="p-3 text-sm font-semibold">Customer</th>
                <th className="p-3 text-sm font-semibold">Items</th>
                <th className="p-3 text-sm font-semibold">Total</th>
                <th className="p-3 text-sm font-semibold">Valid Until</th>
                <th className="p-3 text-sm font-semibold">Status</th>
                <th className="p-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.length > 0 ? quotations.map((q: any) => (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm font-medium">{q.quotation_no}</td>
                  <td className="p-3 text-sm font-mono">{q.enquiry?.enquiry_no ?? `#${q.enquiry_id}`}</td>
                  <td className="p-3">{q.customer?.company_name}</td>
                  <td className="p-3 text-xs text-gray-600">
                    {q.items?.map((it: any) => (
                      <div key={it.id}>{it.product?.name ?? `P#${it.product_id}`} × {it.quantity}</div>
                    ))}
                  </td>
                  <td className="p-3 font-semibold">₹{q.total_amount?.toFixed(2)}</td>
                  <td className="p-3 text-sm">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "–"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(q.status)}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3 space-x-1">
                    {role === "SALES" && (
                      <>
                        {q.status === "DRAFT" && (
                          <button onClick={() => updateStatus(q.id, "SENT")} className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Send</button>
                        )}
                        {q.status === "SENT" && (
                          <>
                            <button onClick={() => updateStatus(q.id, "ACCEPTED")} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Accept</button>
                            <button onClick={() => updateStatus(q.id, "REJECTED")} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Reject</button>
                          </>
                        )}
                        {q.status === "ACCEPTED" && (
                          <button onClick={() => convertToOrder(q.id)} className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700">→ Sales Order</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="p-6 text-center text-gray-500">No quotations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quotations;
