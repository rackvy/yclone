import { useEffect, useMemo, useState } from 'react';
import { Employee, employeesApi } from '../api/employees';
import { Client, clientsApi } from '../api/clients';
import { Service, servicesApi } from '../api/services';
import { Product, productsApi } from '../api/products';
import { AppointmentStatus } from '../api/appointments';
import { formatDateYYYYMMDD } from '../utils/date';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AppointmentFormData) => void;
  employees: Employee[];
  selectedDate: Date;
  selectedBranchId: string;
  selectedEmployeeId?: string;
  selectedTime?: string;
}

export interface AppointmentServiceItem {
  serviceId: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface AppointmentProductItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface AppointmentFormData {
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  services: AppointmentServiceItem[];
  products: AppointmentProductItem[];
  comment: string;
  addedById: string; // кто добавил товары (для статистики допродаж)
}

type TabType = 'services' | 'products';

const STATUS_OPTIONS: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'new', label: 'Новая', color: 'bg-gray-500' },
  { value: 'waiting', label: 'Ожидание', color: 'bg-amber-500' },
  { value: 'confirmed', label: 'Подтвердил', color: 'bg-blue-500' },
  { value: 'done', label: 'Выполнено', color: 'bg-green-500' },
  { value: 'no_show', label: 'Не пришел', color: 'bg-red-500' },
  { value: 'canceled', label: 'Отменено', color: 'bg-red-500' },
];

