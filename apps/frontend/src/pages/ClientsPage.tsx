import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { clientsApi, Client, ClientStats } from '../api/clients';
import { appointmentsApi, Appointment, getStatusLabel, getStatusBadgeColor } from '../api/appointments';
import { employeesApi, Employee } from '../api/employees';
// Services loaded from appointment data directly
import { formatDateDDMM, formatTime } from '../utils/date';

interface ClientFormData {
  fullName: string;
  phone: string;
  email: string;
  comment: string;
  birthDate: string;
  discountPercent: number;
  discountAppliesTo: 'all' | 'services' | 'products';
}

interface AppointmentWithDetails extends Appointment {
  masterName?: string;
  serviceName?: string;
  date?: string;
  startTime?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAppointments, setClientAppointments] = useState<AppointmentWithDetails[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  // Services loaded for enrichment
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'visits' | 'activity' | 'files' | 'certificates'>('visits');
  
  // Certificate modal
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certForm, setCertForm] = useState({ name: '', amount: '', expiresAt: '' });
  const [certSaving, setCertSaving] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    fullName: '',
    phone: '',
    email: '',
    comment: '',
    birthDate: '',
    discountPercent: 0,
    discountAppliesTo: 'all',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
    loadEmployees();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const data = await clientsApi.list();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const data = await employeesApi.list();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  }

  // Services not needed - using appointment.services directly

  async function selectClient(client: Client) {
    setSelectedClient(client);
    setClientStats(null);
    try {
      // Загружаем записи и статистику параллельно
      const [appointments, stats] = await Promise.all([
        appointmentsApi.listByClient(client.id),
        clientsApi.getStats(client.id),
      ]);
      // Enrich appointments with master and service names
      const enriched = appointments.map(app => ({
        ...app,
        masterName: employees.find(e => e.id === app.masterEmployeeId)?.fullName || 'Неизвестно',
        serviceName: app.services?.[0]?.service?.name || 'Услуга',
      }));
      setClientAppointments(enriched);
      setClientStats(stats);
    } catch (err) {
      console.error('Failed to load client data:', err);
      setClientAppointments([]);
      setClientStats(null);
    }
  }

  const filteredClients = clients.filter(client =>
    client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = () => {
    setEditingClient(null);
    setFormData({ fullName: '', phone: '', email: '', comment: '', birthDate: '', discountPercent: 0, discountAppliesTo: 'all' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      fullName: client.fullName,
      phone: client.phone || '',
      email: client.email || '',
      comment: client.comment || '',
      birthDate: client.birthDate ? client.birthDate.slice(0, 10) : '',
      discountPercent: client.discountPercent || 0,
      discountAppliesTo: client.discountAppliesTo || 'all',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim()) {
      setFormError('Укажите имя клиента');
      return;
    }

    setSaving(true);
    try {
      if (editingClient) {
        await clientsApi.update(editingClient.id, formData);
      } else {
        await clientsApi.create(formData);
      }
      await loadClients();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // Certificate functions
  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !certForm.name.trim() || !certForm.amount) return;
    
    setCertSaving(true);
    try {
      await clientsApi.addCertificate(selectedClient.id, {
        name: certForm.name.trim(),
        amount: parseInt(certForm.amount),
        expiresAt: certForm.expiresAt || undefined,
      });
      // Перезагрузим клиента чтобы обновить сертификаты
      const updatedClient = await clientsApi.get(selectedClient.id);
      setSelectedClient(updatedClient);
      setIsCertModalOpen(false);
      setCertForm({ name: '', amount: '', expiresAt: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка добавления сертификата');
    } finally {
      setCertSaving(false);
    }
  };

  const handleDeactivateCertificate = async (certId: string) => {
    if (!confirm('Деактивировать сертификат?')) return;
    try {
      await clientsApi.updateCertificate(certId, { isActive: false });
      if (selectedClient) {
        const updatedClient = await clientsApi.get(selectedClient.id);
        setSelectedClient(updatedClient);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  // Delete functionality can be added here

  return (
    <Layout>
      <div className="h-full flex">
        {/* Middle column - Clients list */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold">Клиенты</h1>
              <button
                onClick={openModal}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Clients list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Загрузка...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : filteredClients.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Клиенты не найдены</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => selectClient(client)}
                    className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedClient?.id === client.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {client.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">{client.fullName}</p>
                        {client.phone && (
                          <p className="text-xs text-gray-500">{client.phone}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Client details */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedClient ? (
            <div className="p-6">
              {/* Breadcrumb and actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-500">
                  Клиенты <span className="mx-2">›</span> <span className="text-gray-900 font-medium">{selectedClient.fullName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => openEditModal(selectedClient)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Редактировать
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Создать запись
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-bold mb-6">Профиль клиента</h2>

              <div className="grid grid-cols-3 gap-6">
                {/* Left - Profile card */}
                <div className="space-y-4">
                  {/* Main profile card */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mx-auto mb-3">
                      {selectedClient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-lg font-bold">{selectedClient.fullName}</h3>
                  </div>

                  {/* Contact info */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-3">
                    {selectedClient.phone && (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400 text-sm">phone</span>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Телефон</p>
                          <p className="text-sm font-medium">{selectedClient.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedClient.email && (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400 text-sm">email</span>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Email</p>
                          <p className="text-sm font-medium">{selectedClient.email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-gray-400 text-sm">cake</span>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">День рождения</p>
                        {selectedClient.birthDate ? (
                          <>
                            <p className="text-sm font-medium">
                              {new Date(selectedClient.birthDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                              {(() => {
                                const today = new Date();
                                const birth = new Date(selectedClient.birthDate!);
                                const age = today.getFullYear() - birth.getFullYear();
                                return <span className="text-gray-400 ml-1">({age} лет)</span>;
                              })()}
                            </p>
                            {(() => {
                              const today = new Date();
                              const birth = new Date(selectedClient.birthDate!);
                              const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
                              const diffDays = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              if (diffDays >= 0 && diffDays <= 7) {
                                return (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full">
                                    <span className="material-symbols-outlined text-xs">celebration</span>
                                    {diffDays === 0 ? 'Сегодня!' : `Через ${diffDays} дн.`}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </>
                        ) : (
                          <p className="text-sm font-medium text-gray-400">—</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Loyalty - Discount */}
                  {selectedClient.discountPercent > 0 && (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Скидка клиента</p>
                      <p className="text-xl font-bold text-green-700">{selectedClient.discountPercent}%</p>
                      <p className="text-xs text-green-600">
                        {selectedClient.discountAppliesTo === 'all' && 'На всё'}
                        {selectedClient.discountAppliesTo === 'services' && 'На услуги'}
                        {selectedClient.discountAppliesTo === 'products' && 'На товары'}
                      </p>
                    </div>
                  )}

                  {/* Preferred Master */}
                  {selectedClient.preferredMaster && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Любимый мастер</p>
                      <p className="text-lg font-bold text-blue-700">{selectedClient.preferredMaster.fullName}</p>
                    </div>
                  )}

                  {/* Preferred Services */}
                  {selectedClient.preferredServiceIds && (() => {
                    try {
                      const serviceIds = JSON.parse(selectedClient.preferredServiceIds) as string[];
                      if (serviceIds.length > 0) {
                        return (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                            <p className="text-xs text-gray-500 uppercase mb-1">Любимые услуги</p>
                            <p className="text-sm text-purple-700">{serviceIds.length} услуг в избранном</p>
                          </div>
                        );
                      }
                    } catch {}
                    return null;
                  })()}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Всего потрачено</p>
                      <p className="text-xl font-bold text-primary">{(clientStats?.totalSpent || 0).toLocaleString()} ₽</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Визитов</p>
                      <p className="text-xl font-bold">{clientStats?.visitsCount || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Средний чек</p>
                      <p className="text-xl font-bold text-amber-600">{(clientStats?.avgCheck || 0).toLocaleString()} ₽</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Визитов/мес</p>
                      <p className="text-xl font-bold">{clientStats?.visitsPerMonth || 0}</p>
                    </div>
                  </div>

                  {/* Preferred Master */}
                  {clientStats?.preferredMaster && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Любимый мастер</p>
                      <p className="text-lg font-bold text-blue-700">{clientStats.preferredMaster.name}</p>
                      <p className="text-xs text-blue-600">{clientStats.preferredMaster.count} визитов</p>
                    </div>
                  )}

                  {/* Top Services */}
                  {clientStats?.topServices && clientStats.topServices.length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-2">Любимые услуги</p>
                      <div className="space-y-1">
                        {clientStats.topServices.map((s, i) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <span className="text-sm text-purple-700">
                              {i + 1}. {s.name}
                            </span>
                            <span className="text-xs text-purple-500">{s.count} раз</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes - Quick Edit */}
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600 uppercase">Личные заметки</p>
                      <button 
                        onClick={() => openEditModal(selectedClient)}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Изм.
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 italic">
                      {selectedClient.comment || 'Нет заметок'}
                    </p>
                  </div>
                </div>

                {/* Right - Visits history */}
                <div className="col-span-2 space-y-4">
                  {/* Tabs */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="flex border-b border-gray-200">
                      <button
                        onClick={() => setActiveTab('visits')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'visits' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        История визитов
                      </button>
                      <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'activity' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Лента активности
                      </button>
                      <button
                        onClick={() => setActiveTab('files')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'files' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Файлы и фото
                      </button>
                      <button
                        onClick={() => setActiveTab('certificates')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'certificates' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Сертификаты
                        {selectedClient?.certificates && selectedClient.certificates.length > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            {selectedClient.certificates.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Visits tab content */}
                    {activeTab === 'visits' && (
                      <div className="p-4">
                        {/* Search */}
                        <div className="relative mb-4">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            search
                          </span>
                          <input
                            type="text"
                            placeholder="Поиск визитов..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          />
                        </div>

                        {/* Table header */}
                        <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                          <div>Дата</div>
                          <div className="col-span-2">Услуга</div>
                          <div>Мастер</div>
                          <div>Сумма</div>
                          <div>Статус</div>
                        </div>

                        {/* Table rows */}
                        <div className="divide-y divide-gray-100">
                          {clientAppointments.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Нет записей</div>
                          ) : (
                            clientAppointments.map((app) => (
                              <div key={app.id} className="grid grid-cols-6 gap-4 px-4 py-3 items-center hover:bg-gray-50">
                                <div>
                                  <p className="font-medium text-sm">{formatDateDDMM(new Date(app.startAt))}</p>
                                  <p className="text-xs text-gray-500">{formatTime(app.startAt)}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="font-medium text-sm">{app.serviceName}</p>
                                  <p className="text-xs text-gray-500">{app.comment || 'Основная услуга'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                    {app.masterName?.split(' ').map(n => n[0]).join('').slice(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-sm">{app.masterName}</span>
                                </div>
                                <div className="font-medium text-sm">{app.total?.toLocaleString()} ₽</div>
                                <div>
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(app.status)}`}>
                                    {getStatusLabel(app.status)}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Pagination */}
                        {clientAppointments.length > 0 && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                              Показано {clientAppointments.length} из {clientAppointments.length} визитов
                            </p>
                            <div className="flex items-center gap-1">
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                              </button>
                              <button className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded text-sm font-medium">
                                1
                              </button>
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'activity' && (
                      <div className="p-8 text-center text-gray-400">
                        Лента активности
                      </div>
                    )}

                    {activeTab === 'files' && (
                      <div className="p-8 text-center text-gray-400">
                        Файлы и фото
                      </div>
                    )}

                    {activeTab === 'certificates' && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-900">Сертификаты и абонементы</h4>
                          <button
                            onClick={() => setIsCertModalOpen(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Добавить
                          </button>
                        </div>

                        {(!selectedClient?.certificates || selectedClient.certificates.length === 0) ? (
                          <div className="text-center py-8 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">card_giftcard</span>
                            <p>Нет активных сертификатов</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedClient.certificates.map(cert => (
                              <div 
                                key={cert.id} 
                                className={`p-4 rounded-lg border ${
                                  cert.isActive 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-gray-50 border-gray-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{cert.name}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Остаток: <span className="font-bold text-green-700">{cert.remaining.toLocaleString()} ₽</span>
                                      <span className="text-gray-400"> / {cert.amount.toLocaleString()} ₽</span>
                                    </p>
                                    {cert.expiresAt && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Действует до: {new Date(cert.expiresAt).toLocaleDateString('ru-RU')}
                                      </p>
                                    )}
                                  </div>
                                  {cert.isActive && (
                                    <button
                                      onClick={() => handleDeactivateCertificate(cert.id)}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                      title="Деактивировать"
                                    >
                                      <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                  )}
                                </div>
                                {/* Progress bar */}
                                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${Math.round((cert.remaining / cert.amount) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recent activity */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Последняя активность</h4>
                    <div className="space-y-3">
                      {clientAppointments.slice(0, 2).map((app, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <div>
                            <p className="text-sm font-medium">
                              {idx === 0 ? 'Визит запланирован' : 'Заметка обновлена'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {idx === 0 
                                ? `Новая запись на ${app.serviceName}: ${formatDateDDMM(new Date(app.startAt))} в ${formatTime(app.startAt.slice(11, 16))}`
                                : 'Обновлены данные клиента'
                              }
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {idx === 0 ? '2 часа назад' : '3 дня назад'} • {app.masterName}
                            </p>
                          </div>
                        </div>
                      ))}
                      {clientAppointments.length === 0 && (
                        <p className="text-sm text-gray-400">Нет активности</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4 text-gray-300">person</span>
                <p>Выберите клиента для просмотра профиля</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingClient ? 'Редактировать клиента' : 'Новый клиент'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Иван Иванов"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">День рождения</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  rows={3}
                  placeholder="Заметки о клиенте..."
                />
              </div>

              {/* Лояльность - Скидка */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Лояльность</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Скидка (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Применяется к</label>
                    <select
                      value={formData.discountAppliesTo}
                      onChange={(e) => setFormData({ ...formData, discountAppliesTo: e.target.value as 'all' | 'services' | 'products' })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="all">Всему</option>
                      <option value="services">Услугам</option>
                      <option value="products">Товарам</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : (editingClient ? 'Сохранить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {isCertModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">Новый сертификат</h3>
              <button onClick={() => setIsCertModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddCertificate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input
                  type="text"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Подарочный сертификат"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽) *</label>
                <input
                  type="number"
                  min="1"
                  value={certForm.amount}
                  onChange={(e) => setCertForm({ ...certForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="5000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания (опционально)</label>
                <input
                  type="date"
                  value={certForm.expiresAt}
                  onChange={(e) => setCertForm({ ...certForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCertModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={certSaving}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {certSaving ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
