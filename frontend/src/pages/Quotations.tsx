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
  const [items, setItems] = useState<{ product_id: number; quantity: number; unit_price: number; discount_pct: number; gst_pct: number }[]>([
    { product_id: 0, quantity: 1, unit_price: 0, discount_pct: 0, gst_pct: 18 }
  ]);
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

  const getEnquiry = (id: number) => enquiries.find(e => e.id === id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const enq = getEnquiry(enquiryId);
    if (!enq) { setError("Please select a valid enquiry"); return; }
    try {
      await axios.post(`${API}/quotations`, {
        quotation_no: `QT-${Date.now()}`,
        enquiry_id: enquiryId,
        customer_id: enq.customer_id,
        valid_until: validUntil,
        items: items.filter(i => i.product_id > 0).map(i => ({
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
    try {
      await axios.post(`${API}/quotations/${id}/convert`, {}, { headers });
      alert("Sales Order created successfully!");
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to convert quotation");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Quotations</h1>

      {role === "SALES" && (
        <div className="bg-white p-6 rounded shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">Create Quotation</h2>
          {error && <p className="text-red-500 mb-3">{error}</p>}
          {success && <p className="text-green-600 mb-3">{success}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium text-sm">Select Enquiry *</label>
                <select className="w-full border p-2 rounded" value={enquiryId} onChange={e => setEnquiryId(parseInt(e.target.value))} required>
                  <option value={0}>Select enquiry...</option>
                  {enquiries.map((enq: any) => (
                    <option key={enq.id} value={enq.id}>{enq.enquiry_no} – {enq.customer?.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium text-sm">Valid Until *</label>
                <input type="date" className="w-full border p-2 rounded" value={validUntil} onChange={e => setValidUntil(e.target.value)} required />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium text-sm">Products</label>
                <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add Product</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">Unit Price</th>
                      <th className="p-2 text-left">Discount %</th>
                      <th className="p-2 text-left">GST %</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">
                          <select className="border p-1 rounded w-full" value={item.product_id} onChange={e => updateItem(i, "product_id", parseInt(e.target.value))}>
                            <option value={0}>Select...</option>
                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2"><input type="number" min={1} className="border p-1 rounded w-20" value={item.quantity} onChange={e => updateItem(i, "quantity", parseInt(e.target.value))} /></td>
                        <td className="p-2"><input type="number" min={0} className="border p-1 rounded w-24" value={item.unit_price} onChange={e => updateItem(i, "unit_price", parseFloat(e.target.value))} /></td>
                        <td className="p-2"><input type="number" min={0} max={100} className="border p-1 rounded w-20" value={item.discount_pct} onChange={e => updateItem(i, "discount_pct", parseFloat(e.target.value))} /></td>
                        <td className="p-2"><input type="number" min={0} max={100} className="border p-1 rounded w-20" value={item.gst_pct} onChange={e => updateItem(i, "gst_pct", parseFloat(e.target.value))} /></td>
                        <td className="p-2">{items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500">✕</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Create Quotation</button>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-bold mb-4">Existing Quotations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3">Quotation No</th>
                <th className="p-3">Enquiry</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total</th>
                <th className="p-3">Valid Until</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.length > 0 ? quotations.map((q: any) => (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm">{q.quotation_no}</td>
                  <td className="p-3 text-sm">{q.enquiry_id}</td>
                  <td className="p-3">{q.customer?.company_name}</td>
                  <td className="p-3 font-semibold">₹{q.total_amount?.toFixed(2)}</td>
                  <td className="p-3 text-sm">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      q.status === "ACCEPTED" ? "bg-green-100 text-green-800" :
                      q.status === "REJECTED" ? "bg-red-100 text-red-800" :
                      q.status === "SENT" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>{q.status}</span>
                  </td>
                  <td className="p-3 space-x-1">
                    {q.status === "DRAFT" && role === "SALES" && (
                      <button onClick={() => updateStatus(q.id, "SENT")} className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Send</button>
                    )}
                    {q.status === "SENT" && role === "SALES" && (
                      <>
                        <button onClick={() => updateStatus(q.id, "ACCEPTED")} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Accept</button>
                        <button onClick={() => updateStatus(q.id, "REJECTED")} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Reject</button>
                      </>
                    )}
                    {q.status === "ACCEPTED" && role === "SALES" && (
                      <button onClick={() => convertToOrder(q.id)} className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600">→ Sales Order</button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="p-3 text-center text-gray-500">No quotations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quotations;
