import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  X,
  Trash2,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { QuotationRecord, ProductItem, QuotationLineItem } from '../../types';
import { api } from '../../lib/api';

interface QuotationViewProps {
  quotations: QuotationRecord[];
  products: ProductItem[];
  onRefresh: () => void;
}

export const QuotationView: React.FC<QuotationViewProps> = ({
  quotations,
  products,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<QuotationRecord | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(7.5);
  const [notes, setNotes] = useState('Quotation valid for 30 calendar days from issue date.');
  const [selectedItems, setSelectedItems] = useState<QuotationLineItem[]>([]);

  // Item Picker
  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectProductChange = (code: string) => {
    setSelectedProductCode(code);
    const prod = products.find((p) => p.codeNo === code);
    if (prod) {
      setItemUnitPrice(prod.unitPrice);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductCode) return;
    const prod = products.find((p) => p.codeNo === selectedProductCode);
    if (!prod) return;

    const existingIndex = selectedItems.findIndex((it) => it.codeNo === selectedProductCode);
    if (existingIndex !== -1) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += Number(itemQuantity);
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setSelectedItems(updated);
    } else {
      const newItem: QuotationLineItem = {
        codeNo: prod.codeNo,
        itemName: prod.itemName,
        brandName: prod.brandName,
        size: prod.size,
        unit: prod.unit,
        unitPrice: Number(itemUnitPrice) || prod.unitPrice,
        quantity: Number(itemQuantity) || 1,
        total: (Number(itemQuantity) || 1) * (Number(itemUnitPrice) || prod.unitPrice),
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    // Reset picker
    setSelectedProductCode('');
    setItemQuantity(1);
    setItemUnitPrice(0);
  };

  const handleRemoveItem = (codeNo: string) => {
    setSelectedItems(selectedItems.filter((i) => i.codeNo !== codeNo));
  };

  // Calculations
  const subtotal = selectedItems.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100;
  const grandTotal = Math.max(0, Math.round(subtotal - discountAmount + taxAmount));

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Customer / Client Name is required.');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('Please add at least one product item to the quotation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newQ = await api.createQuotation({
        customerName: customerName.trim(),
        customerContact: customerContact.trim(),
        items: selectedItems,
        discount: discountAmount,
        taxRate,
        notes,
      });

      setIsCreateModalOpen(false);
      onRefresh();
      setViewingQuotation(newQ);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuotations = quotations.filter(
    (q) =>
      q.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Commercial Quotations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Connected to <strong>Quotation</strong> sheet. Create, calculate, print, and track client proposals.
          </p>
        </div>

        <button
          onClick={() => {
            setCustomerName('');
            setCustomerContact('');
            setSelectedItems([]);
            setDiscountAmount(0);
            setErrorMsg(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Generate New Quotation</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations by Quotation No, Customer, Prepared By..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Quotations List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Quotation No.</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer / Organization</th>
                <th className="px-4 py-3 font-semibold text-right">Subtotal</th>
                <th className="px-4 py-3 font-semibold text-right">Grand Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Prepared By</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredQuotations.length > 0 ? (
                filteredQuotations.map((q) => (
                  <tr
                    key={q.quotationNo}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {q.quotationNo}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {q.date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 max-w-xs">
                      <div className="truncate">{q.customerName}</div>
                      {q.customerContact && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {q.customerContact}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      BDT {q.subtotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      BDT {q.grandTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          q.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : q.status === 'Sent'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[130px]">
                      {q.createdBy}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewingQuotation(q)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Printer className="h-3 w-3 text-emerald-600" />
                        <span>Print / View</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">
                    No quotations generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Quotation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Commercial Quotation
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
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

            <form onSubmit={handleCreateQuotation} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Petrochemical Complex Ltd."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person & Phone / Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eng. Karim | +880 1711-000000"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Product Picker Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Add Product from Price Database
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductCode}
                      onChange={(e) => handleSelectProductChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">-- Choose Catalog Product --</option>
                      {products.map((p) => (
                        <option key={p.codeNo} value={p.codeNo}>
                          [{p.codeNo}] {p.itemName} (BDT {p.unitPrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductCode}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected Line Items Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Item Description</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedItems.length > 0 ? (
                      selectedItems.map((it) => (
                        <tr key={it.codeNo}>
                          <td className="px-3 py-2 font-medium">
                            {it.itemName}{' '}
                            <span className="font-mono text-[10px] text-slate-400">({it.codeNo})</span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">{it.unit}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            BDT {it.unitPrice.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold">
                            {it.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">
                            BDT {it.total.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.codeNo)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">
                          No items added yet. Select products above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Terms & Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="w-full sm:w-80 rounded-xl bg-slate-50 p-4 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">BDT {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Discount (BDT):</span>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 text-right rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>VAT / Tax (%):</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-24 text-right rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      BDT {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedItems.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Generate Quotation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Quotation View Modal */}
      {viewingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
            {/* Header controls (hidden in print) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Quotation Preview & Print Document
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setViewingQuotation(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 bg-white text-slate-900 rounded-xl space-y-6">
              {/* Org Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    ENTERPRISE INDUSTRIAL SUPPLIES LTD.
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Corporate Head Office • Dhaka, Bangladesh • Tel: +880 2 988-1234
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Official Quotation & Pro-Forma Estimate
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                    {viewingQuotation.quotationNo}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Date: <strong>{viewingQuotation.date}</strong>
                  </div>
                </div>
              </div>

              {/* Client info */}
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <div className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  Quotation Prepared For:
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {viewingQuotation.customerName}
                </div>
                {viewingQuotation.customerContact && (
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    {viewingQuotation.customerContact}
                  </div>
                )}
              </div>

              {/* Table of items */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Item Description</th>
                    <th className="p-2 border">Code</th>
                    <th className="p-2 border">Unit</th>
                    <th className="p-2 border text-right">Unit Rate</th>
                    <th className="p-2 border text-center">Qty</th>
                    <th className="p-2 border text-right">Total Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingQuotation.items && viewingQuotation.items.length > 0 ? (
                    viewingQuotation.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border text-center">{idx + 1}</td>
                        <td className="p-2 border font-medium">
                          {it.itemName}
                          {it.brandName && (
                            <span className="text-[10px] text-slate-500 block">
                              Brand: {it.brandName} • Size: {it.size || 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border font-mono text-[11px]">{it.codeNo}</td>
                        <td className="p-2 border">{it.unit}</td>
                        <td className="p-2 border text-right font-mono">
                          {it.unitPrice.toLocaleString()}
                        </td>
                        <td className="p-2 border text-center font-bold">{it.quantity}</td>
                        <td className="p-2 border text-right font-mono font-bold">
                          {it.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        Items detailed on work order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals calculation */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">
                      BDT {viewingQuotation.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {viewingQuotation.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span className="font-mono">
                        - BDT {viewingQuotation.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {viewingQuotation.taxRate > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax / VAT ({viewingQuotation.taxRate}%):</span>
                      <span className="font-mono font-semibold">
                        BDT{' '}
                        {(
                          viewingQuotation.grandTotal -
                          (viewingQuotation.subtotal - viewingQuotation.discount)
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-900 pt-2 flex justify-between font-bold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-700">
                      BDT {viewingQuotation.grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 w-44 mx-auto pt-1 font-semibold text-slate-700">
                    Prepared By
                  </div>
                  <div className="text-[10px] text-slate-400">{viewingQuotation.createdBy}</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-44 mx-auto pt-1 font-semibold text-slate-700">
                    Authorized Signatory
                  </div>
                  <div className="text-[10px] text-slate-400">Commercial Division</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
