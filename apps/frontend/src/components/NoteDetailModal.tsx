import { useState, useEffect } from 'react';
import { clientsApi, Client } from '../api/clients';
import { servicesApi, Service } from '../api/services';
import { appointmentsApi, Appointment } from '../api/appointments';
import { Note } from '../api/notes';
import { formatDateYYYYMMDD, formatTime, formatDateFull } from '../utils/date';

interface NoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime?: string;
    clientId?: string;
    serviceId?: string;
    color: string;
  }) => void;
  onDelete: () => void;
  note: Note | null;
  branchId: string;
}

const COLORS = [
  { value: 'purple', label: 'Фиолетовый', class: 'bg-purple-500' },
  { value: 'blue', label: 'Синий', class: 'bg-blue-500' },
  { value: 'green', label: 'Зеленый', class: 'bg-green-500' },
  { value: 'orange', label: 'Оранжевый', class: 'bg-orange-500' },
  { value: 'pink', label: 'Розовый', class: 'bg-pink-500' },
];

export function NoteDetailModal({ isOpen, onClose, onSave, onDelete, note }: NoteDetailModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [color, setColor] = useState('purple');

  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadServices();
    }
  }, [isOpen]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setDescription(note.description || '');
      setDate(formatDateYYYYMMDD(new Date(note.date)));
      setStartTime(note.startTime);
      setEndTime(note.endTime || '');
      setClientId(note.clientId || '');
      setServiceId(note.serviceId || '');
      setColor(note.color);
      
      // Load client history if client is linked
      if (note.clientId) {
        loadClientHistory(note.clientId);
      } else {
        setClientHistory([]);
      }
    }
    setIsEditing(false);
  }, [note]);

  useEffect(() => {
    if (clientId && clientId !== note?.clientId) {
      loadClientHistory(clientId);
    }
  }, [clientId]);

  const loadClients = async () => {
    try {
      const data = await clientsApi.list();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadServices = async () => {
    try {
      const data = await servicesApi.list();
      setServices(data);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  const loadClientHistory = async (cid: string) => {
    try {
      const data = await appointmentsApi.listByClient(cid);
      setClientHistory(data.slice(0, 5)); // Last 5 appointments
    } catch (err) {
      console.error('Failed to load client history:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime) return;

    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        endTime: endTime || undefined,
        clientId: clientId || undefined,
        serviceId: serviceId || undefined,
        color,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

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

  if (!isOpen || !note) return null;

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedService = services.find(s => s.id === serviceId);
  const selectedColor = COLORS.find(c => c.value === color);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${selectedColor?.class || 'bg-purple-500'}`} />
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Редактирование заметки' : 'Заметка'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  Редактировать
                </button>
                <button
                  onClick={onDelete}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Удалить
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Заголовок <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Начало <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Окончание
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Клиент
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Не выбран</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName} {client.phone && `(${client.phone})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Услуга
                  </label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Не выбрана</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.durationMin} мин)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Цвет
                  </label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`w-8 h-8 rounded-full ${c.class} ${
                          color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{note.title}</h3>
                  {note.description && (
                    <p className="mt-2 text-gray-600 whitespace-pre-wrap">{note.description}</p>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-500">Дата</span>
                    <p className="font-medium">{formatDateFull(new Date(note.date))}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Время</span>
                    <p className="font-medium">
                      {note.startTime} - {note.endTime || '...'}
                    </p>
                  </div>
                  {selectedClient && (
                    <div>
                      <span className="text-sm text-gray-500">Клиент</span>
                      <p className="font-medium">{selectedClient.fullName}</p>
                      {selectedClient.phone && (
                        <p className="text-sm text-gray-500">{selectedClient.phone}</p>
                      )}
                    </div>
                  )}
                  {selectedService && (
                    <div>
                      <span className="text-sm text-gray-500">Услуга</span>
                      <p className="font-medium">{selectedService.name}</p>
                    </div>
                  )}
                </div>

                {/* Created by */}
                {note.employee && (
                  <div className="text-sm text-gray-500">
                    Создано: {note.employee.fullName}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Client History Sidebar */}
          {selectedClient && (
            <div className="w-80 border-l border-gray-200 bg-gray-50 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-500">history</span>
                История клиента
              </h3>
              
              {clientHistory.length === 0 ? (
                <p className="text-sm text-gray-500">Нет записей</p>
              ) : (
                <div className="space-y-3">
                  {clientHistory.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-white p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
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
                        <div className="mt-2 text-xs text-gray-500">
                          {appointment.services.map(s => s.service?.name).filter(Boolean).join(', ')}
                        </div>
                      )}
                      {appointment.total > 0 && (
                        <p className="text-sm font-medium text-gray-900 mt-2">
                          {appointment.total.toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
