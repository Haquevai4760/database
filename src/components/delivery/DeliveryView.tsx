import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  Loader2,
  Package,
} from 'lucide-react';
import { DeliveryRecord, QuotationRecord } from '../../types';
import { api } from '../../lib/api';

interface DeliveryViewProps {
  deliveries: DeliveryRecord[];
  quotations: QuotationRecord[];
  onRefresh: () => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({
  deliveries,
  quotations,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    quotationNo: '',
    itemsSummary: '',
    deliveryStatus: 'Pending' as 'Pending' | 'In Transit' | 'Delivered' | 'Returned',
    deliveredBy: '',
    remarks: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectQuotation = (qNo: string) => {
    const q = quotations.find((item) => item.quotationNo === qNo);
    if (q) {
      const summary = q.items?.map((i) => `${i.quantity}x ${i.itemName}`).join(', ') || '';
      setFormData({
        ...formData,
        quotationNo: q.quotationNo,
        customerName: q.customerName,
        itemsSummary: summary,
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.itemsSummary.trim()) {
      setErrorMsg('Customer Name and Items Summary are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.createDelivery(formData);
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const matchSearch =
      d.deliveryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.itemsSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.deliveredBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = !statusFilter || d.deliveryStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Delivery Operations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Connected to <strong>Delivery</strong> sheet. Monitor shipments, assign logistics carriers, and maintain proof of delivery.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              customerName: '',
              quotationNo: '',
              itemsSummary: '',
              deliveryStatus: 'Pending',
              deliveredBy: '',
              remarks: '',
            });
            setErrorMsg(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Delivery Dispatch</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deliveries by Delivery No, Customer, Items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="sm:w-52">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Returned">Returned</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Delivery No.</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer Name</th>
                <th className="px-4 py-3 font-semibold">Quotation Ref</th>
                <th className="px-4 py-3 font-semibold">Dispatched Items</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Carrier / Delivered By</th>
                <th className="px-4 py-3 font-semibold">Logistics Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((d) => (
                  <tr
                    key={d.deliveryNo}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {d.deliveryNo}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {d.date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {d.customerName}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {d.quotationNo || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs">
                      <div className="truncate" title={d.itemsSummary}>
                        {d.itemsSummary}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          d.deliveryStatus === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : d.deliveryStatus === 'In Transit'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {d.deliveryStatus === 'Delivered' && <CheckCircle2 className="h-3 w-3" />}
                        {d.deliveryStatus === 'In Transit' && <Truck className="h-3 w-3" />}
                        {d.deliveryStatus === 'Pending' && <Clock className="h-3 w-3" />}
                        <span>{d.deliveryStatus}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-[11px]">
                      {d.deliveredBy || 'Internal Logistics'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] max-w-xs truncate">
                      {d.remarks || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">
                    No delivery records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Delivery Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                New Delivery Record
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
                  Load from Approved Quotation (Optional)
                </label>
                <select
                  onChange={(e) => handleSelectQuotation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Select Quotation --</option>
                  {quotations.map((q) => (
                    <option key={q.quotationNo} value={q.quotationNo}>
                      [{q.quotationNo}] {q.customerName} (BDT {q.grandTotal})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Destination *
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
                  Items Summary / Manifest *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 100x MSA Safety Helmet, 150x 3M Reflective Vest"
                  value={formData.itemsSummary}
                  onChange={(e) => setFormData({ ...formData, itemsSummary: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={formData.deliveryStatus}
                    onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Delivered By / Carrier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Faruk (Logistics Officer) or Courier"
                    value={formData.deliveredBy}
                    onChange={(e) => setFormData({ ...formData, deliveredBy: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched via covered van with signed gate pass"
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
                  <span>Record Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
