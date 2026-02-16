import { useState, useEffect } from 'react';
import { clientsApi, Client } from '../api/clients';
import { servicesApi, Service } from '../api/services';
import { formatDateYYYYMMDD } from '../utils/date';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    branchId: string;
    clientId?: string;
    serviceId?: string;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime?: string;
    color: string;
  }) => void;
  branchId: string;
  initialDate?: Date;
  initialStartTime?: string;
}

const COLORS = [
  { value: 'purple', label: 'Фиолетовый', class: 'bg-purple-500' },
  { value: 'blue', label: 'Синий', class: 'bg-blue-500' },
  { value: 'green', label: 'Зеленый', class: 'bg-green-500' },
  { value: 'orange', label: 'Оранжевый', class: 'bg-orange-500' },
  { value: 'pink', label: 'Розовый', class: 'bg-pink-500' },
];

export function NoteModal({ isOpen, onClose, onSave, branchId, initialDate, initialStartTime }: NoteModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  
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
      
      // Set initial values
      if (initialDate) {
        setDate(formatDateYYYYMMDD(initialDate));
      }
      if (initialStartTime) {
        setStartTime(initialStartTime);
        // Default end time is +1 hour
        const [hours, minutes] = initialStartTime.split(':').map(Number);
        const endHour = hours + 1;
        setEndTime(`${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
      }
    }
  }, [isOpen, initialDate, initialStartTime]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime) return;

    setLoading(true);
    try {
      await onSave({
        branchId,
        clientId: clientId || undefined,
        serviceId: serviceId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        endTime: endTime || undefined,
        color,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setClientId('');
    setServiceId('');
    setColor('purple');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Новая заметка</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Подготовка к мероприятию"
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
              placeholder="Дополнительные детали..."
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
              Клиент (опционально)
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
              Услуга (опционально)
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
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
