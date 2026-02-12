import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { clientsApi, Client } from '../api/clients';
import { appointmentsApi, Appointment, getStatusLabel, getStatusBadgeColor } from '../api/appointments';
import { formatTime } from '../utils/date';

interface ClientFormData {
  fullName: string;
  phone: string;
  email: string;
  comment: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  async function selectClient(client: Client) {
    setSelectedClient(client);
    try {
      const appointments = await appointmentsApi.listByClient(client.id);
      setClientAppointments(appointments);
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

    try {
      setSaving(true);
      if (editingClient) {
        // Update existing client
        await clientsApi.update(editingClient.id, {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          comment: formData.comment.trim() || undefined,
        });
        // Refresh selected client if it was edited
        if (selectedClient?.id === editingClient.id) {
          const updated = await clientsApi.get(editingClient.id);
          setSelectedClient(updated);
        }
      } else {
        // Create new client
        await clientsApi.create({
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          comment: formData.comment.trim() || undefined,
        });
      }
      await loadClients();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения клиента');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="h-full flex">
        {/* Left side - Clients list */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Клиенты</h1>
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
                placeholder="Поиск по имени, телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedClient?.id === client.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {client.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{client.fullName}</p>
                        {client.phone && (
                          <p className="text-sm text-gray-500">{client.phone}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Client details */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedClient ? (
            <div className="p-6 max-w-4xl">
              {/* Client header */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {selectedClient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedClient.fullName}</h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {selectedClient.phone && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">phone</span>
                            {selectedClient.phone}
                          </span>
                        )}
                        {selectedClient.email && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">email</span>
                            {selectedClient.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => openEditModal(selectedClient)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined">edit</span>
                    Редактировать
                  </button>
                </div>

                {selectedClient.comment && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    {selectedClient.comment}
                  </div>
                )}
              </div>

              {/* Appointments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-bold text-lg">История записей</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Всего записей: {clientAppointments.length}
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {clientAppointments.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      У клиента пока нет записей
                    </div>
                  ) : (
                    clientAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                                {getStatusLabel(appointment.status)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(appointment.startAt).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-sm text-gray-400">
                                {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
                              </span>
                            </div>

                            <p className="font-medium">
                              Мастер: {appointment.masterEmployee?.fullName || 'Не назначен'}
                            </p>

                            {appointment.services.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {appointment.services.map((service) => (
                                  <span
                                    key={service.id}
                                    className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                                  >
                                    {service.service.name} ({service.price.toLocaleString('ru-RU')} ₽)
                                  </span>
                                ))}
                              </div>
                            )}

                            {appointment.comment && (
                              <p className="mt-2 text-sm text-gray-500">{appointment.comment}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-lg">{appointment.total.toLocaleString('ru-RU')} ₽</p>
                            {appointment.isPaid && (
                              <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Оплачено
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4">person_search</span>
                <p>Выберите клиента для просмотра деталей</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">
                  {editingClient ? 'Редактировать клиента' : 'Новый клиент'}
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
                    ФИО <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Комментарий для сотрудников
                    <span className="text-gray-400 font-normal ml-1">(виден всем)</span>
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                    placeholder="Например: Клиент аллергик, проблемный, VIP и т.д."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Этот комментарий будет виден всем сотрудникам при просмотре клиента
                  </p>
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