export function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  employees,
  selectedDate,
  selectedBranchId,
  selectedEmployeeId,
  selectedTime,
}: AppointmentModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [clients, setClients] = useState<Client[]>([]);
  const [employeeServices, setEmployeeServices] = useState<Service[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<AppointmentFormData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    employeeId: selectedEmployeeId || '',
    date: formatDateYYYYMMDD(selectedDate),
    startTime: selectedTime || '10:00',
    endTime: '',
    status: 'waiting',
    services: [],
    products: [],
    comment: '',
    addedById: '',
  });

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);

  // Load initial data (clients, products)
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Load services when employee changes
  useEffect(() => {
    if (isOpen && formData.employeeId) {
      loadEmployeeServices(formData.employeeId);
      // Clear selected services when changing employee
      setFormData(prev => ({ ...prev, services: [] }));
    } else {
      setEmployeeServices([]);
    }
  }, [isOpen, formData.employeeId]);

  // Calculate end time when services change
  useEffect(() => {
    const totalDuration = formData.services.reduce((sum, s) => sum + s.durationMin, 0);
    if (totalDuration > 0 && formData.startTime) {
      const [hours, mins] = formData.startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, mins, 0);
      const endDate = new Date(startDate.getTime() + totalDuration * 60000);
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, endTime }));
    }
  }, [formData.services, formData.startTime]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [clientsData, productsData] = await Promise.all([
        clientsApi.list(),
        selectedBranchId ? productsApi.list(selectedBranchId) : Promise.resolve([]),
      ]);
      setClients(clientsData);
      setAllProducts(productsData);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeServices = async (employeeId: string) => {
    try {
      // Load employee's specific services
      const empServices = await employeesApi.getServices(employeeId);
      // Get full service details for each
      const allServices = await servicesApi.list();
      const filtered = allServices.filter(s => 
        empServices.some((es: { id: string }) => es.id === s.id)
      );
      setEmployeeServices(filtered);
    } catch (err) {
      console.error('Failed to load employee services', err);
      setEmployeeServices([]);
    }
  };

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return [];
    return clients.filter(c => 
      c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone?.includes(clientSearch)
    ).slice(0, 5);
  }, [clients, clientSearch]);

  // Filter services by search
  const filteredServices = useMemo(() => {
    if (!serviceSearch) return employeeServices;
    return employeeServices.filter(s => 
      s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );
  }, [employeeServices, serviceSearch]);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts;
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [allProducts, productSearch]);

  // Calculate totals
  const servicesTotal = formData.services.reduce((sum, s) => sum + s.price, 0);
  const productsTotal = formData.products.reduce((sum, p) => sum + p.price * p.qty, 0);
  const total = servicesTotal + productsTotal;

  const handleSelectClient = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
    }));
    setClientSearch('');
    setShowClientResults(false);
  };

  const handleAddService = (service: Service) => {
    const exists = formData.services.find(s => s.serviceId === service.id);
    if (exists) return;
    
    // Get price from pricesByRank (use first available or 0)
    const price = service.pricesByRank?.[0]?.price || 0;
    
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, {
        serviceId: service.id,
        name: service.name,
        durationMin: service.durationMin,
        price: price,
      }],
    }));
  };

  const handleRemoveService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.serviceId !== serviceId),
    }));
  };

  const handleAddProduct = (product: Product) => {
    const exists = formData.products.find(p => p.productId === product.id);
    if (exists) return;
    
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        productId: product.id,
        name: product.name,
        qty: 1,
        price: product.price,
      }],
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.productId !== productId),
    }));
  };

  const handleUpdateProductQty = (productId: string, qty: number) => {
    if (qty < 1) return;
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.productId === productId ? { ...p, qty } : p
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.employeeId) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  const selectedEmployee = employees.find(e => e.id === formData.employeeId);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header with status */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    formData.status === status.value
                      ? `${status.color} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {formData.status === status.value && (
                    <span className="material-symbols-outlined text-sm">check</span>
                  )}
                  {status.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex">
            {/* Left Column - Master, Date, Time */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-4 overflow-y-auto">
              {/* Master */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Специалист</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                >
                  <option value="">Выберите мастера</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Дата</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Время</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={formData.endTime}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500"
                  />
                </div>
                {formData.services.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Длительность: {formData.services.reduce((sum, s) => sum + s.durationMin, 0)} мин
                  </p>
                )}
              </div>

              {/* Break button */}
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Добавить перерыв
              </button>

              {/* Comment */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  placeholder="Комментарий к записи..."
                />
              </div>

              {/* Added by (for products tracking) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Товары добавил
                </label>
                <select
                  value={formData.addedById}
                  onChange={(e) => setFormData(prev => ({ ...prev, addedById: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">Выберите сотрудника</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Для учета допродаж в план сотрудника
                </p>
              </div>
            </div>

            {/* Middle Column - Services/Products */}
            <div className="flex-1 p-4 flex flex-col min-w-0">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'services'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">spa</span>
                  Услуги
                  {formData.services.length > 0 && (
                    <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                      {formData.services.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'products'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">inventory_2</span>
                  Товары
                  {formData.products.length > 0 && (
                    <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                      {formData.products.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder={activeTab === 'services' ? 'Поиск по услугам...' : 'Поиск по товарам...'}
                  value={activeTab === 'services' ? serviceSearch : productSearch}
                  onChange={(e) => activeTab === 'services' 
                    ? setServiceSearch(e.target.value) 
                    : setProductSearch(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'services' ? (
                  <div className="space-y-2">
                    {/* Selected Services */}
                    {formData.services.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-500 mb-2">Выбранные услуги</h4>
                        <div className="space-y-2">
                          {formData.services.map(service => (
                            <div
                              key={service.serviceId}
                              className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium">{service.name}</p>
                                <p className="text-xs text-gray-500">{service.durationMin} мин</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold">{service.price.toLocaleString('ru-RU')} ₽</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveService(service.serviceId)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <span className="material-symbols-outlined">close</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Services */}
                    <h4 className="text-xs font-medium text-gray-500 mb-2">Доступные услуги</h4>
                    {filteredServices.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">
                        {selectedEmployee 
                          ? 'У этого мастера нет доступных услуг' 
                          : 'Выберите мастера для просмотра услуг'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredServices.map(service => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleAddService(service)}
                            disabled={formData.services.some(s => s.serviceId === service.id)}
                            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium">{service.name}</p>
                              <p className="text-xs text-gray-500">{service.durationMin} мин</p>
                            </div>
                            <span className="text-sm font-bold text-primary">
                              {(service.pricesByRank?.[0]?.price || 0).toLocaleString('ru-RU')} ₽
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Selected Products */}
                    {formData.products.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-500 mb-2">Добавленные товары</h4>
                        <div className="space-y-2">
                          {formData.products.map(product => (
                            <div
                              key={product.productId}
                              className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.price.toLocaleString('ru-RU')} ₽ / шт</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateProductQty(product.productId, product.qty - 1)}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-gray-50"
                                  >
                                    <span className="material-symbols-outlined text-sm">remove</span>
                                  </button>
                                  <span className="text-sm font-medium w-6 text-center">{product.qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateProductQty(product.productId, product.qty + 1)}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-gray-50"
                                  >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                  </button>
                                </div>
                                <span className="text-sm font-bold w-16 text-right">
                                  {(product.price * product.qty).toLocaleString('ru-RU')} ₽
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(product.productId)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <span className="material-symbols-outlined">close</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Products */}
                    <h4 className="text-xs font-medium text-gray-500 mb-2">Доступные товары</h4>
                    {filteredProducts.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">
                        Нет доступных товаров
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleAddProduct(product)}
                            disabled={formData.products.some(p => p.productId === product.id)}
                            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium">{product.name}</p>
                              <p className="text-xs text-gray-500">В наличии: {product.stockQty} шт</p>
                            </div>
                            <span className="text-sm font-bold text-amber-600">
                              {product.price.toLocaleString('ru-RU')} ₽
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <span className="text-gray-500">Итого:</span>
                    <span className="ml-2 text-xl font-bold">{total.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formData.services.length > 0 && `Услуги: ${servicesTotal.toLocaleString('ru-RU')} ₽`}
                    {formData.products.length > 0 && ` • Товары: ${productsTotal.toLocaleString('ru-RU')} ₽`}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Client Info */}
            <div className="w-72 bg-gray-50 border-l border-gray-200 p-4 space-y-4 overflow-y-auto">
              <h3 className="font-bold text-gray-900">Клиент</h3>

              {/* Client Search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Поиск клиента</label>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientResults(true);
                  }}
                  onFocus={() => setShowClientResults(true)}
                  placeholder="Имя или телефон..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {showClientResults && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {filteredClients.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-medium">{client.fullName}</p>
                        {client.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Имя *</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Имя клиента"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Телефон</label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let formatted = '';
                    if (raw.length > 0) formatted = '+7';
                    if (raw.length > 1) formatted += ' (' + raw.slice(1, 4);
                    if (raw.length > 4) formatted += ') ' + raw.slice(4, 7);
                    if (raw.length > 7) formatted += '-' + raw.slice(7, 9);
                    if (raw.length > 9) formatted += '-' + raw.slice(9, 11);
                    setFormData(prev => ({ ...prev, clientPhone: formatted }));
                  }}
                  placeholder="+7 (___) ___ __ __"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="example@mail.com"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-300" />
                  <span className="text-xs text-gray-600">Записывает другого посетителя</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-300" />
                  <span className="text-xs text-gray-600">Клиент дал согласие на обработку персональных данных</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 rounded border-gray-300" />
                  <span className="text-xs text-gray-600">Клиент дал согласие на отправку информационно-рекламной рассылки</span>
                </label>
              </div>

              {/* Previous visits */}
              {formData.clientId && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Предыдущие визиты</h4>
                  <div className="text-sm text-gray-400">
                    История визитов будет здесь
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!formData.clientName || !formData.employeeId}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">check</span>
              Сохранить запись
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
