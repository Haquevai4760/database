import React, { useState, useMemo } from 'react';
import {
  Boxes,
  PlusSquare,
  Search,
  Database,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Tag,
  Lock,
  Unlock,
  Maximize2,
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Menu,
  History,
  TrendingUp,
  Camera,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { ProductItem, PriceHistoryRecord, UserRole } from '../../types';
import { api } from '../../lib/api';

interface InputFormViewProps {
  products: ProductItem[];
  userRole: UserRole;
  onRefresh: () => void;
  onNavigateToHistory: () => void;
  onNavigateToStats?: () => void;
}

export const InputFormView: React.FC<InputFormViewProps> = ({
  products,
  userRole,
  onRefresh,
  onNavigateToHistory,
}) => {
  // Top Navigation Tabs: 'entry' | 'search' | 'history' | 'stats'
  const [activeTab, setActiveTab] = useState<'entry' | 'search' | 'history' | 'stats'>('entry');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Collapsible section state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Form Fields
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);

  const [itemName, setItemName] = useState('');
  const [codeNo, setCodeNo] = useState('');
  const [isCodeLocked, setIsCodeLocked] = useState(true);
  const [brandName, setBrandName] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [category, setCategory] = useState('General');
  const [productImageFileId, setProductImageFileId] = useState('');

  // Auto-suggest dropdown when typing item name
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  // Status indicators
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'ছবি ৮ মেগাবাইটের বেশি হতে পারবে না।' });
      return;
    }

    setIsUploadingImage(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await api.uploadProductImage(base64Data, file.name, file.type);
        setProductImageFileId(res.fileId);
        setFeedback({
          type: 'success',
          message: 'ছবি সফলভাবে Google Drive এ আপলোড হয়েছে!',
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: `ছবি আপলোড ব্যর্থ হয়েছে: ${err.message}`,
        });
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Item name suggestions
  const itemSuggestions = useMemo(() => {
    if (!itemName || itemName.length < 2) return [];
    return products
      .filter((p) => p.itemName.toLowerCase().includes(itemName.toLowerCase()))
      .slice(0, 6);
  }, [products, itemName]);

  // Handle Search
  const handlePerformSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    const query = searchTerm.toLowerCase().trim();
    const results = products.filter(
      (p) =>
        p.itemName.toLowerCase().includes(query) ||
        p.codeNo.toLowerCase().includes(query) ||
        p.brandName.toLowerCase().includes(query) ||
        p.size.toLowerCase().includes(query)
    );
    setSearchResults(results);
    setHasSearched(true);
  };

  // Populate form with existing item
  const handleSelectProduct = (p: ProductItem) => {
    setIsEditingExisting(true);
    setOriginalPrice(p.unitPrice);
    setItemName(p.itemName);
    setCodeNo(p.codeNo);
    setIsCodeLocked(true);
    setBrandName(p.brandName || '');
    setSize(p.size || '');
    setUnit(p.unit || 'Pcs');
    setUnitPrice(p.unitPrice.toString());
    setRemark(p.remark || '');
    setCategory(p.category || 'General');
    setProductImageFileId(p.productImageFileId || '');
    setShowItemSuggestions(false);
    setActiveTab('entry');
    setIsFormCollapsed(false);
    setFeedback({
      type: 'success',
      message: `Loaded "${p.itemName}" [${p.codeNo}] for price/details update.`,
    });
  };

  // Clear Form
  const handleClear = () => {
    setIsEditingExisting(false);
    setOriginalPrice(null);
    setItemName('');
    setCodeNo('');
    setIsCodeLocked(false);
    setBrandName('');
    setSize('');
    setUnit('');
    setUnitPrice('');
    setRemark('');
    setCategory('General');
    setProductImageFileId('');
    setShowItemSuggestions(false);
    setFeedback(null);
  };

  // Submit Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!itemName.trim()) {
      setFeedback({ type: 'error', message: 'Item Name is required.' });
      return;
    }

    const priceNum = parseFloat(unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid Unit Price in Taka (৳).' });
      return;
    }

    let finalCode = codeNo.trim().toUpperCase();
    if (!finalCode) {
      // Auto-generate code if empty
      const prefix = itemName.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'IT');
      finalCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      setCodeNo(finalCode);
    }

    setIsSubmitting(true);

    try {
      if (isEditingExisting) {
        // Update product
        await api.updateProduct(finalCode, {
          itemName: itemName.trim(),
          brandName: brandName.trim(),
          size: size.trim(),
          unit: unit || 'Pcs',
          unitPrice: priceNum,
          remark: remark.trim() || (originalPrice !== priceNum ? 'Unit price updated' : 'Details updated'),
          category: category.trim(),
          productImageFileId,
        });

        setFeedback({
          type: 'success',
          message: `Item [${finalCode}] updated successfully! Price change recorded in Price History.`,
        });
      } else {
        // Create new product
        await api.createProduct({
          itemName: itemName.trim(),
          codeNo: finalCode,
          brandName: brandName.trim(),
          size: size.trim(),
          unit: unit || 'Pcs',
          unitPrice: priceNum,
          remark: remark.trim() || 'Initial catalog entry',
          category: category.trim(),
          productImageFileId,
        });

        setFeedback({
          type: 'success',
          message: `New item [${finalCode}] saved to Price Database!`,
        });
      }

      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save item to database.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalItems = products.length;
  const uniqueBrandsCount = new Set(products.map((p) => p.brandName).filter(Boolean)).size;
  const totalValue = products.reduce((acc, p) => acc + (p.unitPrice || 0), 0);
  const avgPrice = totalItems > 0 ? Math.round(totalValue / totalItems) : 0;

  return (
    <div className="mx-auto max-w-md w-full space-y-4 pb-12">
      {/* Mobile-Styled Header matching screenshot */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md shadow-inner ring-1 ring-white/20">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-white">
                Price Database
              </h1>
              <p className="text-xs text-blue-200 font-medium">Input Form</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white/80">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full ring-1 ring-emerald-400/30">
              Live
            </span>
          </div>
        </div>

        {/* 4 Navigation Cards matching screenshot: Entry, Search, History, Stats */}
        <div className="grid grid-cols-4 gap-2 bg-slate-50/10 p-2.5 backdrop-blur-md border-t border-white/10">
          {/* Entry Tab */}
          <button
            onClick={() => setActiveTab('entry')}
            className={`flex flex-col items-center justify-center rounded-2xl py-2.5 px-1 transition cursor-pointer ${
              activeTab === 'entry'
                ? 'bg-blue-100 text-blue-800 font-bold shadow-md shadow-blue-900/20 dark:bg-blue-950 dark:text-blue-300 ring-2 ring-blue-500/30'
                : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-900/80 dark:text-slate-300'
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeTab === 'entry' ? 'bg-blue-600 text-white' : 'text-blue-600'}`}>
              <PlusSquare className="h-4 w-4" />
            </div>
            <span className="mt-1 text-[11px] font-semibold">Entry</span>
          </button>

          {/* Search Tab */}
          <button
            onClick={() => {
              setActiveTab('search');
              document.getElementById('searchInputField')?.focus();
            }}
            className={`flex flex-col items-center justify-center rounded-2xl py-2.5 px-1 transition cursor-pointer ${
              activeTab === 'search'
                ? 'bg-blue-100 text-blue-800 font-bold shadow-md shadow-blue-900/20 dark:bg-blue-950 dark:text-blue-300 ring-2 ring-blue-500/30'
                : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-900/80 dark:text-slate-300'
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeTab === 'search' ? 'bg-blue-600 text-white' : 'text-blue-600'}`}>
              <Search className="h-4 w-4" />
            </div>
            <span className="mt-1 text-[11px] font-semibold">Search</span>
          </button>

          {/* History Tab */}
          <button
            onClick={onNavigateToHistory}
            className={`flex flex-col items-center justify-center rounded-2xl py-2.5 px-1 transition cursor-pointer bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-900/80 dark:text-slate-300`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-600">
              <Database className="h-4 w-4" />
            </div>
            <span className="mt-1 text-[11px] font-semibold">History</span>
          </button>

          {/* Stats Tab */}
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center rounded-2xl py-2.5 px-1 transition cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-blue-100 text-blue-800 font-bold shadow-md shadow-blue-900/20 dark:bg-blue-950 dark:text-blue-300 ring-2 ring-blue-500/30'
                : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-900/80 dark:text-slate-300'
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-blue-600'}`}>
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="mt-1 text-[11px] font-semibold">Stats</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-xs font-medium animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed">{feedback.message}</div>
        </div>
      )}

      {/* Card 1: Search Item Card matching screenshot */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/40 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800 dark:text-white">
          <Search className="h-4 w-4 text-blue-600" />
          <span>Search Item</span>
        </div>

        <form onSubmit={handlePerformSearch} className="flex gap-2">
          <input
            id="searchInputField"
            type="text"
            placeholder="Item Name / Code / Brand / Size"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Search Results Display */}
        {hasSearched && (
          <div className="mt-3 divide-y divide-blue-100 rounded-xl bg-white p-2 border border-blue-100 dark:divide-slate-800 dark:bg-slate-950 dark:border-slate-800 max-h-52 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((p) => (
                <div
                  key={p.codeNo}
                  onClick={() => handleSelectProduct(p)}
                  className="p-2 hover:bg-blue-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer flex items-center justify-between text-xs transition gap-2"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {p.productImageFileId ? (
                      <img
                        src={`https://lh3.googleusercontent.com/d/${p.productImageFileId}=s100`}
                        alt=""
                        className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 shrink-0">
                        <Boxes className="h-4 w-4" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {p.itemName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        [{p.codeNo}] {p.brandName} • {p.size || p.unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-blue-700 dark:text-blue-400">
                      ৳ {p.unitPrice.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">Tap to load</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-3 text-center text-xs text-slate-400">
                No items matched "{searchTerm}".
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card 2: Add / Update Item Card matching screenshot */}
      {activeTab !== 'stats' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {/* Card Header with Green Plus & Badge */}
          <div
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            className="flex items-center justify-between p-4 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                <PlusSquare className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {isEditingExisting ? 'Update Item' : 'Add / Update Item'}
              </span>
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                {isEditingExisting ? 'Edit' : 'New'}
              </span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {isFormCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>

          {/* Collapsible Content */}
          {!isFormCollapsed && (
            <form onSubmit={handleSaveItem} className="p-4 space-y-3.5">
              {/* Item Name * with Tag icon */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Type item name to search..."
                    value={itemName}
                    onChange={(e) => {
                      setItemName(e.target.value);
                      setShowItemSuggestions(true);
                    }}
                    onFocus={() => setShowItemSuggestions(true)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Autocomplete suggestions dropdown */}
                {showItemSuggestions && itemSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                    <div className="bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-900">
                      Existing Catalog Matches (Tap to load):
                    </div>
                    {itemSuggestions.map((item) => (
                      <div
                        key={item.codeNo}
                        onClick={() => handleSelectProduct(item)}
                        className="px-3.5 py-2 text-xs hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate mr-2">
                          {item.itemName}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                          [{item.codeNo}] ৳{item.unitPrice}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 2: Code No. & Brand Name */}
              <div className="grid grid-cols-2 gap-3">
                {/* Code No. */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Code No.
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCodeLocked(!isCodeLocked)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isCodeLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                  <div className="relative">
                    {isCodeLocked ? (
                      <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    ) : (
                      <Unlock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
                    )}
                    <input
                      type="text"
                      disabled={isCodeLocked && Boolean(codeNo)}
                      placeholder={codeNo ? codeNo : 'Select first'}
                      value={codeNo}
                      onChange={(e) => setCodeNo(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-950"
                    />
                  </div>
                </div>

                {/* Brand Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand Name
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Brand name"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Size & Unit */}
              <div className="grid grid-cols-2 gap-3">
                {/* Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Size
                  </label>
                  <div className="relative">
                    <Maximize2 className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter size"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Select Unit --</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Pair">Pair</option>
                    <option value="Set">Set</option>
                    <option value="Doz">Doz</option>
                    <option value="Box">Box</option>
                    <option value="Kg">Kg</option>
                    <option value="Mtr">Mtr</option>
                    <option value="Cylinder">Cylinder</option>
                    <option value="Roll">Roll</option>
                  </select>
                </div>
              </div>

              {/* Unit Price * with ৳ Taka symbol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unit Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-600 dark:text-slate-300">
                    ৳
                  </span>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    required
                    placeholder="0.00"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {isEditingExisting && originalPrice !== null && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Current price in catalog: <strong>৳ {originalPrice.toLocaleString()}</strong>
                  </p>
                )}
              </div>

              {/* Remark */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remark
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="Enter remark (optional)"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Product Image Upload with Camera / File selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Image (ছবি আপলোড / ক্যামেরা)
                </label>
                <div className="flex items-center gap-2.5">
                  <label className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/60 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 cursor-pointer transition">
                    {isUploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <Camera className="h-4 w-4 text-blue-600" />
                    )}
                    <span>{isUploadingImage ? 'গুগল ড্রাইভে আপলোড হচ্ছে...' : 'ছবি তুলুন বা ফাইল বাছুন'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>

                  {productImageFileId && (
                    <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-sm">
                      <img
                        src={`https://lh3.googleusercontent.com/d/${productImageFileId}=s200`}
                        alt="Product"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setProductImageFileId('')}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 shadow cursor-pointer"
                        title="Remove image"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
                {productImageFileId && (
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    ✓ ড্রাইভ ফাইল আইডি: {productImageFileId.substring(0, 16)}...
                  </p>
                )}
              </div>

              {/* Action Buttons: Save Item & Clear matching screenshot */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Item</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  <span className="text-amber-500 text-sm">🧹</span>
                  <span>Clear</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Card 3: Stats View when Stats tab is selected */}
      {activeTab === 'stats' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Price Database Quick Stats
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('entry')}
              className="text-xs text-blue-600 font-semibold cursor-pointer"
            >
              Back to Form
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <span className="text-slate-500">Total Products</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white font-mono">
                {totalItems}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <span className="text-slate-500">Unique Brands</span>
              <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
                {uniqueBrandsCount}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <span className="text-slate-500">Average Unit Price</span>
              <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ৳ {avgPrice.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <span className="text-slate-500">Catalog Valuation</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white font-mono">
                ৳ {totalValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
