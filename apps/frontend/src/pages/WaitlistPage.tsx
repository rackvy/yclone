import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { waitlistApi, WaitlistItem, CreateWaitlistData } from '../api/waitlist';
import { branchesApi, Branch } from '../api/branches';
import { clientsApi, Client } from '../api/clients';
import { servicesApi, Service } from '../api/services';
import { employeesApi, Employee } from '../api/employees';
import { formatDateDDMM } from '../utils/date';

export default function WaitlistPage() {
  const [items, setItems] = useState<WaitlistItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Omit<CreateWaitlistData, 'branchId' | 'clientId'>>({
    serviceId: '',
    masterEmployeeId: '',
    preferredDate: '',
    preferredTimeFrom: '',
    preferredTimeTo: '',
    comment: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadItems();
      loadServices();
      loadEmployees();
    }
  }, [selectedBranchId, statusFilter]);

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

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await waitlistApi.list(selectedBranchId, statusFilter || undefined);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const data = await servicesApi.list(selectedBranchId);
      setServices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await employeesApi.list();
      setEmployees(data.filter(e => e.role === 'master'));
    } catch (err) {
      console.error(err);
    }
  };

  const searchClients = async (q: string) => {
    if (q.length < 2) {
      setClients([]);
      return;
    }
    try {
      const data = await clientsApi.search(q);
      setClients(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.fullName);
    setClients([]);
  };

  const handleCreate = async () => {
    if (!selectedClient || !selectedBranchId) return;
    
    setSaving(true);
    try {
      await waitlistApi.create({
        branchId: selectedBranchId,
        clientId: selectedClient.id,
        serviceId: formData.serviceId || undefined,
        masterEmployeeId: formData.masterEmployeeId || undefined,
        preferredDate: formData.preferredDate || undefined,
        preferredTimeFrom: formData.preferredTimeFrom || undefined,
        preferredTimeTo: formData.preferredTimeTo || undefined,
        comment: formData.comment || undefined,
      });
      setIsModalOpen(false);
      resetForm();
      loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item: WaitlistItem, newStatus: string) => {
    try {
      await waitlistApi.update(item.id, { status: newStatus as WaitlistItem['status'] });
      loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (item: WaitlistItem) => {
    if (!confirm(`Удалить заявку ${item.client.fullName}?`)) return;
    try {
      await waitlistApi.remove(item.id);
      loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setClientSearch('');
    setFormData({
      serviceId: '',
      masterEmployeeId: '',
      preferredDate: '',
      preferredTimeFrom: '',
      preferredTimeTo: '',
      comment: '',
    });
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Лист ожидания</h1>
            <p className="text-sm text-gray-500 mt-1">Клиенты, ожидающие свободное время</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Добавить
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="">Все статусы</option>
            <option value="pending">Ожидает</option>
            <option value="contacted">Связались</option>
            <option value="booked">Записан</option>
            <option value="canceled">Отменён</option>
          </select>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">hourglass_empty</span>
              <p>Лист ожидания пуст</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Клиент</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Услуга / Мастер</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Желаемое время</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Добавлен</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{item.client.fullName}</div>
                      <div className="text-sm text-gray-500">{item.client.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {item.service?.name || <span className="text-gray-400">Любая услуга</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.masterEmployee?.fullName || 'Любой мастер'}
                      </div>
                    </td>
                    <td className="p-4">
                      {item.preferredDate && (
                        <div className="text-sm">{formatDateDDMM(new Date(item.preferredDate))}</div>
                      )}
                      {(item.preferredTimeFrom || item.preferredTimeTo) && (
                        <div className="text-xs text-gray-500">
                          {item.preferredTimeFrom || '?'} - {item.preferredTimeTo || '?'}
                        </div>
                      )}
                      {!item.preferredDate && !item.preferredTimeFrom && (
                        <span className="text-gray-400 text-sm">Любое время</span>
                      )}
                    </td>
                    <td className="p-4">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        <option value="pending">Ожидает</option>
                        <option value="contacted">Связались</option>
                        <option value="booked">Записан</option>
                        <option value="canceled">Отменён</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {formatDateDDMM(new Date(item.createdAt))}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Удалить"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">Добавить в лист ожидания</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Client search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Клиент *</label>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    searchClients(e.target.value);
                    if (selectedClient) setSelectedClient(null);
                  }}
                  placeholder="Поиск по имени или телефону..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {clients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="font-medium">{c.fullName}</div>
                        <div className="text-xs text-gray-500">{c.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedClient && (
                  <div className="mt-1 text-xs text-green-600">Выбран: {selectedClient.fullName}</div>
                )}
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Услуга (опционально)</label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">Любая услуга</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Master */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Мастер (опционально)</label>
                <select
                  value={formData.masterEmployeeId}
                  onChange={(e) => setFormData({ ...formData, masterEmployeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">Любой мастер</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Preferred date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Желаемая дата</label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Preferred time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Время с</label>
                  <input
                    type="time"
                    value={formData.preferredTimeFrom}
                    onChange={(e) => setFormData({ ...formData, preferredTimeFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Время до</label>
                  <input
                    type="time"
                    value={formData.preferredTimeTo}
                    onChange={(e) => setFormData({ ...formData, preferredTimeTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  rows={2}
                  placeholder="Дополнительная информация..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedClient || saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
