import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { servicesApi, Service, ServicePriceDto, serviceCategoriesApi, ServiceCategory } from '../api/services';
import { masterRanksApi, MasterRank } from '../api/masterRanks';

interface ServiceFormData {
  name: string;
  categoryId: string;
  durationMin: number;
  prices: Record<string, number>; // rankId -> price
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [masterRanks, setMasterRanks] = useState<MasterRank[]>([]);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_servicePriceDto, _setServicePriceDto] = useState<ServicePriceDto | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    categoryId: '',
    durationMin: 60,
    prices: {},
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [servicesData, categoriesData, ranksData] = await Promise.all([
        servicesApi.list(),
        serviceCategoriesApi.list(),
        masterRanksApi.list(),
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
      setMasterRanks(ranksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return 'Без категории';
    return categories.find(c => c.id === categoryId)?.name || 'Неизвестно';
  };

  const openModal = () => {
    setEditingService(null);
    const initialPrices: Record<string, number> = {};
    masterRanks.forEach(rank => {
      initialPrices[rank.id] = 0;
    });
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      durationMin: 60,
      prices: initialPrices,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    const prices: Record<string, number> = {};
    masterRanks.forEach(rank => {
      const priceByRank = service.pricesByRank?.find((p: ServicePriceDto) => p.masterRankId === rank.id);
      prices[rank.id] = priceByRank?.price || 0;
    });
    setFormData({
      name: service.name,
      categoryId: service.categoryId || '',
      durationMin: service.durationMin,
      prices,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите название услуги');
      return;
    }

    try {
      setSaving(true);
      const prices = masterRanks.map(rank => ({
        masterRankId: rank.id,
        price: formData.prices[rank.id] || 0,
      }));

      if (editingService) {
        await servicesApi.update(editingService.id, {
          name: formData.name.trim(),
          categoryId: formData.categoryId || undefined,
          durationMin: formData.durationMin,
          pricesByRank: prices,
        });
      } else {
        await servicesApi.create({
          name: formData.name.trim(),
          categoryId: formData.categoryId || undefined,
          durationMin: formData.durationMin,
          pricesByRank: prices,
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

  const handleDelete = async (service: Service) => {
    if (!confirm(`Удалить услугу "${service.name}"?`)) return;
    try {
      await servicesApi.delete(service.id);
      if (selectedService?.id === service.id) {
        setSelectedService(null);
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <Layout>
      <div className="h-full flex">
        {/* Left side - Services list */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Услуги</h1>
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
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Services list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Загрузка...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Услуги не найдены</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedService?.id === service.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getCategoryName(service.categoryId)} • {service.durationMin} мин
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Service details */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedService ? (
            <div className="p-6 max-w-4xl">
              {/* Service header */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedService.name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">folder</span>
                        {getCategoryName(selectedService.categoryId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {selectedService.durationMin} мин
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(selectedService)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Редактировать
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedService)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prices by rank */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-bold text-lg">Цены по грейдам</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {masterRanks.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      Нет настроенных грейдов
                    </div>
                  ) : (
                    masterRanks.map((rank) => {
                      const price = selectedService.pricesByRank?.find((p: ServicePriceDto) => p.masterRankId === rank.id);
                      return (
                        <div key={rank.id} className="flex items-center justify-between p-4">
                          <span className="font-medium">{rank.name}</span>
                          <span className="text-lg font-bold">
                            {price ? `${price.price.toLocaleString('ru-RU')} ₽` : '—'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4">content_cut</span>
                <p>Выберите услугу для просмотра деталей</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">
                  {editingService ? 'Редактировать услугу' : 'Новая услуга'}
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
                    placeholder="Стрижка мужская"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Категория</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">Без категории</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Длительность (мин)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={formData.durationMin}
                    onChange={(e) => setFormData({ ...formData, durationMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                {/* Prices by rank */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Цены по грейдам</label>
                  <div className="space-y-2">
                    {masterRanks.map((rank) => (
                      <div key={rank.id} className="flex items-center gap-3">
                        <span className="flex-1 text-sm">{rank.name}</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.prices[rank.id] || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            prices: { ...formData.prices, [rank.id]: parseInt(e.target.value) || 0 }
                          })}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-right"
                        />
                        <span className="text-sm text-gray-500">₽</span>
                      </div>
                    ))}
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
