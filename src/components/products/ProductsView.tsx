import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Image as ImageIcon,
  History,
  Upload,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Smartphone,
  PlusSquare,
} from 'lucide-react';
import { ProductItem, UserRole } from '../../types';
import { api } from '../../lib/api';

interface ProductsViewProps {
  products: ProductItem[];
  userRole: UserRole;
  onRefresh: () => void;
  onViewPriceHistoryForCode?: (code: string) => void;
  onNavigateToHistory: () => void;
  onNavigateToInputForm?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  userRole,
  onRefresh,
  onViewPriceHistoryForCode,
  onNavigateToHistory,
  onNavigateToInputForm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    codeNo: '',
    brandName: '',
    size: '',
    unit: 'Pcs',
    unitPrice: 0,
    remark: '',
    category: 'General',
    productImageFileId: '',
  });
  const [priceChangeRemark, setPriceChangeRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Filters setup
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brandName).filter(Boolean)));
  }, [products]);

  const uniqueUnits = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.unit).filter(Boolean)));
  }, [products]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  // Filtered & Searched products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.size.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBrand = !brandFilter || p.brandName === brandFilter;
      const matchUnit = !unitFilter || p.unit === unitFilter;
      const matchCategory = !categoryFilter || p.category === categoryFilter;

      return matchSearch && matchBrand && matchUnit && matchCategory;
    });
  }, [products, searchTerm, brandFilter, unitFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => {
    setFormData({
      itemName: '',
      codeNo: '',
      brandName: '',
      size: '',
      unit: 'Pcs',
      unitPrice: 0,
      remark: '',
      category: 'General',
      productImageFileId: '',
    });
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setFormData({
      itemName: product.itemName,
      codeNo: product.codeNo,
      brandName: product.brandName,
      size: product.size,
      unit: product.unit,
      unitPrice: product.unitPrice,
      remark: product.remark,
      category: product.category || 'General',
      productImageFileId: product.productImageFileId || '',
    });
    setPriceChangeRemark('');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFormError('Image size cannot exceed 8MB.');
      return;
    }

    setIsUploadingImage(true);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const uploadResult = await api.uploadProductImage(base64Data, file.name, file.type);
        setFormData((prev) => ({
          ...prev,
          productImageFileId: uploadResult.fileId,
        }));
        setFormSuccess('Image uploaded to Google Drive!');
      } catch (err: any) {
        setFormError(`Image upload failed: ${err.message}`);
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.itemName.trim() || !formData.codeNo.trim()) {
      setFormError('Item Name and Product Code No. are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        // Edit flow
        const remarkToSave =
          formData.unitPrice !== editingProduct.unitPrice
            ? (priceChangeRemark.trim() || 'Unit price revision')
            : formData.remark;

        await api.updateProduct(editingProduct.codeNo, {
          ...formData,
          remark: remarkToSave,
        });
        setFormSuccess('Product and price history updated successfully!');
        setTimeout(() => {
          setEditingProduct(null);
          onRefresh();
        }, 600);
      } else {
        // Add flow
        await api.createProduct(formData);
        setFormSuccess('New product added to Price Database!');
        setTimeout(() => {
          setIsAddModalOpen(false);
          onRefresh();
        }, 600);
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Product Price Database
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connected to <strong>Price Database</strong> sheet. All changes audited in <strong>Price History</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToInputForm && (
            <button
              onClick={onNavigateToInputForm}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 transition cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5 text-blue-600" />
              <span>Mobile Input Form</span>
            </button>
          )}
          <button
            onClick={onNavigateToHistory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-blue-600" />
            <span>View Price History</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Item Name, Code No, Brand, Size..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All Brands ({uniqueBrands.length})</option>
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All Units</option>
            {uniqueUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur text-slate-500 border-b border-slate-200 dark:bg-slate-800/95 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Image</th>
                <th className="px-4 py-3 font-semibold">Code No.</th>
                <th className="px-4 py-3 font-semibold">Item Name</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Last Updated</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentProducts.length > 0 ? (
                currentProducts.map((p) => {
                  const hasDriveImage = Boolean(p.productImageFileId);
                  const imageUrl = hasDriveImage
                    ? `https://lh3.googleusercontent.com/d/${p.productImageFileId}=s200`
                    : null;

                  return (
                    <tr
                      key={p.codeNo}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Image Thumbnail */}
                      <td className="px-4 py-3">
                        {imageUrl ? (
                          <button
                            onClick={() =>
                              setPreviewImage({
                                url: `https://lh3.googleusercontent.com/d/${p.productImageFileId}=s1200`,
                                title: p.itemName,
                              })
                            }
                            className="group relative h-9 w-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-700 cursor-pointer"
                          >
                            <img
                              src={imageUrl}
                              alt={p.itemName}
                              className="h-full w-full object-cover group-hover:scale-110 transition"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </button>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </td>

                      {/* Code No */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {p.codeNo}
                      </td>

                      {/* Item Name */}
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 max-w-xs">
                        <div className="truncate" title={p.itemName}>
                          {p.itemName}
                        </div>
                        {p.remark && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5" title={p.remark}>
                            {p.remark}
                          </div>
                        )}
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {p.brandName || '—'}
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {p.size || '—'}
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {p.unit}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        BDT {p.unitPrice.toLocaleString()}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {p.category || 'General'}
                      </td>

                      {/* Updated Date */}
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {p.updatedDate || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product & Update Price"
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs text-slate-400">
                    No products matched your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min(currentPage * itemsPerPage, filteredProducts.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {filteredProducts.length}
            </span>{' '}
            products
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-800 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-800 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProduct ? `Edit Product: ${editingProduct.codeNo}` : 'Add New Product to Database'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code No */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code No. *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingProduct)}
                    placeholder="e.g. SH-HD-001"
                    value={formData.codeNo}
                    onChange={(e) => setFormData({ ...formData, codeNo: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 uppercase font-mono disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-950"
                  />
                  {!editingProduct && (
                    <span className="text-[10px] text-slate-400">Must be unique across the catalog</span>
                  )}
                </div>

                {/* Brand Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MSA Safety, 3M, Caterpillar"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Industrial Safety Helmet - Class E (Heavy Duty)"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. XL, 14 Inch, Standard"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
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

                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Price (BDT) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Category (Column I) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category / Classification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Safety Gear, PPE, Eye Protection, Fire Safety"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* If editing and price has changed, prompt for price change remark */}
              {editingProduct && formData.unitPrice !== editingProduct.unitPrice && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    <span>Price Change Detected</span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    Previous Price: <strong>BDT {editingProduct.unitPrice}</strong> &rarr; New Price:{' '}
                    <strong>BDT {formData.unitPrice}</strong> (Difference:{' '}
                    <strong>{formData.unitPrice - editingProduct.unitPrice > 0 ? '+' : ''}{formData.unitPrice - editingProduct.unitPrice}</strong>)
                  </p>
                  <div className="mt-2">
                    <label className="block font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Reason for price change (recorded in Price History):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Raw material cost increase, revised tariff"
                      value={priceChangeRemark}
                      onChange={(e) => setPriceChangeRemark(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-amber-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Remark */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remark / Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. EN397 standard certified with chin strap"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Product Image File ID & Upload */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-emerald-600" />
                    <span>Product Image (Google Drive)</span>
                  </span>
                  {formData.productImageFileId && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      File ID: {formData.productImageFileId.substring(0, 14)}...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    {isUploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="h-4 w-4 text-emerald-600" />
                    )}
                    <span>{isUploadingImage ? 'Uploading to Drive...' : 'Upload Image to Drive'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>

                  <div className="text-[11px] text-slate-400">
                    Or paste Drive File ID:
                  </div>
                  <input
                    type="text"
                    placeholder="1A2B3C..."
                    value={formData.productImageFileId}
                    onChange={(e) => setFormData({ ...formData, productImageFileId: e.target.value.trim() })}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingProduct ? 'Save & Update History' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                {previewImage.title}
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[70vh] w-auto rounded-lg object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
