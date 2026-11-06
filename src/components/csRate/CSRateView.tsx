import React, { useState } from 'react';
import {
  GitCompare,
  Plus,
  Search,
  CheckCircle2,
  X,
  TrendingDown,
  Loader2,
  Building,
} from 'lucide-react';
import { CSRateRecord, ProductItem } from '../../types';
import { api } from '../../lib/api';

interface CSRateViewProps {
  rates: CSRateRecord[];
  products: ProductItem[];
  onRefresh: () => void;
}

export const CSRateView: React.FC<CSRateViewProps> = ({ rates, products, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    codeNo: '',
    itemName: '',
    brand: '',
    vendorA: '',
    rateA: 0,
    vendorB: '',
    rateB: 0,
    vendorC: '',
    rateC: 0,
    remarks: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectProduct = (code: string) => {
    const prod = products.find((p) => p.codeNo === code);
    if (prod) {
      setFormData({
        ...formData,
        codeNo: prod.codeNo,
        itemName: prod.itemName,
        brand: prod.brandName,
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || !formData.codeNo) {
      setErrorMsg('Item Name and Code No are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.createCSRate(formData);
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add CS Rate comparison.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRates = rates.filter(
    (r) =>
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.codeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.recommendedVendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Comparative Statement (CS Rate)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Connected to <strong>CS Rate</strong> sheet. Compare multi-vendor quotations, analyze lowest rates, and record procurement recommendations.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              codeNo: '',
              itemName: '',
              brand: '',
              vendorA: '',
              rateA: 0,
              vendorB: '',
              rateB: 0,
              vendorC: '',
              rateC: 0,
              remarks: '',
            });
            setErrorMsg(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New CS Comparison</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search CS comparisons by Item, Code, Recommended Supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* CS Rates Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Code No.</th>
                <th className="px-4 py-3 font-semibold">Item & Brand</th>
                <th className="px-4 py-3 font-semibold">Vendor A</th>
                <th className="px-4 py-3 font-semibold">Vendor B</th>
                <th className="px-4 py-3 font-semibold">Vendor C</th>
                <th className="px-4 py-3 font-semibold text-right">Lowest Rate</th>
                <th className="px-4 py-3 font-semibold">Recommended Vendor</th>
                <th className="px-4 py-3 font-semibold">Procurement Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRates.length > 0 ? (
                filteredRates.map((r, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {r.codeNo}
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 max-w-xs">
                      <div>{r.itemName}</div>
                      {r.brand && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Brand: {r.brand}</div>
                      )}
                    </td>

                    {/* Vendor A */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {r.vendorA || '—'}
                      </div>
                      {r.rateA > 0 && (
                        <div
                          className={`font-mono text-[11px] ${
                            r.rateA === r.lowestRate
                              ? 'text-emerald-600 font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          BDT {r.rateA.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Vendor B */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {r.vendorB || '—'}
                      </div>
                      {r.rateB > 0 && (
                        <div
                          className={`font-mono text-[11px] ${
                            r.rateB === r.lowestRate
                              ? 'text-emerald-600 font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          BDT {r.rateB.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Vendor C */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {r.vendorC || '—'}
                      </div>
                      {r.rateC > 0 && (
                        <div
                          className={`font-mono text-[11px] ${
                            r.rateC === r.lowestRate
                              ? 'text-emerald-600 font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          BDT {r.rateC.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Lowest Rate */}
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <TrendingDown className="h-3 w-3" />
                        BDT {r.lowestRate.toLocaleString()}
                      </span>
                    </td>

                    {/* Recommended Vendor */}
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{r.recommendedVendor || '—'}</span>
                      </div>
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs">
                      <div className="truncate" title={r.remarks}>
                        {r.remarks || '—'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">
                    No CS rate comparisons recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add CS Rate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                New Comparative Statement (CS Rate)
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
              {/* Product selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Product from Price Database (or fill below)
                </label>
                <select
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.codeNo} value={p.codeNo}>
                      [{p.codeNo}] {p.itemName} ({p.brandName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.codeNo}
                    onChange={(e) => setFormData({ ...formData, codeNo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Vendors A, B, C */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Supplier / Vendor Bids
                </span>

                {/* Vendor A */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder="Vendor A Company Name"
                    value={formData.vendorA}
                    onChange={(e) => setFormData({ ...formData, vendorA: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Rate A (BDT)"
                    value={formData.rateA || ''}
                    onChange={(e) => setFormData({ ...formData, rateA: parseFloat(e.target.value) || 0 })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Vendor B */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder="Vendor B Company Name"
                    value={formData.vendorB}
                    onChange={(e) => setFormData({ ...formData, vendorB: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Rate B (BDT)"
                    value={formData.rateB || ''}
                    onChange={(e) => setFormData({ ...formData, rateB: parseFloat(e.target.value) || 0 })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Vendor C */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder="Vendor C Company Name"
                    value={formData.vendorC}
                    onChange={(e) => setFormData({ ...formData, vendorC: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Rate C (BDT)"
                    value={formData.rateC || ''}
                    onChange={(e) => setFormData({ ...formData, rateC: parseFloat(e.target.value) || 0 })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Procurement Decision Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Vendor B selected based on lowest quote with immediate dispatch guarantee"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  <span>Save Comparative Statement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
