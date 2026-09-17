import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config";

const Enquiries = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const headers = { Authorization: `Bearer ${token}` };

  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ product_id: number; quantity: number }[]>([
    { product_id: 0, quantity: 1 },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAll = async () => {
    try {
      const [eRes, pRes] = await Promise.all([
        axios.get(`${API}/enquiries`, { headers }),
        axios.get(`${API}/products`, { headers }),
      ]);
      setEnquiries(eRes.data);
      setProducts(pRes.data);
    } catch (e) {}
  };

  useEffect(() => { fetchAll(); }, []);

  const addItem = () => setSelectedItems([...selectedItems, { product_id: 0, quantity: 1 }]);
  const removeItem = (i: number) => setSelectedItems(selectedItems.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const updated = [...selectedItems];
    (updated[i] as any)[field] = val;
    setSelectedItems(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-blue-100 text-blue-800";
      case "QUOTED": return "bg-yellow-100 text-yellow-800";
      case "WON": return "bg-green-100 text-green-800";
      case "LOST": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const validItems = selectedItems.filter(i => i.product_id > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      setError("Please add at least one product.");
      return;
    }
    try {
      // Create (or find existing) customer
      const custRes = await axios.post(`${API}/customers`, {
        company_name: companyName,
        contact_person: contactPerson,
        mobile,
        email,
        city,
      }, { headers });
      const customer_id = custRes.data.id;

      const enquiry_no = `ENQ-${Date.now()}`;
      await axios.post(`${API}/enquiries`, {
        enquiry_no,
        customer_id,
        required_date: requiredDate,
        notes,
        items: validItems,
      }, { headers });

      setSuccess("Enquiry created successfully!");
      setCompanyName(""); setContactPerson(""); setMobile(""); setEmail(""); setCity("");
      setRequiredDate(""); setNotes("");
      setSelectedItems([{ product_id: 0, quantity: 1 }]);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create enquiry");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Enquiries</h1>

      {/* Create form – only for SALES */}
      {role === "SALES" && (
        <div className="bg-white p-6 rounded shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">Create New Enquiry</h2>
          {error && <p className="text-red-500 mb-3 p-2 bg-red-50 rounded">{error}</p>}
          {success && <p className="text-green-600 mb-3 p-2 bg-green-50 rounded">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Details */}
            <div>
              <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium text-sm">Company Name *</label>
                  <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-sm">Contact Person *</label>
                  <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" value={contactPerson} onChange={e => setContactPerson(e.target.value)} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-sm">Mobile *</label>
                  <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" value={mobile} onChange={e => setMobile(e.target.value)} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-sm">Email *</label>
                  <input type="email" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-sm">City *</label>
                  <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" value={city} onChange={e => setCity(e.target.value)} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-sm">Required Date *</label>
                  <input type="date" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} required />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium text-sm">Notes</label>
              <textarea className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {/* Product Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Products *</h3>
                <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline font-medium">+ Add Product</button>
              </div>
              {selectedItems.map((item, i) => (
                <div key={i} className="flex gap-3 mb-2 items-center">
                  <select
                    className="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    value={item.product_id}
                    onChange={e => updateItem(i, "product_id", parseInt(e.target.value))}
                    required
                  >
                    <option value={0}>Select product...</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code}) — {p.unit}</option>
                    ))}
                  </select>
                  <input
                    type="number" min={1}
                    className="w-24 border p-2 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(i, "quantity", parseInt(e.target.value))}
                    required
                  />
                  {selectedItems.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-500 text-lg font-bold px-2">✕</button>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium">
              Create Enquiry
            </button>
          </form>
        </div>
      )}

      {/* Enquiries Table */}
      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-bold mb-4">All Enquiries ({enquiries.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-sm font-semibold">Enquiry No</th>
                <th className="p-3 text-sm font-semibold">Customer</th>
                <th className="p-3 text-sm font-semibold">City</th>
                <th className="p-3 text-sm font-semibold">Required Date</th>
                <th className="p-3 text-sm font-semibold">Products</th>
                <th className="p-3 text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length > 0 ? enquiries.map((enq: any) => (
                <tr key={enq.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm font-medium">{enq.enquiry_no}</td>
                  <td className="p-3">
                    <div className="font-medium">{enq.customer?.company_name}</div>
                    <div className="text-xs text-gray-500">{enq.customer?.contact_person}</div>
                  </td>
                  <td className="p-3 text-sm text-gray-600">{enq.customer?.city}</td>
                  <td className="p-3 text-sm">{enq.required_date ? new Date(enq.required_date).toLocaleDateString() : "–"}</td>
                  <td className="p-3 text-sm">
                    {enq.items?.map((it: any) => (
                      <div key={it.id} className="text-xs text-gray-700">
                        {it.product?.name ?? `Product #${it.product_id}`} × {it.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(enq.status)}`}>
                      {enq.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No enquiries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Enquiries;
