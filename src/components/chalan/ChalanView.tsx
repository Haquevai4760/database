import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Printer,
  X,
  Loader2,
  CheckCircle2,
  Truck,
  User,
} from 'lucide-react';
import { ChalanRecord, DeliveryRecord } from '../../types';
import { api } from '../../lib/api';

interface ChalanViewProps {
  chalans: ChalanRecord[];
  deliveries: DeliveryRecord[];
  onRefresh: () => void;
}

export const ChalanView: React.FC<ChalanViewProps> = ({
  chalans,
  deliveries,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingChalan, setViewingChalan] = useState<ChalanRecord | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    deliveryNo: '',
    vehicleNo: '',
    itemsDetails: '',
    receivedBy: '',
    remarks: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectDelivery = (dNo: string) => {
    const d = deliveries.find((item) => item.deliveryNo === dNo);
    if (d) {
      setFormData({
        ...formData,
        deliveryNo: d.deliveryNo,
        customerName: d.customerName,
        itemsDetails: d.itemsSummary,
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.itemsDetails.trim()) {
      setErrorMsg('Customer Name and Items Details are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newCh = await api.createChallan(formData);
      setIsAddModalOpen(false);
      onRefresh();
      setViewingChalan(newCh);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate challan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredChalans = chalans.filter(
    (c) =>
      c.challanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.receivedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Delivery Challans (চালান)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Connected to <strong>Chalan</strong> sheet. Issue official delivery gate passes, log receiving officers, and print signed copies.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              customerName: '',
              deliveryNo: '',
              vehicleNo: '',
              itemsDetails: '',
              receivedBy: '',
              remarks: '',
            });
            setErrorMsg(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Generate New Challan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search challans by Challan No, Customer, Vehicle No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Challans Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Challan No.</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer / Consignee</th>
                <th className="px-4 py-3 font-semibold">Delivery Ref</th>
                <th className="px-4 py-3 font-semibold">Transport / Vehicle No.</th>
                <th className="px-4 py-3 font-semibold">Received By</th>
                <th className="px-4 py-3 font-semibold">Item Breakdown</th>
                <th className="px-4 py-3 font-semibold text-center">Print / View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredChalans.length > 0 ? (
                filteredChalans.map((c) => (
                  <tr
                    key={c.challanNo}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {c.challanNo}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {c.date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {c.customerName}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {c.deliveryNo || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {c.vehicleNo || 'Self Pick-up'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {c.receivedBy || 'Pending Receiver Sign'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs">
                      <div className="truncate" title={c.itemsDetails}>
                        {c.itemsDetails}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewingChalan(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Printer className="h-3 w-3 text-emerald-600" />
                        <span>Print Challan</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">
                    No delivery challans issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Challan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Official Delivery Challan
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Load from Dispatched Delivery (Optional)
                </label>
                <select
                  onChange={(e) => handleSelectDelivery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Choose Dispatched Delivery --</option>
                  {deliveries.map((d) => (
                    <option key={d.deliveryNo} value={d.deliveryNo}>
                      [{d.deliveryNo}] {d.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Consignee *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Petrochemical Complex Ltd."
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle / Transport Registration No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. DHAKA-METRO-CHA-14-8899"
                  value={formData.vehicleNo}
                  onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goods / Items Details *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="1. Industrial Safety Helmet (100 Pcs)&#10;2. High-Visibility Reflective Vest (150 Pcs)"
                  value={formData.itemsDetails}
                  onChange={(e) => setFormData({ ...formData, itemsDetails: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Received By (Name & Designation)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eng. Karimuzzaman (Store Officer)"
                  value={formData.receivedBy}
                  onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Challan Remarks / Gate Pass Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received in sound condition, sealed boxes"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Generate Challan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Challan Modal */}
      {viewingChalan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
            {/* Header controls (hidden on print) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Official Delivery Challan Print Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Challan</span>
                </button>
                <button
                  onClick={() => setViewingChalan(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Print Document Body */}
            <div className="p-4 bg-white text-slate-900 rounded-xl space-y-6">
              <div className="text-center border-b pb-4">
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  ENTERPRISE INDUSTRIAL SUPPLIES LTD.
                </h1>
                <p className="text-xs text-slate-500">Corporate Head Office • Dhaka, Bangladesh</p>
                <div className="inline-block border-2 border-slate-900 px-4 py-1 text-xs font-black uppercase tracking-widest mt-2">
                  Delivery Challan (গেট পাস চালান)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Consignee / Deliver To:</div>
                  <div className="text-sm font-bold mt-0.5">{viewingChalan.customerName}</div>
                  {viewingChalan.deliveryNo && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Dispatch Ref: <strong>{viewingChalan.deliveryNo}</strong>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Challan Details:</div>
                  <div className="font-mono font-bold text-emerald-800 mt-0.5">
                    {viewingChalan.challanNo}
                  </div>
                  <div className="text-[11px] text-slate-600">Date: {viewingChalan.date}</div>
                  <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                    Vehicle: <strong>{viewingChalan.vehicleNo || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Items breakdown */}
              <div className="border border-slate-300 rounded-lg p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b pb-1">
                  Item Description & Dispatched Quantity
                </div>
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-mono">
                  {viewingChalan.itemsDetails}
                </div>
              </div>

              {viewingChalan.remarks && (
                <div className="text-xs text-slate-500 italic">
                  Note: {viewingChalan.remarks}
                </div>
              )}

              {/* Signature section */}
              <div className="pt-16 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold text-slate-700">
                    Store Officer
                  </div>
                  <div className="text-[10px] text-slate-400">Dispatched</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold text-slate-700">
                    Carrier / Driver
                  </div>
                  <div className="text-[10px] text-slate-400">In-Transit</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold text-slate-700">
                    Received By
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {viewingChalan.receivedBy || 'Consignee Seal'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
