import { useState, useEffect } from 'react';
import { Appointment, AppointmentStatus, appointmentsApi, getStatusLabel, getStatusBadgeColor } from '../api/appointments';
import { Employee } from '../api/employees';
import { Service, servicesApi } from '../api/services';
import { Client, clientsApi } from '../api/clients';
import { formatRubles } from '../api/products';
import { formatTime, formatDateFull, formatDateYYYYMMDD } from '../utils/date';
import { PaymentBlock } from './PaymentBlock';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  employees: Employee[];
  onUpdate: () => void;
  selectedBranchId: string;
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string; color: string; icon: string }[] = [
  { value: 'new', label: 'Новая', color: 'bg-gray-100 text-gray-700', icon: 'fiber_new' },
  { value: 'waiting', label: 'Ожидание', color: 'bg-amber-100 text-amber-700', icon: 'schedule' },
  { value: 'confirmed', label: 'Подтвердил', color: 'bg-blue-100 text-blue-700', icon: 'check_circle' },
  { value: 'done', label: 'Выполнено', color: 'bg-green-100 text-green-700', icon: 'task_alt' },
  { value: 'no_show', label: 'Не пришел', color: 'bg-red-100 text-red-700', icon: 'cancel' },
];

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  employees,
  onUpdate,
  selectedBranchId,
}: AppointmentDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editServices, setEditServices] = useState<{ serviceId: string; name: string; durationMin: number; price: number }[]>([]);
  const [editComment, setEditComment] = useState('');
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editClientId, setEditClientId] = useState<string | undefined>('');

  // Load client history when appointment changes
  useEffect(() => {
    if (appointment?.clientId) {
      loadClientHistory();
    }
  }, [appointment?.clientId]);

  const loadClientHistory = async () => {
    if (!appointment?.clientId) return;
    try {
      setHistoryLoading(true);
      const history = await appointmentsApi.listByClient(appointment.clientId);
      // Filter out current appointment and sort by date desc
      const filtered = history
        .filter(h => h.id !== appointment.id)
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
        .slice(0, 5);
      setClientHistory(filtered);
    } catch (err) {
      console.error('Failed to load client history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initialize edit mode
  const startEditing = async () => {
    if (!appointment) return;
    setEditEmployeeId(appointment.masterEmployeeId);
    setEditDate(formatDateYYYYMMDD(new Date(appointment.startAt)));
    setEditStartTime(formatTime(appointment.startAt));
    setEditComment(appointment.comment || '');
    setEditClientId(appointment.clientId || undefined);
    setEditServices(appointment.services.map(s => ({
      serviceId: s.service.id,
      name: s.service.name,
      durationMin: s.durationMin,
      price: s.price,
    })));
    
    // Load available services and clients
    try {
      const [servicesData, clientsData] = await Promise.all([
        servicesApi.list(selectedBranchId),
        clientsApi.list(),
      ]);
      setAvailableServices(servicesData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load data for editing:', err);
    }
    
    setIsEditing(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!appointment) return;
    try {
      setLoading(true);
      setError('');
      
      await appointmentsApi.update(appointment.id, {
        masterEmployeeId: editEmployeeId,
        date: editDate,
        startTime: editStartTime,
        comment: editComment,
        clientId: editClientId,
        services: editServices.map((s, index) => ({
          serviceId: s.serviceId,
          sortOrder: index,
        })),
      });
      
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения изменений');
    } finally {
      setLoading(false);
    }
  };

  // Add service to edit list
  const addService = (service: Service) => {
    // Get price from first available rank price or use 0
    const price = service.pricesByRank.length > 0 ? service.pricesByRank[0].price : 0;
    setEditServices(prev => [...prev, {
      serviceId: service.id,
      name: service.name,
      durationMin: service.durationMin,
      price,
    }]);
  };

  // Remove service from edit list
  const removeService = (index: number) => {
    setEditServices(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen || !appointment) return null;

  const employee = employees.find(e => e.id === appointment.masterEmployeeId);
  const duration = Math.round((new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / (1000 * 60));
  const durationHours = Math.floor(duration / 60);
  const durationMins = duration % 60;
  const durationText = durationHours > 0 
    ? `${durationHours} ч ${durationMins > 0 ? durationMins + ' мин' : ''}`
    : `${durationMins} мин`;

  const handleStatusChange = async (status: AppointmentStatus) => {
    try {
      setLoading(true);
      await appointmentsApi.updateStatus(appointment.id, status);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления статуса');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Отменить запись?')) return;
    try {
      setLoading(true);
      await appointmentsApi.cancel(appointment.id);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены записи');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleStatusChange(status.value)}
                  disabled={loading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    appointment.status === status.value
                      ? status.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{status.icon}</span>
                  {status.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {error && (
            <div className="mx-4 mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex">
            {/* Left Column - Master & Date */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-4 overflow-y-auto">
              {isEditing ? (
                // Edit Mode
                <>
                  {/* Master Select */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Мастер</label>
                    <select
                      value={editEmployeeId}
                      onChange={(e) => setEditEmployeeId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Дата</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  {/* Time Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Время начала</label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  {/* Client Select */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Клиент</label>
                    <select
                      value={editClientId || ''}
                      onChange={(e) => setEditClientId(e.target.value || undefined)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="">Без клиента</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Comment Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Комментарий</label>
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                      placeholder="Комментарий к записи..."
                    />
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading || editServices.length === 0}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      Сохранить
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </>
              ) : (
                // View Mode
                <>
                  {/* Master */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {employee?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{employee?.fullName || 'Неизвестно'}</p>
                      <p className="text-xs text-gray-500">Барбер</p>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      <span className="text-xs">
                        {new Date(appointment.startAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span className="font-bold">
                        {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{durationText}</p>
                  </div>

                  {/* Edit Button */}
                  <button 
                    onClick={startEditing}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Редактировать
                  </button>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Комментарий</label>
                    <textarea
                      defaultValue={appointment.comment || ''}
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                      placeholder="Комментарий к записи..."
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      <span className="material-symbols-outlined text-sm">notifications</span>
                      Уведомления о визите
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      <span className="material-symbols-outlined text-sm">history</span>
                      История изменений
                    </button>
                  </div>
                </>
              )}
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
                  {appointment.services.length > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                      {appointment.services.length}
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
                  {appointment.products.length > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                      {appointment.products.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Services List */}
              {activeTab === 'services' && (
                <div className="space-y-2">
                  {isEditing ? (
                    // Edit Mode - Editable Services
                    <>
                      {editServices.map((service, index) => (
                        <div
                          key={`${service.serviceId}-${index}`}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">{index + 1}</span>
                            <div>
                              <p className="font-medium text-sm">{service.name}</p>
                              <p className="text-xs text-gray-500">{service.durationMin} мин</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">{formatRubles(service.price)}</span>
                            <button 
                              onClick={() => removeService(index)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Service Dropdown */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            const service = availableServices.find(s => s.id === e.target.value);
                            if (service) {
                              addService(service);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          value=""
                        >
                          <option value="">+ Добавить услугу</option>
                          {availableServices
                            .filter(s => !editServices.some(es => es.serviceId === s.id))
                            .map(service => (
                              <option key={service.id} value={service.id}>
                                {service.name} ({service.durationMin} мин)
                              </option>
                            ))}
                        </select>
                      </div>
                      
                      {editServices.length === 0 && (
                        <p className="text-center text-gray-400 py-4">Добавьте хотя бы одну услугу</p>
                      )}
                    </>
                  ) : (
                    // View Mode - Read Only
                    <>
                      {appointment.services.map((service, index) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">{index + 1}</span>
                            <div>
                              <p className="font-medium text-sm">{service.service.name}</p>
                              <p className="text-xs text-gray-500">{service.durationMin} мин</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">{formatRubles(service.price)}</span>
                            <button className="text-gray-400 hover:text-gray-600">
                              <span className="material-symbols-outlined">more_vert</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {appointment.services.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Нет услуг</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Products List */}
              {activeTab === 'products' && (
                <div className="space-y-2">
                  {appointment.products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{product.product.name}</p>
                        <p className="text-xs text-gray-500">{product.qty} шт × {formatRubles(product.price)}</p>
                      </div>
                      <span className="font-bold text-sm">{formatRubles(product.total)}</span>
                    </div>
                  ))}

                  {appointment.products.length === 0 && (
                    <p className="text-center text-gray-400 py-8">Нет товаров</p>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="mt-auto pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Итого</span>
                  <span className="text-2xl font-bold">{formatRubles(appointment.total)}</span>
                </div>
                {appointment.isPaid && (
                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="font-medium">Оплачено</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Client Info */}
            <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Клиент</h3>
                <button className="text-primary text-sm hover:underline">Сменить</button>
              </div>

              {/* Client Card */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-400">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{appointment.client?.fullName || 'Неизвестно'}</p>
                    {appointment.client?.phone && (
                      <p className="text-sm text-gray-500">{appointment.client.phone}</p>
                    )}
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>

                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  {showHistory ? 'Скрыть историю' : 'История посещений'}
                  {clientHistory.length > 0 && (
                    <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                      {clientHistory.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Client History */}
              {showHistory && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase">История посещений</h4>
                  {historyLoading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : clientHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Нет предыдущих посещений</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {clientHistory.map((visit) => (
                        <div key={visit.id} className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{formatDateFull(new Date(visit.startAt))}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadgeColor(visit.status)}`}>
                              {getStatusLabel(visit.status)}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs">
                            {formatTime(visit.startAt)} · {visit.masterEmployee?.fullName}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            {visit.services?.map(s => s.service?.name).filter(Boolean).join(', ') || 'Нет услуг'}
                          </p>
                          <p className="font-medium text-xs mt-1">{formatRubles(visit.total)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Visit Stats */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Статистика</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Всего визитов</p>
                    <p className="font-medium">{clientHistory.length + 1}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Сумма записи</p>
                    <p className="font-medium">{formatRubles(appointment.total)}</p>
                  </div>
                </div>
              </div>

              {/* Consents */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Согласие клиента</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Обработка персональных данных</span>
                  <span className="text-gray-400">Не согласен</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Рекламная рассылка</span>
                  <span className="text-gray-400">Не согласен</span>
                </div>
              </div>

              {/* Record Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Данные записи</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Дата создания</span>
                  <span className="font-medium">-</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Статус визита</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeColor(appointment.status)}`}>
                    {getStatusLabel(appointment.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Block */}
          {appointment && (
            <div className="px-4 pb-4">
              <PaymentBlock
                appointment={appointment}
                onPaymentCreated={onUpdate}
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Удалить запись
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">check</span>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
