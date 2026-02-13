import { useState, useEffect } from 'react';
import { employeesApi, Employee } from '../api/employees';
import { scheduleApi, WorkScheduleBlock } from '../api/schedule';
import { formatDateYYYYMMDD } from '../utils/date';

interface Break {
  id: string;
  startTime: string;
  endTime: string;
}

interface WorkDayInfo {
  date: string;
  startTime: string;
  endTime: string;
  breaks: Break[];
}

interface WorkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSaved?: () => void;
}

export default function WorkScheduleModal({ isOpen, onClose, employeeId, onSaved }: WorkScheduleModalProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [workDays, setWorkDays] = useState<Map<string, WorkDayInfo>>(new Map());
  const [blocks, setBlocks] = useState<WorkScheduleBlock[]>([]);
  
  // Template for selected days
  const [template, setTemplate] = useState({
    startTime: '10:00',
    endTime: '22:00',
  });
  
  // Breaks for template
  const [breaks, setBreaks] = useState<Break[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen && employeeId) {
      loadData();
    }
  }, [isOpen, employeeId, currentMonth]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      setSelectedDates(new Set());
      
      const emp = await employeesApi.get(employeeId);
      setEmployee(emp);
      
      await loadExistingWorkDays();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingWorkDays() {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const from = formatDateYYYYMMDD(new Date(year, month, 1));
      const to = formatDateYYYYMMDD(new Date(year, month + 1, 0));
      
      const exceptionsRes = await scheduleApi.getExceptions(employeeId, from, to);
      const blocksRes = await scheduleApi.getBlocks(employeeId, from, to);
      
      const blocksByDate = new Map<string, WorkScheduleBlock[]>();
      blocksRes.blocks.forEach(block => {
        // Normalize date from "2026-02-16T00:00:00.000Z" to "2026-02-16"
        const normalizedDate = block.date.split('T')[0];
        const dateBlocks = blocksByDate.get(normalizedDate) || [];
        dateBlocks.push({...block, date: normalizedDate});
        blocksByDate.set(normalizedDate, dateBlocks);
      });
      
      const newWorkDays = new Map<string, WorkDayInfo>();
      exceptionsRes.items.forEach(item => {
        if (item.isWorkingDay && item.startTime && item.endTime) {
          // Normalize date from "2026-02-16T00:00:00.000Z" to "2026-02-16"
          const normalizedDate = item.date.split('T')[0];
          const dateBlocks = blocksByDate.get(normalizedDate) || [];
          newWorkDays.set(normalizedDate, {
            date: normalizedDate,
            startTime: item.startTime,
            endTime: item.endTime,
            breaks: dateBlocks.map(b => ({
              id: b.id,
              startTime: b.startTime,
              endTime: b.endTime,
            })),
          });
        }
      });
      
      // Force update by creating new Map
      setWorkDays(new Map(newWorkDays));
      setBlocks([...blocksRes.blocks]);
    } catch (err) {
      console.error('Failed to load existing work days:', err);
    }
  }

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      prevMonthDays.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: '' });
    }
    
    const currentMonthDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDateYYYYMMDD(new Date(year, month, day));
      currentMonthDays.push({ day, isCurrentMonth: true, date });
    }
    
    const totalDays = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    const nextMonthDays = [];
    for (let day = 1; day <= remainingDays; day++) {
      nextMonthDays.push({ day, isCurrentMonth: false, date: '' });
    }
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const toggleDate = (date: string) => {
    if (!date) return;
    
    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) {
      newSelected.delete(date);
    } else {
      newSelected.add(date);
      
      // If this is the first selection and it's an existing work day, load its data as template
      if (newSelected.size === 1 && workDays.has(date)) {
        const workDay = workDays.get(date)!;
        setTemplate({
          startTime: workDay.startTime,
          endTime: workDay.endTime,
        });
        setBreaks([...workDay.breaks]);
      }
    }
    setSelectedDates(newSelected);
    setError('');
  };

  const addBreak = () => {
    setBreaks(prev => [...prev, { 
      id: `new-${Date.now()}`, 
      startTime: '13:00', 
      endTime: '14:00' 
    }]);
  };

  const removeBreak = (id: string) => {
    setBreaks(prev => prev.filter(b => b.id !== id));
  };

  const updateBreak = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setBreaks(prev => prev.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const handleSave = async () => {
    if (selectedDates.size === 0) {
      setError('Выберите хотя бы одну дату');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      let savedCount = 0;
      
      for (const date of selectedDates) {
        // Save work day (exception)
        await scheduleApi.saveException({
          employeeId,
          date,
          isWorkingDay: true,
          startTime: template.startTime,
          endTime: template.endTime,
        });
        
        // Delete existing blocks for this date
        const existingBlocks = blocks.filter(b => b.date === date);
        for (const block of existingBlocks) {
          await scheduleApi.deleteBlock(block.id);
        }
        
        // Save breaks
        for (const breakItem of breaks) {
          await scheduleApi.createBlock({
            employeeId,
            date,
            startTime: breakItem.startTime,
            endTime: breakItem.endTime,
            reason: 'Перерыв',
          });
        }
        
        savedCount++;
      }
      
      setSuccessMessage(`Сохранено ${savedCount} дней`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Clear selection
      setSelectedDates(new Set());
      
      // Reload all data from server to get fresh state with new IDs
      await loadExistingWorkDays();
      
      // Notify parent
      onSaved?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDayOff = async () => {
    if (selectedDates.size === 0) {
      setError('Выберите хотя бы одну дату');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      let removedCount = 0;
      
      for (const date of selectedDates) {
        // Delete exception (make it non-working day)
        await scheduleApi.deleteException(employeeId, date);
        
        // Delete all blocks for this date
        const existingBlocks = blocks.filter(b => b.date === date);
        for (const block of existingBlocks) {
          await scheduleApi.deleteBlock(block.id);
        }
        
        removedCount++;
      }
      
      setBreaks([]);
      setSuccessMessage(`${removedCount} дней сделано выходными`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Clear selection
      setSelectedDates(new Set());
      
      // Notify parent
      onSaved?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDates(new Set());
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDates(new Set());
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const monthDays = getMonthDays();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              {employee && (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {employee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Расписание работы</h2>
                    <p className="text-sm text-gray-500">{employee.fullName}</p>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Messages */}
          {(error || successMessage) && (
            <div className="px-6 pt-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8">
                {/* Calendar */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={goToPrevMonth}
                      className="p-1 hover:bg-white rounded-lg shadow-sm"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="font-bold text-lg">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button
                      onClick={goToNextMonth}
                      className="p-1 hover:bg-white rounded-lg shadow-sm"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                    <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((dayInfo, index) => {
                      const isSelected = dayInfo.date && selectedDates.has(dayInfo.date);
                      const workDay = dayInfo.date ? workDays.get(dayInfo.date) : null;
                      const isWorkingDay = !!workDay;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => dayInfo.isCurrentMonth && toggleDate(dayInfo.date)}
                          disabled={!dayInfo.isCurrentMonth}
                          className={`
                            aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors p-1
                            ${!dayInfo.isCurrentMonth ? 'text-gray-300 cursor-default' : 'cursor-pointer hover:bg-white hover:shadow-sm'}
                            ${isSelected ? 'bg-primary text-white hover:bg-primary' : ''}
                            ${isWorkingDay && !isSelected ? 'bg-green-100 text-green-800 border border-green-200' : ''}
                          `}
                        >
                          <span className="font-medium">{dayInfo.day}</span>
                          {isWorkingDay && !isSelected && (
                            <span className="text-[10px] leading-tight mt-0.5">
                              {workDay.startTime.slice(0, 5)}-{workDay.endTime.slice(0, 5)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary rounded"></div>
                      <span>Выбрано ({selectedDates.size})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                      <span>Рабочий</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                      <span>Выходной</span>
                    </div>
                  </div>
                </div>

                {/* Template Editor */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">
                    {selectedDates.size > 0 
                      ? `Шаблон для ${selectedDates.size} дней`
                      : 'Выберите даты'
                    }
                  </h3>
                  
                  {selectedDates.size > 0 ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Рабочее время
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="time"
                              value={template.startTime}
                              onChange={(e) => setTemplate(prev => ({ ...prev, startTime: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                            />
                            <span className="text-gray-500">—</span>
                            <input
                              type="time"
                              value={template.endTime}
                              onChange={(e) => setTemplate(prev => ({ ...prev, endTime: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Перерывы
                            </label>
                            <button
                              onClick={addBreak}
                              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                            >
                              <span className="material-symbols-outlined text-base">add</span>
                              Добавить
                            </button>
                          </div>

                          <div className="space-y-2">
                            {breaks.map((breakItem) => (
                              <div key={breakItem.id} className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={breakItem.startTime}
                                  onChange={(e) => updateBreak(breakItem.id, 'startTime', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                                />
                                <span className="text-gray-500">—</span>
                                <input
                                  type="time"
                                  value={breakItem.endTime}
                                  onChange={(e) => updateBreak(breakItem.id, 'endTime', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                                />
                                <button
                                  onClick={() => removeBreak(breakItem.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            ))}
                            {breaks.length === 0 && (
                              <p className="text-sm text-gray-400 italic">Нет перерывов</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex gap-3">
                        <button
                          onClick={handleMakeDayOff}
                          disabled={saving}
                          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
                        >
                          Сделать выходными
                        </button>
                        <div className="flex-1"></div>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined text-4xl mb-2">calendar_today</span>
                      <p>Выберите даты в календаре</p>
                      <p className="text-sm mt-1">Можно выбрать несколько</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
