import { useEffect, useState } from 'react';
import MasterLayout from '../components/MasterLayout';
import { productsApi, productCategoriesApi, Product, ProductCategory, formatRubles } from '../api/products';

export function MasterProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get branchId from localStorage or user profile
    const savedBranchId = localStorage.getItem('selectedBranchId');
    if (savedBranchId) {
      setBranchId(savedBranchId);
    }
  }, []);

  useEffect(() => {
    if (branchId) {
      loadData();
    }
  }, [branchId, selectedCategory]);

  const loadData = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productsApi.list(branchId, selectedCategory || undefined),
        productCategoriesApi.list(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedProducts = categories.map(category => ({
    category,
    products: filteredProducts.filter(p => p.categoryId === category.id),
  })).filter(g => g.products.length > 0);

  const uncategorizedProducts = filteredProducts.filter(p => !p.categoryId);

  return (
    <MasterLayout>
      <div className="flex-1 flex h-full bg-gray-50">
        {/* Products List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Товары</h1>
            
            {/* Search */}
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск товара..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Все категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Загрузка...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'Ничего не найдено' : 'Нет товаров'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {groupedProducts.map(({ category, products }) => (
                  <div key={category.id}>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                      {category.name}
                    </div>
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedProduct?.id === product.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-500">
                            {product.stockQty} шт.
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatRubles(product.price)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
                
                {uncategorizedProducts.length > 0 && (
                  <div>
                    {groupedProducts.length > 0 && (
                      <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        Без категории
                      </div>
                    )}
                    {uncategorizedProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedProduct?.id === product.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-500">
                            {product.stockQty} шт.
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatRubles(product.price)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedProduct ? (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                
                {selectedProduct.category && (
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm mb-6">
                    {selectedProduct.category.name}
                  </span>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-500">Цена продажи</label>
                    <p className="text-xl font-bold text-gray-900">
                      {formatRubles(selectedProduct.price)}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-500">В наличии</label>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedProduct.stockQty} шт.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-500">Статус</label>
                    <p className="text-xl font-bold">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        selectedProduct.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedProduct.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </p>
                  </div>
                </div>



                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Добавлен: {new Date(selectedProduct.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="text-sm text-gray-500">
                    Обновлен: {new Date(selectedProduct.updatedAt).toLocaleDateString('ru-RU')}
                  </p>
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
    </MasterLayout>
  );
}
