import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { PriceHistoryRecord } from '../../types';

interface PriceHistoryViewProps {
  history: PriceHistoryRecord[];
  onNavigateToProducts: () => void;
}

export const PriceHistoryView: React.FC<PriceHistoryViewProps> = ({
  history,
  onNavigateToProducts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const matchSearch =
        h.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.codeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.updatedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.remark.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDate = !dateFilter || h.updateDate.startsWith(dateFilter);

      return matchSearch && matchDate;
    });
  }, [history, searchTerm, dateFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Price Revision History Log
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized with <strong>Price History</strong> sheet. Permanent audit trail of every price change.
          </p>
        </div>

        <button
          onClick={onNavigateToProducts}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <span>Back to Price Database</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search price revisions by Code No, Item Name, Editor Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="sm:w-56">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur text-slate-500 border-b border-slate-200 dark:bg-slate-800/95 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Update Date</th>
                <th className="px-4 py-3 font-semibold">Code No.</th>
                <th className="px-4 py-3 font-semibold">Item Name</th>
                <th className="px-4 py-3 font-semibold">Brand & Size</th>
                <th className="px-4 py-3 font-semibold text-right">Previous Price</th>
                <th className="px-4 py-3 font-semibold text-right">New Price</th>
                <th className="px-4 py-3 font-semibold text-center">Difference</th>
                <th className="px-4 py-3 font-semibold">Remark / Justification</th>
                <th className="px-4 py-3 font-semibold">Updated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item, idx) => {
                  const diff = item.newPrice - item.previousPrice;
                  const isIncrease = diff > 0 && item.previousPrice > 0;
                  const isDecrease = diff < 0;
                  const isInitial = item.previousPrice === 0;

                  return (
                    <tr
                      key={item.id || `${item.codeNo}-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.updateDate}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {item.codeNo}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 max-w-xs">
                        <div className="truncate" title={item.itemName}>
                          {item.itemName}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        {item.brandName || '—'}{item.size ? ` • ${item.size}` : ''}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                        {item.previousPrice > 0 ? `BDT ${item.previousPrice.toLocaleString()}` : '— (Initial)'}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        BDT {item.newPrice.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isInitial ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            New Item
                          </span>
                        ) : isIncrease ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            <ArrowUpRight className="h-3 w-3" />
                            +BDT {diff.toLocaleString()}
                          </span>
                        ) : isDecrease ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <ArrowDownRight className="h-3 w-3" />
                            -BDT {Math.abs(diff).toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Minus className="h-3 w-3" />
                            No Change
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-sm">
                        <div className="truncate" title={item.remark}>
                          {item.remark || 'Price adjusted'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{item.updatedBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-400">
                    No price history records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
