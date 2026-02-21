import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { AppointmentModal } from '../components/AppointmentModal';
import { AppointmentDetailModal } from '../components/AppointmentDetailModal';
import { NoteModal } from '../components/NoteModal';
import { NoteDetailModal } from '../components/NoteDetailModal';
import { branchesApi, Branch } from '../api/branches';
import { employeesApi, Employee } from '../api/employees';
import { appointmentsApi, Appointment, getStatusLabel, getStatusColor, getStatusBadgeColor } from '../api/appointments';
import { clientsApi } from '../api/clients';
import { scheduleApi, WorkScheduleException, WorkScheduleBlock } from '../api/schedule';
import { notesApi, Note, getNoteColor } from '../api/notes';
import { formatDateYYYYMMDD, formatTime } from '../utils/date';

// Custom scrollbar styles for consistent cross-browser behavior
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 6px;
    border: 2px solid #f1f1f1;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f1f1f1;
  }
`;

const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 09:00 - 23:00
const SLOT_HEIGHT = 80; // px per hour - increased for better visibility

export function CalendarPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Per-date schedule only (no weekly rules)
  const [scheduleExceptions, setScheduleExceptions] = useState<Record<string, WorkScheduleException[]>>({});
  const [scheduleBlocks, setScheduleBlocks] = useState<Record<string, WorkScheduleBlock[]>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const savedDate = localStorage.getItem('calendarDate');
    if (savedDate) {
      localStorage.removeItem('calendarDate');
      // Parse YYYY-MM-DD directly to avoid timezone shift
      const [y, m, d] = savedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteDetailModalOpen, setIsNoteDetailModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Dropdown menu state
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  // Drag & Drop states
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ employeeId: string; hour: number } | null>(null);

  // Load branches and selected branch from localStorage on mount
  useEffect(() => {
    loadBranches();
  }, []);

  // When branches loaded, validate and set selected branch
  useEffect(() => {
    if (branches.length === 0) return;
    
    const savedBranchId = localStorage.getItem('selectedBranchId');
    // Check if saved branch exists in current branches
    const branchExists = branches.some(b => b.id === savedBranchId);
    
    if (savedBranchId && branchExists) {
      setSelectedBranchId(savedBranchId);
    } else {
      // Use first branch and update localStorage
      const firstBranch = branches[0];
      setSelectedBranchId(firstBranch.id);
      localStorage.setItem('selectedBranchId', firstBranch.id);
    }
  }, [branches]);

  const loadBranches = async () => {
    try {
      const data = await branchesApi.list();
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  // Load employees and appointments when branch/date changes
  useEffect(() => {
    if (selectedBranchId) {
      loadData();
    }
  }, [selectedBranchId, selectedDate]);

  // Save selected date to localStorage for sidebar highlight sync
  useEffect(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    localStorage.setItem('calendarDate', `${year}-${month}-${day}`);
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading appointments for:', selectedBranchId, formatDateYYYYMMDD(selectedDate));
      
      // Load employees and appointments (critical data)
      const [emps, apps] = await Promise.all([
        employeesApi.list(),
        appointmentsApi.listDay(selectedBranchId, formatDateYYYYMMDD(selectedDate)),
      ]);
      
      // Load notes separately (non-critical)
      try {
        const notesData = await notesApi.listByDate(selectedBranchId, formatDateYYYYMMDD(selectedDate));
        setNotes(notesData);
      } catch (notesErr) {
        console.error('Failed to load notes:', notesErr);
        setNotes([]); // Reset notes on error
      }
      
      console.log('Loaded appointments:', apps.length, apps.map(a => ({ id: a.id, startAt: a.startAt, endAt: a.endAt })));
      // Filter employees by selected branch and active status
      const filteredEmployees = emps.filter(e => 
        e.status === 'active' && e.branchId === selectedBranchId
      );
      setEmployees(filteredEmployees);
      setAppointments(apps);
      
      // Load schedule for each employee
      await loadSchedules(filteredEmployees);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };
  
  const loadSchedules = async (emps: Employee[]) => {
    const dateStr = formatDateYYYYMMDD(selectedDate);
    const exceptions: Record<string, WorkScheduleException[]> = {};
    const blocks: Record<string, WorkScheduleBlock[]> = {};
    
    await Promise.all(
      emps.map(async (emp) => {
        try {
          const [exceptionsRes, blocksRes] = await Promise.all([
            scheduleApi.getExceptions(emp.id, dateStr, dateStr),
            scheduleApi.getBlocks(emp.id, dateStr, dateStr),
          ]);
          exceptions[emp.id] = exceptionsRes.items;
          blocks[emp.id] = blocksRes.blocks;
        } catch (err) {
          console.error(`Failed to load schedule for ${emp.id}:`, err);
          exceptions[emp.id] = [];
          blocks[emp.id] = [];
        }
      })
    );
    
    setScheduleExceptions(exceptions);
    setScheduleBlocks(blocks);
  };

  const dateStr = useMemo(() => {
    return selectedDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate]);

  const goToToday = () => setSelectedDate(new Date());
  const goPrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  // Get appointments for specific employee
  const getEmployeeAppointments = (employeeId: string) => {
    return appointments.filter(a => a.masterEmployeeId === employeeId);
  };
  
  // Check if employee is working on selected date (per-date exceptions only)
  const isEmployeeWorking = (employeeId: string): boolean => {
    const exceptions = scheduleExceptions[employeeId] || [];
    
    // Check exceptions - employee works only if there's an exception for this date
    const exception = exceptions.find(e => e.date.split('T')[0] === formatDateYYYYMMDD(selectedDate));
    return exception ? exception.isWorkingDay : false;
  };
  
  // Get working hours for employee (per-date exceptions only)
  const getEmployeeWorkingHours = (employeeId: string): { start: number; end: number } | null => {
    const exceptions = scheduleExceptions[employeeId] || [];
    
    // Check exceptions only
    const exception = exceptions.find(e => e.date.split('T')[0] === formatDateYYYYMMDD(selectedDate));
    if (!exception || !exception.isWorkingDay || !exception.startTime || !exception.endTime) {
      return null;
    }
    
    const [startH, startM] = exception.startTime.split(':').map(Number);
    const [endH, endM] = exception.endTime.split(':').map(Number);
    
    return {
      start: startH + startM / 60,
      end: endH + endM / 60,
    };
  };
  
  // Get blocks (breaks) for employee
  const getEmployeeBlocks = (employeeId: string): WorkScheduleBlock[] => {
    return scheduleBlocks[employeeId] || [];
  };
  
  // Check if time slot is blocked (break)
  const isTimeBlocked = (employeeId: string, hour: number): boolean => {
    const blocks = getEmployeeBlocks(employeeId);
    return blocks.some(block => {
      const [startH, startM] = block.startTime.split(':').map(Number);
      const [endH, endM] = block.endTime.split(':').map(Number);
      const blockStart = startH + startM / 60;
      const blockEnd = endH + endM / 60;
      return hour >= blockStart && hour < blockEnd;
    });
  };

  // Calculate position for appointment card
  const getAppointmentStyle = (appointment: Appointment) => {
    // Parse UTC time from ISO string to avoid timezone shifts
    const startMatch = appointment.startAt.match(/T(\d{2}):(\d{2})/);
    const endMatch = appointment.endAt.match(/T(\d{2}):(\d{2})/);
    
    if (!startMatch || !endMatch) {
      return { top: '0px', height: '50px' };
    }
    
    const startHour = parseInt(startMatch[1]) + parseInt(startMatch[2]) / 60;
    const endHour = parseInt(endMatch[1]) + parseInt(endMatch[2]) / 60;
    const duration = endHour - startHour;
    
    const top = (startHour - 9) * SLOT_HEIGHT + 4; // +4 for padding
    const height = Math.max(duration * SLOT_HEIGHT - 8, 40); // minimum 40px
    
    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  // Current time state that updates every minute
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Get current time indicator position
  const currentTimePosition = useMemo(() => {
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    const lastHour = HOURS[HOURS.length - 1];
    if (hour < 9 || hour > lastHour + 1) return null;
    return (hour - 9) * SLOT_HEIGHT;
  }, [currentTime]);

  // Format current time for display (use local time directly)
  const currentTimeStr = useMemo(() => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [currentTime]);

  // Count appointments by status
  const statusCounts = useMemo(() => {
    return {
      new: appointments.filter(a => a.status === 'new').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      waiting: appointments.filter(a => a.status === 'waiting').length,
      done: appointments.filter(a => a.status === 'done').length,
      no_show: appointments.filter(a => a.status === 'no_show').length,
    };
  }, [appointments]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  
  // Handle cell click for quick appointment booking
  const handleCellClick = (employeeId: string, hour: number) => {
    // Check if employee is working
    if (!isEmployeeWorking(employeeId)) {
      return; // Don't open modal on day off
    }
    
    // Check if time is blocked (break)
    if (isTimeBlocked(employeeId, hour)) {
      return; // Don't open modal during break
    }
    
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    setSelectedEmployeeId(employeeId);
    setSelectedTime(timeStr);
    setIsModalOpen(true);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, app: Appointment) => {
    console.log('Drag start:', app.id);
    setDraggedAppointment(app);
    e.dataTransfer.effectAllowed = 'move';
    // Set ghost image or data
    e.dataTransfer.setData('text/plain', app.id);
  };

  const handleDragEnd = () => {
    console.log('Drag end');
    setDraggedAppointment(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, employeeId: string, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const appId = e.dataTransfer.getData('text/plain');
    console.log('Drop:', { appId, employeeId, hour, draggedAppointment });
    
    if (!draggedAppointment && !appId) {
      console.log('No dragged appointment');
      return;
    }

    const appointment = draggedAppointment || appointments.find(a => a.id === appId);
    if (!appointment) {
      console.log('Appointment not found');
      return;
    }

    const newTime = `${String(hour).padStart(2, '0')}:00`;
    
    try {
      console.log('Rescheduling:', appointment.id, 'to', newTime);
      // Reschedule appointment - API expects date and startTime only
      const result = await appointmentsApi.reschedule(appointment.id, {
        date: formatDateYYYYMMDD(selectedDate),
        startTime: newTime,
      });
      console.log('Reschedule result:', result);
      console.log('New times:', { startAt: result.startAt, endAt: result.endAt });
      
      // Optimistically update the appointment in local state
      const updatedAppointment = { 
        ...appointment, 
        startAt: result.startAt, 
        endAt: result.endAt, 
        masterEmployeeId: result.masterEmployeeId 
      };
      setAppointments(prev => prev.map(a => a.id === appointment.id ? updatedAppointment : a));
      
      // Check if appointment is visible in current view
      const startHour = new Date(result.startAt).getHours();
      console.log('Start hour:', startHour, 'Visible range:', HOURS[0], '-', HOURS[HOURS.length-1]);
      
      // Then reload from server
      await loadData();
    } catch (err) {
      console.error('Reschedule error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка перемещения записи');
    } finally {
      setDraggedAppointment(null);
    }
  };

  return (
    <Layout>
    <style>{scrollbarStyles}</style>
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 pt-3 pb-0 flex flex-col gap-3 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Date Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={goPrev}
                  className="p-1 hover:bg-white rounded shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 text-xs font-bold uppercase tracking-wider"
                >
                  Сегодня
                </button>
                <button
                  onClick={goNext}
                  className="p-1 hover:bg-white rounded shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
              <span className="text-lg font-bold ml-2 capitalize">{dateStr}</span>
            </div>

            {/* Branch Name Display */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
              <span className="material-symbols-outlined text-lg">storefront</span>
              <span>{selectedBranch?.name || 'Филиал не выбран'}</span>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            {/* Create Button with Dropdown */}
            <div className="relative flex">
              {/* Dropdown toggle */}
              <button
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="flex items-center justify-center bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-l-lg border-r border-white/20 transition-colors"
              >
                <span className="material-symbols-outlined">expand_more</span>
              </button>
              {/* Main button */}
              <button 
                onClick={() => {
                  setSelectedEmployeeId('');
                  setSelectedTime('');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-r-lg text-sm font-bold shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                <span>Новая запись</span>
              </button>
              
              {/* Dropdown Menu */}
              {isCreateMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsCreateMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        setSelectedTime('');
                        setIsNoteModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-amber-500">sticky_note_2</span>
                      <span className="font-medium">Новая заметка</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        // Open task modal in Layout - using custom event
                        window.dispatchEvent(new CustomEvent('openTaskModal'));
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-purple-500">assignment</span>
                      <span className="font-medium">Новая задача</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 pb-3 overflow-x-auto no-scrollbar">
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-sm border border-primary transition-all">
            <span>Все</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{appointments.length}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-all">
            <span>Подтверждено</span>
            <span className="bg-blue-200/50 px-1.5 py-0.5 rounded-full text-[10px]">{statusCounts.confirmed}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-all">
            <span>Ожидание</span>
            <span className="bg-amber-200/50 px-1.5 py-0.5 rounded-full text-[10px]">{statusCounts.waiting}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100 hover:bg-green-100 transition-all">
            <span>Выполнено</span>
            <span className="bg-green-200/50 px-1.5 py-0.5 rounded-full text-[10px]">{statusCounts.done}</span>
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && (
        <>
          {/* Employee Headers */}
          <div className="bg-white border-b border-gray-200 z-10 sticky top-0 shadow-sm">
            <div className="flex">
              {/* Time column header */}
              <div className="w-16 border-r border-gray-200 bg-gray-50/50 shrink-0"></div>
              {/* Employee columns - filter only working employees */}
              {employees.filter(emp => isEmployeeWorking(emp.id)).map(emp => {
                const workingHours = getEmployeeWorkingHours(emp.id);
                return (
                  <div key={emp.id} className="flex-1 min-w-[200px] border-r border-gray-200 p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{emp.fullName}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">
                          {workingHours 
                            ? `${String(Math.floor(workingHours.start)).padStart(2, '0')}:00 - ${String(Math.floor(workingHours.end)).padStart(2, '0')}:00`
                            : 'Мастер'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {employees.filter(emp => isEmployeeWorking(emp.id)).length === 0 && (
                <div className="flex-1 p-3 text-center text-gray-500 text-sm">
                  Нет работающих сотрудников на эту дату
                </div>
              )}
              {/* Notes column header */}
              <div className="w-56 min-w-[14rem] border-r border-gray-200 p-3 bg-amber-50/50" style={{ marginRight: '10px' }}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">sticky_note_2</span>
                  <span className="font-bold text-sm text-amber-900">Заметки</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Time Grid */}
          <div className="flex-1 overflow-y-scroll relative bg-white custom-scrollbar">
            {/* Current Time Indicator */}
            {currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: `${currentTimePosition}px` }}
              >
                <div className="flex items-center">
                  <div className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded ml-[50px] font-bold shadow-sm">
                    {currentTimeStr}
                  </div>
                  <div className="flex-1 h-[1.5px] bg-red-500 relative opacity-50">
                    <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-4 ring-red-500/20"></div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex min-h-full">
              {/* Time Column */}
              <div className="w-16 border-r border-gray-200 bg-gray-50 shrink-0">
                {HOURS.map((hour, index) => {
                  const isLast = index === HOURS.length - 1;
                  return (
                    <div
                      key={hour}
                      className="relative border-b border-gray-100"
                      style={{ height: `${SLOT_HEIGHT}px` }}
                    >
                      {/* Full hour */}
                      <div className="absolute top-0 left-0 right-0 flex justify-center py-1">
                        <span className="text-xs font-bold text-gray-500">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                      </div>
                      {/* Half hour - hide for last hour */}
                      {!isLast && (
                        <div className="absolute top-1/2 left-0 right-0 flex justify-end pr-2">
                          <span className="text-[10px] text-gray-300">
                            {hour.toString().padStart(2, '0')}:30
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Employee Columns - filter only working employees */}
              {employees.filter(emp => isEmployeeWorking(emp.id)).map(emp => {
                const empApps = getEmployeeAppointments(emp.id);
                const workingHours = getEmployeeWorkingHours(emp.id);
                const blocks = getEmployeeBlocks(emp.id);
                return (
                  <div
                    key={emp.id}
                    className="flex-1 min-w-[200px] border-r border-gray-100 relative"
                  >
                    {/* Time slots with half-hour lines */}
                    {HOURS.map((hour, index) => {
                      const isLast = index === HOURS.length - 1;
                      const isDragOver = dragOverCell?.employeeId === emp.id && dragOverCell?.hour === hour;
                      const isBlocked = isTimeBlocked(emp.id, hour);
                      const isOutsideWorkingHours = workingHours && (hour < workingHours.start || hour >= workingHours.end);
                      
                      return (
                        <div
                          key={hour}
                          className={`relative border-b border-gray-100 transition-colors ${
                            isDragOver ? 'bg-primary/20' : 
                            isBlocked ? 'bg-amber-50' : 
                            isOutsideWorkingHours ? 'bg-gray-100' :
                            'hover:bg-gray-50 cursor-pointer'
                          }`}
                          style={{ height: `${SLOT_HEIGHT}px` }}
                          onClick={() => !isBlocked && !isOutsideWorkingHours && handleCellClick(emp.id, hour)}
                          onDragOver={(e) => {
                            handleDragOver(e);
                            setDragOverCell({ employeeId: emp.id, hour });
                          }}
                          onDragLeave={() => setDragOverCell(null)}
                          onDrop={(e) => {
                            setDragOverCell(null);
                            handleDrop(e, emp.id, hour);
                          }}
                        >
                          {/* Half-hour line */}
                          {!isLast && (
                            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-100 pointer-events-none"></div>
                          )}
                          
                          {/* Blocked (break) indicator */}
                          {isBlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-amber-100/50">
                              <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">coffee</span>
                                Перерыв
                              </span>
                            </div>
                          )}
                          
                          {/* Outside working hours indicator */}
                          {isOutsideWorkingHours && !isBlocked && (
                            <div className="absolute inset-0 bg-gray-200/30"></div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Break blocks overlay */}
                    {blocks.map(block => {
                      const [startH, startM] = block.startTime.split(':').map(Number);
                      const [endH, endM] = block.endTime.split(':').map(Number);
                      const blockStart = startH + startM / 60;
                      const blockEnd = endH + endM / 60;
                      const top = (blockStart - 9) * SLOT_HEIGHT;
                      const height = (blockEnd - blockStart) * SLOT_HEIGHT;
                      
                      return (
                        <div
                          key={block.id}
                          className="absolute left-0 right-0 bg-amber-100 border-y border-amber-200 flex items-center justify-center pointer-events-none"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <span className="text-xs text-amber-800 font-medium">
                            {block.reason || 'Перерыв'}
                          </span>
                        </div>
                      );
                    })}

                    {/* Appointments */}
                    {empApps.map(app => {
                      const isPast = new Date(app.endAt) < new Date();
                      return (
                        <div
                          key={app.id}
                          onMouseDown={(e) => {
                            // Prevent drag from interfering with click
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('Clicked appointment:', app.id);
                            setSelectedAppointment(app);
                            setIsEditModalOpen(true);
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, app);
                          }}
                          onDragEnd={handleDragEnd}
                          className={`absolute left-1 right-1 rounded-lg p-2 shadow-sm flex flex-col justify-between cursor-move hover:shadow-lg transition-all border-l-4 ${getStatusColor(app.status)} border border-gray-100 overflow-hidden ${isPast ? 'opacity-50 grayscale' : ''} ${draggedAppointment?.id === app.id ? 'opacity-50' : ''}`}
                          style={getAppointmentStyle(app)}
                        >
                          <div className="min-w-0">
                            {/* Client Name + Status Badge inline */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-[12px] font-bold text-gray-900 truncate leading-tight flex-1">
                                {app.client?.fullName || app.title || 'Без имени'}
                              </p>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${getStatusBadgeColor(app.status)}`}>
                                {getStatusLabel(app.status).toUpperCase()}
                              </span>
                            </div>
                            {/* Phone */}
                            {app.client?.phone && (
                              <p className="text-[10px] text-gray-600 font-medium truncate mb-0.5">{app.client.phone}</p>
                            )}
                            {/* Services */}
                            {app.services && app.services.length > 0 && (
                              <p className="text-[10px] text-gray-500 truncate leading-tight">
                                {app.services.map(s => s.service?.name || 'Услуга').join(', ')}
                              </p>
                            )}
                          </div>
                          {/* Time + Paid Icon */}
                          <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-100">
                            <span className="text-[10px] font-medium text-gray-500">
                              {formatTime(app.startAt)} - {formatTime(app.endAt)}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-gray-700">
                                {app.total?.toLocaleString('ru-RU')} ₽
                              </span>
                              {app.isPaid && (
                                <span className="material-symbols-outlined text-[14px] text-green-600">payments</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Notes Column */}
              <div className="w-56 min-w-[14rem] border-r border-gray-100 relative bg-amber-50/30">
                {/* Time slots for notes */}
                {HOURS.map((hour, index) => {
                  const isLast = index === HOURS.length - 1;
                  const hourNotes = notes.filter(n => {
                    const noteHour = parseInt(n.startTime.split(':')[0]);
                    return noteHour === hour;
                  });
                  
                  return (
                    <div
                      key={hour}
                      className="relative border-b border-gray-100"
                      style={{ height: `${SLOT_HEIGHT}px` }}
                    >
                      {/* Half-hour line */}
                      {!isLast && (
                        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-200 pointer-events-none"></div>
                      )}
                      
                      {/* Notes for this hour */}
                      <div className="p-1 space-y-1">
                        {hourNotes.map(note => {
                          const colors = getNoteColor(note.color);
                          return (
                            <div
                              key={note.id}
                              className={`text-xs p-1.5 rounded border-l-2 ${colors.bg} ${colors.border} ${colors.text} shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
                              onClick={() => {
                                setSelectedNote(note);
                                setIsNoteDetailModalOpen(true);
                              }}
                            >
                              <div className="font-medium truncate">{note.title}</div>
                              {note.client && (
                                <div className="text-[10px] opacity-75 truncate">{note.client.fullName}</div>
                              )}
                              <div className="text-[10px] opacity-60">{note.startTime.slice(0, 5)} - {note.endTime.slice(0, 5)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {employees.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                    <p>Добавьте сотрудников в настройках</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Stats */}
          <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Подтверждено: {statusCounts.confirmed}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Ожидание: {statusCounts.waiting}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Выполнено: {statusCounts.done}
              </span>
            </div>
            <div className="font-medium text-gray-600">
              Общая выручка: {appointments.reduce((sum, a) => sum + a.total, 0).toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </>
      )}

      {/* Edit Appointment Modal */}
      <AppointmentDetailModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        appointment={selectedAppointment}
        employees={employees}
        onUpdate={loadData}
        selectedBranchId={selectedBranchId}
      />

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          try {
            // Validate schedule constraints
            const empId = data.employeeId;
            const [startH, startM] = data.startTime.split(':').map(Number);
            const startHour = startH + startM / 60;
            
            // Check if employee is working
            if (!isEmployeeWorking(empId)) {
              setError('Мастер не работает в этот день');
              return;
            }
            
            // Check working hours
            const workingHours = getEmployeeWorkingHours(empId);
            if (workingHours) {
              const [endH, endM] = data.endTime.split(':').map(Number);
              const endHour = endH + endM / 60;
              
              if (startHour < workingHours.start || endHour > workingHours.end) {
                setError('Время записи выходит за рамки рабочего времени мастера');
                return;
              }
            }
            
            // Check for breaks
            if (isTimeBlocked(empId, startHour)) {
              setError('Нельзя записаться на время перерыва');
              return;
            }
            
            let clientId = data.clientId;
            
            // Create new client if no clientId but has name
            if (!clientId && data.clientName) {
              const newClient = await clientsApi.create({
                fullName: data.clientName,
                phone: data.clientPhone || undefined,
                email: data.clientEmail || undefined,
              });
              clientId = newClient.id;
            }
            
            // Create appointment with correct API format
            const appointment = await appointmentsApi.create({
              branchId: selectedBranchId,
              masterEmployeeId: data.employeeId,
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
            
            // Add products if any
            if (data.products.length > 0) {
              await appointmentsApi.addProducts(
                appointment.id,
                data.products.map(p => ({
                  productId: p.productId,
                  qty: p.qty,
                }))
              );
            }
            
            // Reload appointments
            await loadData();
            setIsModalOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка создания записи');
          }
        }}
        employees={employees}
        selectedDate={selectedDate}
        selectedBranchId={selectedBranchId}
        selectedEmployeeId={selectedEmployeeId}
        selectedTime={selectedTime}
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
    </div>
    </Layout>
  );
}
