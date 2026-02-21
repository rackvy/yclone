import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { productsApi, Product, formatRubles } from '../api/products';
import { branchesApi, Branch } from '../api/branches';

interface ProductFormData {
  name: string;
  sku: string;
  price: number;
  stockQty: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    price: 0,
    stockQty: 0,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const branchesData = await branchesApi.list();
      setBranches(branchesData);
      
      const savedBranchId = localStorage.getItem('selectedBranchId');
      const branchId = savedBranchId || branchesData[0]?.id;
      
      if (branchId) {
        const productsData = await productsApi.list(branchId);
        setProducts(productsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getBranchName = (branchId: string | undefined) => {
    if (!branchId) return 'Не назначен';
    return branches.find(b => b.id === branchId)?.name || 'Неизвестно';
  };

  const openModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      price: 0,
      stockQty: 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      price: product.price || 0,
      stockQty: product.stockQty || 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите название товара');
      return;
    }

    try {
      setSaving(true);
      const savedBranchId = localStorage.getItem('selectedBranchId');
      if (editingProduct) {
        await productsApi.update(editingProduct.id, {
          name: formData.name.trim(),
          sku: formData.sku.trim() || undefined,
          price: formData.price || 0,
          stockQty: formData.stockQty || 0,
        });
      } else {
        await productsApi.create({
          name: formData.name.trim(),
          sku: formData.sku.trim() || undefined,
          price: formData.price || 0,
          stockQty: formData.stockQty || 0,
          branchId: savedBranchId || branches[0]?.id || '',
        });
      }
      await loadData();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Удалить товар "${product.name}"?`)) return;
    try {
      await productsApi.delete(product.id);
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <Layout>
      <div className="h-full flex">
        {/* Left side - Products list */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Товары</h1>
              <button 
                onClick={openModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Добавить
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Поиск по названию, артикулу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Products list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Загрузка...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Товары не найдены</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedProduct?.id === product.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <p className="font-medium text-gray-900">{product.name}</p>
                    {product.sku && (
                      <p className="text-xs text-gray-500 mt-1">Артикул: {product.sku}</p>
                    )}
                    <p className="text-sm font-medium text-primary mt-1">
                      {formatRubles(product.price || 0)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Product details */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedProduct ? (
            <div className="p-6 max-w-4xl">
              {/* Product header */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                    {selectedProduct.sku && (
                      <p className="text-sm text-gray-500 mt-1">Артикул: {selectedProduct.sku}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">storefront</span>
                        {getBranchName(selectedProduct.branchId)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(selectedProduct)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Редактировать
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedProduct)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-bold text-lg">Цена</h3>
                </div>
                <div className="p-4">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-gray-500">Цена продажи</p>
                    <p className="text-xl font-bold text-primary">
                      {selectedProduct.price 
                        ? formatRubles(selectedProduct.price)
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-bold text-lg">Остаток на складе</h3>
                </div>
                <div className="p-4">
                  <div className={`p-4 rounded-lg ${selectedProduct.stockQty === 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className="text-sm text-gray-500">Количество</p>
                    <p className={`text-xl font-bold ${selectedProduct.stockQty === 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {selectedProduct.stockQty} шт
                    </p>
                    {selectedProduct.stockQty === 0 && (
                      <p className="text-xs text-red-500 mt-1">Нет в наличии</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
                <p>Выберите товар для просмотра деталей</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">
                  {editingProduct ? 'Редактировать товар' : 'Новый товар'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-800">{formError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Название <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Шампунь профессиональный"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Артикул</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="SKU-12345"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Количество</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockQty}
                      onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
