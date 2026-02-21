import { useEffect, useMemo, useState, useRef } from 'react';
import MasterLayout from '../components/MasterLayout';
import { AppointmentModal } from '../components/AppointmentModal';
import { AppointmentDetailModal } from '../components/AppointmentDetailModal';
import { NoteModal } from '../components/NoteModal';
import { NoteDetailModal } from '../components/NoteDetailModal';
import { employeesApi, Employee } from '../api/employees';
import { appointmentsApi, Appointment, getStatusBadgeColor } from '../api/appointments';
import { clientsApi } from '../api/clients';
import { scheduleApi, WorkScheduleException, WorkScheduleBlock } from '../api/schedule';
import { notesApi, Note, getNoteColor } from '../api/notes';
import { usersApi } from '../api/users';
import { formatDateYYYYMMDD, formatTime } from '../utils/date';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 09:00 - 23:00
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function MasterCalendarPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [scheduleExceptions, setScheduleExceptions] = useState<WorkScheduleException[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<WorkScheduleBlock[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteDetailModalOpen, setIsNoteDetailModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  

  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const timeGridRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate current time position
  const currentTimePosition = useMemo(() => {
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (hour < 9 || hour > 23) return null;
    return (hour - 9) * 80; // 80px per hour
  }, [currentTime]);

  const currentTimeStr = useMemo(() => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [currentTime]);

  // Load user profile
  useEffect(() => {
    loadUser();
  }, []);

  // Load data when branch or date changes
  useEffect(() => {
    if (selectedBranchId && employee) {
      loadData();
    }
  }, [selectedBranchId, selectedDate, weekStart, viewMode, employee]);

  const loadUser = async () => {
    try {
      const profile = await usersApi.getProfile();
      if (profile.employee) {
        const emp = await employeesApi.get(profile.employee.id);
        setEmployee(emp);
        setSelectedBranchId(emp.branchId || '');
      }
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  const loadData = async () => {
    if (!employee) return;
    
    try {
      setError('');
      
      if (viewMode === 'day') {
        // Load day view
        const [apps, notesData] = await Promise.all([
          appointmentsApi.listDay(selectedBranchId, formatDateYYYYMMDD(selectedDate)),
          notesApi.listByDate(selectedBranchId, formatDateYYYYMMDD(selectedDate)),
        ]);
        
        // Filter only my appointments
        const myApps = apps.filter(a => a.masterEmployeeId === employee.id);
        setAppointments(myApps);
        setNotes(notesData);
        
        // Load schedule
        const dateStr = formatDateYYYYMMDD(selectedDate);
        const [exceptionsRes, blocksRes] = await Promise.all([
          scheduleApi.getExceptions(employee.id, dateStr, dateStr),
          scheduleApi.getBlocks(employee.id, dateStr, dateStr),
        ]);
        setScheduleExceptions(exceptionsRes.items);
        setScheduleBlocks(blocksRes.blocks);
      } else {
        // Load week view - no notes
        const weekDates = getWeekDates(weekStart);

        
        // Load all appointments for the week
        const weekApps: Appointment[] = [];
        for (const date of weekDates) {
          const apps = await appointmentsApi.listDay(selectedBranchId, formatDateYYYYMMDD(date));
          weekApps.push(...apps.filter(a => a.masterEmployeeId === employee.id));
        }
        setAppointments(weekApps);
        setNotes([]); // No notes in week view
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Ошибка загрузки данных');
    }
  };

  const getWeekDates = (start: Date): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const isWorkingDay = () => {
    if (!employee) return false;
    const dateStr = formatDateYYYYMMDD(selectedDate);
    const exception = scheduleExceptions.find(e => formatDateYYYYMMDD(new Date(e.date)) === dateStr);
    if (exception) return exception.isWorkingDay;
    return true; // Default to working if no exception
  };

  const getWorkingHours = () => {
    if (!employee || !isWorkingDay()) return null;
    const dateStr = formatDateYYYYMMDD(selectedDate);
    const exception = scheduleExceptions.find(e => formatDateYYYYMMDD(new Date(e.date)) === dateStr);
    if (exception) {
      return { start: exception.startTime, end: exception.endTime };
    }
    return null;
  };

  const getBlocksForDate = (date: Date) => {
    const dateStr = formatDateYYYYMMDD(date);
    return scheduleBlocks.filter(b => formatDateYYYYMMDD(new Date(b.date)) === dateStr);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(new Date(today));
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStartDate = new Date(today);
    weekStartDate.setDate(diff);
    setWeekStart(weekStartDate);
  };

  const goPrev = () => {
    if (viewMode === 'day') {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      setSelectedDate(prev);
    } else {
      const prev = new Date(weekStart);
      prev.setDate(prev.getDate() - 7);
      setWeekStart(prev);
    }
  };

  const goNext = () => {
    if (viewMode === 'day') {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 1);
      setSelectedDate(next);
    } else {
      const next = new Date(weekStart);
      next.setDate(next.getDate() + 7);
      setWeekStart(next);
    }
  };

  const getAppointmentsForHour = (hour: number) => {
    return appointments.filter(app => {
      const startHour = new Date(app.startAt).getHours();
      return startHour === hour;
    });
  };

  const getNotesForHour = (hour: number) => {
    return notes.filter(note => {
      const noteHour = parseInt(note.startTime.split(':')[0]);
      return noteHour === hour;
    });
  };

  // Day View
  const renderDayView = () => {
    const workingHours = getWorkingHours();
    const isWorking = isWorkingDay();
    const blocks = getBlocksForDate(selectedDate);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Employee Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {employee?.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-sm">{employee?.fullName}</div>
              <div className="text-xs text-gray-500">
                {isWorking 
                  ? workingHours 
                    ? `${workingHours.start} - ${workingHours.end}`
                    : 'Рабочий день'
                  : 'Выходной'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Time Grid */}
        <div className="flex-1 overflow-y-auto relative" ref={timeGridRef}>
          {/* Current Time Indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="flex items-center">
                <div className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded ml-1 font-bold shadow-sm">
                  {currentTimeStr}
                </div>
                <div className="flex-1 h-[1.5px] bg-red-500 relative opacity-50">
                  <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-4 ring-red-500/20"></div>
                </div>
              </div>
            </div>
          )}
          <div className="flex">
            {/* Time Labels */}
            <div className="w-14 flex-shrink-0 bg-gray-50 border-r border-gray-200">
              {HOURS.map(hour => (
                <div key={hour} className="h-20 border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs text-gray-500">{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Slots */}
            <div className="flex-1 relative">
              {HOURS.map(hour => {
                const hourAppointments = getAppointmentsForHour(hour);
                const hourNotes = getNotesForHour(hour);
                const isBeforeWork = workingHours?.start && hour < parseInt(workingHours.start.split(':')[0]);
                const isAfterWork = workingHours?.end && hour >= parseInt(workingHours.end.split(':')[0]);
                const isBlock = blocks.some(b => {
                  const startH = parseInt(b.startTime.split(':')[0]);
                  const endH = parseInt(b.endTime.split(':')[0]);
                  return hour >= startH && hour < endH;
                });

                return (
                  <div
                    key={hour}
                    className={`h-20 border-b border-gray-100 relative ${
                      !isWorking || isBeforeWork || isAfterWork ? 'bg-gray-50' : ''
                    } ${isBlock ? 'bg-amber-50' : ''}`}
                    onClick={() => {
                      if (isWorking && !isBeforeWork && !isAfterWork && !isBlock) {
                        setSelectedTime(`${String(hour).padStart(2, '0')}:00`);
                        setIsModalOpen(true);
                      }
                    }}
                  >
                    {/* Block label */}
                    {isBlock && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-amber-700 font-medium">Перерыв</span>
                      </div>
                    )}

                    {/* Appointments */}
                    <div className="p-1 space-y-1">
                      {hourAppointments.map(app => (
                        <div
                          key={app.id}
                          className={`text-xs p-1.5 rounded border-l-2 ${getStatusBadgeColor(app.status)} shadow-sm cursor-pointer`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(app);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <div className="font-medium truncate">{app.client?.fullName || 'Без имени'}</div>
                          <div className="text-[10px] opacity-75">
                            {formatTime(app.startAt)} - {formatTime(app.endAt)}
                          </div>
                        </div>
                      ))}

                      {/* Notes */}
                      {hourNotes.map(note => {
                        const colors = getNoteColor(note.color);
                        return (
                          <div
                            key={note.id}
                            className={`text-xs p-1.5 rounded border-l-2 ${colors.bg} ${colors.border} ${colors.text} shadow-sm cursor-pointer`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNote(note);
                              setIsNoteDetailModalOpen(true);
                            }}
                          >
                            <div className="font-medium truncate">{note.title}</div>
                            <div className="text-[10px] opacity-60">{note.startTime.slice(0, 5)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Week View
  const renderWeekView = () => {
    const weekDates = getWeekDates(weekStart);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Days Header */}
        <div className="flex border-b border-gray-200 bg-white">
          <div className="w-14 flex-shrink-0" /> {/* Time column */}
          {weekDates.map((date, i) => (
            <div
              key={i}
              className={`flex-1 p-2 text-center border-r border-gray-200 ${
                formatDateYYYYMMDD(date) === formatDateYYYYMMDD(new Date()) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="text-xs text-gray-500">{DAYS[i]}</div>
              <div className={`text-lg font-bold ${formatDateYYYYMMDD(date) === formatDateYYYYMMDD(new Date()) ? 'text-blue-600' : ''}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Week Grid */}
        <div className="flex-1 overflow-y-auto relative">
          {/* Current Time Indicator - only show if today is in current week */}
          {currentTimePosition !== null && weekDates.some(d => formatDateYYYYMMDD(d) === formatDateYYYYMMDD(new Date())) && (
            <div
              className="absolute left-14 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="flex items-center">
                <div className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded ml-1 font-bold shadow-sm">
                  {currentTimeStr}
                </div>
                <div className="flex-1 h-[1.5px] bg-red-500 relative opacity-50">
                  <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-4 ring-red-500/20"></div>
                </div>
              </div>
            </div>
          )}
          <div className="flex">
            {/* Time Labels */}
            <div className="w-14 flex-shrink-0 bg-gray-50 border-r border-gray-200">
              {HOURS.map(hour => (
                <div key={hour} className="h-20 border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs text-gray-500">{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {weekDates.map((date, dayIndex) => {
              const dayAppointments = appointments.filter(app => {
                const appDate = formatDateYYYYMMDD(new Date(app.startAt));
                return appDate === formatDateYYYYMMDD(date);
              });

              return (
                <div key={dayIndex} className="flex-1 border-r border-gray-200">
                  {HOURS.map(hour => {
                    const hourApps = dayAppointments.filter(app => {
                      const startHour = new Date(app.startAt).getHours();
                      return startHour === hour;
                    });

                    return (
                      <div
                        key={hour}
                        className="h-20 border-b border-gray-100 p-1"
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime(`${String(hour).padStart(2, '0')}:00`);
                          setViewMode('day');
                        }}
                      >
                        {hourApps.map(app => (
                          <div
                            key={app.id}
                            className={`text-xs p-1 rounded border-l-2 ${getStatusBadgeColor(app.status)} shadow-sm cursor-pointer mb-1`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(app);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <div className="font-medium truncate text-[10px]">{app.client?.fullName}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const statusCounts = useMemo(() => ({
    all: appointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    waiting: appointments.filter(a => a.status === 'waiting').length,
    done: appointments.filter(a => a.status === 'done').length,
  }), [appointments]);

  return (
    <MasterLayout>
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 pt-3 pb-0 flex flex-col gap-3 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Date Navigation */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button onClick={goPrev} className="p-1 hover:bg-white rounded shadow-sm">
                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                  </button>
                  <button onClick={goToToday} className="px-3 text-xs font-bold uppercase">
                    Сегодня
                  </button>
                  <button onClick={goNext} className="p-1 hover:bg-white rounded shadow-sm">
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </button>
                </div>
                <h1 className="text-xl font-bold">
                  {viewMode === 'day' 
                    ? selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                    : `${weekStart.getDate()} ${weekStart.toLocaleDateString('ru-RU', { month: 'long' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).getDate()} ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'long' })}`
                  }
                </h1>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'day' ? 'bg-white shadow-sm' : 'text-gray-600'
                  }`}
                >
                  День
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'week' ? 'bg-white shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Неделя
                </button>
              </div>
            </div>

            {/* Create Button */}
            <div className="relative">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
                <span className="font-medium">Новая запись</span>
              </button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold">
              <span>Все</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{statusCounts.all}</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              <span>Подтверждено</span>
              <span className="bg-blue-200/50 px-1.5 py-0.5 rounded-full text-[10px]">{statusCounts.confirmed}</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
              <span>Ожидание</span>
              <span className="bg-amber-200/50 px-1.5 py-0.5 rounded-full text-[10px]">{statusCounts.waiting}</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">
              <span>Выполнено</span>
              <span className="bg-green-200/50 px-1.5 py-0.5 rounded-full text-[10px]">{statusCounts.done}</span>
            </button>
          </div>
        </header>

        {/* Calendar Content */}
        {viewMode === 'day' ? renderDayView() : renderWeekView()}

        {/* Error */}
        {error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          try {
            let clientId = data.clientId;
            if (!clientId && data.clientName) {
              const newClient = await clientsApi.create({
                fullName: data.clientName,
                phone: data.clientPhone || undefined,
              });
              clientId = newClient.id;
            }
            
            await appointmentsApi.create({
              branchId: selectedBranchId,
              masterEmployeeId: employee!.id,
              type: 'service',
              date: data.date,
              startTime: data.startTime,
              clientId,
              comment: data.comment,
              services: data.services.map((s, index) => ({
                serviceId: s.serviceId,
                sortOrder: index,
              })),
            });
            
            await loadData();
            setIsModalOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка создания записи');
          }
        }}
        employees={employee ? [employee] : []}
        selectedDate={selectedDate}
        selectedBranchId={selectedBranchId}
        selectedEmployeeId={employee?.id || ''}
        selectedTime={selectedTime}
      />

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        employees={employee ? [employee] : []}
        onUpdate={loadData}
        selectedBranchId={employee?.branchId || ''}
      />

      {/* Note Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={async (data) => {
          try {
            await notesApi.create(data);
            await loadData();
            setIsNoteModalOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка создания заметки');
          }
        }}
        branchId={selectedBranchId}
        initialDate={selectedDate}
        initialStartTime={selectedTime}
      />

      {/* Note Detail Modal */}
      <NoteDetailModal
        isOpen={isNoteDetailModalOpen}
        onClose={() => {
          setIsNoteDetailModalOpen(false);
          setSelectedNote(null);
        }}
        onSave={async (data) => {
          try {
            if (selectedNote) {
              await notesApi.update(selectedNote.id, data);
              await loadData();
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка обновления заметки');
          }
        }}
        onDelete={async () => {
          try {
            if (selectedNote) {
              await notesApi.delete(selectedNote.id);
              await loadData();
              setIsNoteDetailModalOpen(false);
              setSelectedNote(null);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка удаления заметки');
          }
        }}
        note={selectedNote}
        branchId={selectedBranchId}
      />
    </MasterLayout>
  );
}
