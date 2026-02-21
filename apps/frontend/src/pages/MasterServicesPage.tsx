import { useEffect, useState } from 'react';
import MasterLayout from '../components/MasterLayout';
import { servicesApi, serviceCategoriesApi, Service, ServiceCategory } from '../api/services';

export function MasterServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, categoriesData] = await Promise.all([
        servicesApi.list(),
        serviceCategoriesApi.list(),
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || service.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedServices = categories.map(category => ({
    category,
    services: filteredServices.filter(s => s.categoryId === category.id),
  })).filter(g => g.services.length > 0);

  const uncategorizedServices = filteredServices.filter(s => !s.categoryId);

  return (
    <MasterLayout>
      <div className="flex-1 flex h-full bg-gray-50">
        {/* Services List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Услуги</h1>
            
            {/* Search */}
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск услуги..."
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
            ) : filteredServices.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'Ничего не найдено' : 'Нет услуг'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {groupedServices.map(({ category, services }) => (
                  <div key={category.id}>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                      {category.name}
                    </div>
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedService?.id === service.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{service.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {service.durationMin} мин
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
                
                {uncategorizedServices.length > 0 && (
                  <div>
                    {groupedServices.length > 0 && (
                      <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        Без категории
                      </div>
                    )}
                    {uncategorizedServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedService?.id === service.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{service.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {service.durationMin} мин
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Service Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedService ? (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedService.name}</h2>
                
                {selectedService.category && (
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm mb-6">
                    {selectedService.category.name}
                  </span>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-500">Длительность</label>
                    <p className="text-xl font-bold text-gray-900">{selectedService.durationMin} мин</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-500">Статус</label>
                    <p className="text-xl font-bold">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        selectedService.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedService.isActive ? 'Активна' : 'Неактивна'}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedService.pricesByRank && selectedService.pricesByRank.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Цены по категориям мастеров</h3>
                    <div className="space-y-2">
                      {selectedService.pricesByRank.map((price) => (
                        <div key={price.masterRankId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{price.masterRank?.name || 'Без категории'}</span>
                          <span className="text-lg font-bold text-gray-900">{price.price.toLocaleString('ru-RU')} ₽</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Добавлена: {new Date(selectedService.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="text-sm text-gray-500">
                    Обновлена: {new Date(selectedService.updatedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4">spa</span>
                <p>Выберите услугу для просмотра деталей</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MasterLayout>
  );
}
