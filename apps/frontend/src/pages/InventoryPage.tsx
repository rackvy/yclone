import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { productsApi, Product, productCategoriesApi, ProductCategory } from '../api/products';
import { branchesApi, Branch } from '../api/branches';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mass edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMassEditOpen, setIsMassEditOpen] = useState(false);
  const [massEditData, setMassEditData] = useState({
    minStock: '',
    desiredStock: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadData();
    }
  }, [selectedBranchId, selectedCategoryId]);

  const loadBranches = async () => {
    try {
      const data = await branchesApi.list();
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranchId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsApi.list(selectedBranchId, selectedCategoryId || undefined, searchQuery || undefined),
        productCategoriesApi.list(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleMassEdit = async () => {
    if (selectedIds.size === 0) return;
    
    setSaving(true);
    try {
      const updates: Promise<any>[] = [];
      for (const id of selectedIds) {
        const data: any = {};
        if (massEditData.minStock !== '') data.minStock = parseInt(massEditData.minStock);
        if (massEditData.desiredStock !== '') data.desiredStock = parseInt(massEditData.desiredStock);
        
        if (Object.keys(data).length > 0) {
          updates.push(productsApi.update(id, data));
        }
      }
      await Promise.all(updates);
      setIsMassEditOpen(false);
      setSelectedIds(new Set());
      setMassEditData({ minStock: '', desiredStock: '' });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalStock = products.reduce((sum, p) => sum + p.stockQty, 0);
  const totalCost = products.reduce((sum, p) => sum + (p.costPrice || 0) * p.stockQty, 0);
  const totalRetail = products.reduce((sum, p) => sum + p.price * p.stockQty, 0);

  // Low stock products
  const lowStockProducts = products.filter(p => p.minStock > 0 && p.stockQty <= p.minStock);

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Склад</h1>
            <p className="text-sm text-gray-500 mt-1">Управление остатками и инвентаризация</p>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setIsMassEditOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
                Изменить ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase">Всего товаров</p>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase">Всего единиц</p>
            <p className="text-2xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase">Сумма закупа</p>
            <p className="text-2xl font-bold text-blue-600">{totalCost.toLocaleString()} ₽</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase">Сумма розницы</p>
            <p className="text-2xl font-bold text-green-600">{totalRetail.toLocaleString()} ₽</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-orange-500">warning</span>
              <span className="font-medium text-orange-800">Низкий остаток ({lowStockProducts.length} товаров)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <span key={p.id} className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded">
                  {p.name}: {p.stockQty}/{p.minStock}
                </span>
              ))}
              {lowStockProducts.length > 5 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded">
                  +{lowStockProducts.length - 5} ещё
                </span>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="">Все категории</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Найти
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Загрузка...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Нет товаров</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
                  <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase">Остаток</th>
                  <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase">Мин.</th>
                  <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase">Закуп. ₽</th>
                  <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase">Розница ₽</th>
                  <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase">Сумма закупа</th>
                  <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase">Сумма розницы</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const isLowStock = product.minStock > 0 && product.stockQty <= product.minStock;
                  const costTotal = (product.costPrice || 0) * product.stockQty;
                  const retailTotal = product.price * product.stockQty;
                  
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${isLowStock ? 'bg-orange-50' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.sku && <div className="text-xs text-gray-500">SKU: {product.sku}</div>}
                      </td>
                      <td className="p-3 text-sm text-gray-600">{product.category?.name || '-'}</td>
                      <td className={`p-3 text-right font-medium ${isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>
                        {product.stockQty}
                      </td>
                      <td className="p-3 text-right text-sm text-gray-500">{product.minStock || '-'}</td>
                      <td className="p-3 text-right text-sm">{(product.costPrice || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-sm">{product.price.toLocaleString()}</td>
                      <td className="p-3 text-right text-sm font-medium text-blue-600">{costTotal.toLocaleString()}</td>
                      <td className="p-3 text-right text-sm font-medium text-green-600">{retailTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td colSpan={3} className="p-3 text-right">ИТОГО:</td>
                  <td className="p-3 text-right">{totalStock.toLocaleString()}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="p-3 text-right text-blue-600">{totalCost.toLocaleString()} ₽</td>
                  <td className="p-3 text-right text-green-600">{totalRetail.toLocaleString()} ₽</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Mass Edit Modal */}
      {isMassEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">Массовое редактирование ({selectedIds.size} товаров)</h3>
              <button onClick={() => setIsMassEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-500">Оставьте поле пустым, чтобы не изменять</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Минимальный остаток</label>
                <input
                  type="number"
                  min="0"
                  value={massEditData.minStock}
                  onChange={(e) => setMassEditData({ ...massEditData, minStock: e.target.value })}
                  placeholder="Не изменять"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Желаемый остаток</label>
                <input
                  type="number"
                  min="0"
                  value={massEditData.desiredStock}
                  onChange={(e) => setMassEditData({ ...massEditData, desiredStock: e.target.value })}
                  placeholder="Не изменять"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setIsMassEditOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleMassEdit}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
