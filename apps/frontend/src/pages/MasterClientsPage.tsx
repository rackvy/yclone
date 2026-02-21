import { useEffect, useState } from 'react';
import MasterLayout from '../components/MasterLayout';
import { clientsApi, Client } from '../api/clients';
import { appointmentsApi, Appointment } from '../api/appointments';
import { formatDateFull, formatTime } from '../utils/date';

export function MasterClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientHistory(selectedClient.id);
    }
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientsApi.list();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClientHistory = async (clientId: string) => {
    try {
      const data = await appointmentsApi.listByClient(clientId);
      setClientHistory(data);
    } catch (err) {
      console.error('Failed to load client history:', err);
    }
  };

  const filteredClients = clients.filter(client =>
    client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-gray-100 text-gray-700',
      confirmed: 'bg-blue-100 text-blue-700',
      waiting: 'bg-amber-100 text-amber-700',
      done: 'bg-green-100 text-green-700',
      no_show: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-500 line-through',
    };
    const labels: Record<string, string> = {
      new: 'Новая',
      confirmed: 'Подтверждена',
      waiting: 'Ожидание',
      done: 'Выполнена',
      no_show: 'Не пришел',
      canceled: 'Отменена',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <MasterLayout>
      <div className="flex-1 flex h-full bg-gray-50">
        {/* Clients List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Клиенты</h1>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени или телефону..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Загрузка...</div>
            ) : filteredClients.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'Ничего не найдено' : 'Нет клиентов'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedClient?.id === client.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{client.fullName}</div>
                    {client.phone && (
                      <div className="text-sm text-gray-500 mt-1">{client.phone}</div>
                    )}
                    {client.email && (
                      <div className="text-sm text-gray-500">{client.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Client Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedClient ? (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedClient.fullName}</h2>
                    <p className="text-gray-500 mt-1">Клиент с {new Date(selectedClient.createdAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  {selectedClient.phone && (
                    <div>
                      <label className="text-sm text-gray-500">Телефон</label>
                      <p className="font-medium">{selectedClient.phone}</p>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="font-medium">{selectedClient.email}</p>
                    </div>
                  )}
                  {selectedClient.birthDate && (
                    <div>
                      <label className="text-sm text-gray-500">Дата рождения</label>
                      <p className="font-medium">{new Date(selectedClient.birthDate).toLocaleDateString('ru-RU')}</p>
                    </div>
                  )}
                </div>

                {selectedClient.comment && (
                  <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                    <label className="text-sm text-gray-500">Комментарий</label>
                    <p className="mt-1 text-gray-700">{selectedClient.comment}</p>
                  </div>
                )}
              </div>

              {/* Visit History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">История визитов</h3>
                
                {clientHistory.length === 0 ? (
                  <p className="text-gray-500">Нет записей</p>
                ) : (
                  <div className="space-y-3">
                    {clientHistory.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {formatDateFull(new Date(appointment.startAt))}
                          </span>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
                        </p>
                        {appointment.masterEmployee && (
                          <p className="text-xs text-gray-500 mt-1">
                            Мастер: {appointment.masterEmployee.fullName}
                          </p>
                        )}
                        {appointment.services && appointment.services.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            Услуги: {appointment.services.map(s => s.service?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                        {appointment.total > 0 && (
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            Сумма: {appointment.total.toLocaleString('ru-RU')} ₽
                          </p>
                        )}
                        {appointment.comment && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            "{appointment.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4">person</span>
                <p>Выберите клиента для просмотра деталей</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MasterLayout>
  );
}
