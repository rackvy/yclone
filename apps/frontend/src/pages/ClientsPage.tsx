import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { clientsApi, Client } from '../api/clients';
import { appointmentsApi, Appointment, getStatusLabel, getStatusBadgeColor } from '../api/appointments';
import { employeesApi, Employee } from '../api/employees';
// Services loaded from appointment data directly
import { formatDateDDMM, formatTime } from '../utils/date';

interface ClientFormData {
  fullName: string;
  phone: string;
  email: string;
  comment: string;
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  // Services loaded for enrichment
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'visits' | 'activity' | 'files'>('visits');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    fullName: '',
    phone: '',
    email: '',
    comment: '',
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
    try {
      const appointments = await appointmentsApi.listByClient(client.id);
      // Enrich appointments with master and service names
      const enriched = appointments.map(app => ({
        ...app,
        masterName: employees.find(e => e.id === app.masterEmployeeId)?.fullName || 'Неизвестно',
        serviceName: app.services?.[0]?.service?.name || 'Услуга',
      }));
      setClientAppointments(enriched);
    } catch (err) {
      console.error('Failed to load client appointments:', err);
      setClientAppointments([]);
    }
  }

  const filteredClients = clients.filter(client =>
    client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const getTotalSpent = () => {
    return clientAppointments
      .filter(a => a.status === 'done' || a.status === 'confirmed')
      .reduce((sum, a) => sum + (a.total || 0), 0);
  };

  const getVisitsCount = () => clientAppointments.length;

  const openModal = () => {
    setEditingClient(null);
    setFormData({ fullName: '', phone: '', email: '', comment: '' });
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
                        <p className="text-sm font-medium">—</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Всего потрачено</p>
                      <p className="text-xl font-bold text-primary">{getTotalSpent().toLocaleString()} ₽</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Визитов</p>
                      <p className="text-xl font-bold">{getVisitsCount()}</p>
                    </div>
                  </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  rows={3}
                  placeholder="Заметки о клиенте..."
                />
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
    </Layout>
  );
}
