import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import WorkScheduleModal from '../components/WorkScheduleModal';
import { employeesApi, Employee } from '../api/employees';
import { scheduleApi, WorkScheduleBlock } from '../api/schedule';
import { formatDateYYYYMMDD } from '../utils/date';

interface WorkDayInfo {
  date: string;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  breaks: WorkScheduleBlock[];
}

interface EmployeeSchedule {
  employee: Employee;
  workDays: Map<string, WorkDayInfo>;
}

// Schedule page for viewing all employees' weekly schedule

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [schedules, setSchedules] = useState<Map<string, EmployeeSchedule>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState<string>('');

  const weekDates = getWeekDates();

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      loadSchedules();
    }
  }, [currentWeekStart, employees]);

  function getWeekDates(): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  async function loadEmployees() {
    try {
      setLoading(true);
      const data = await employeesApi.list();
      const selectedBranchId = localStorage.getItem('selectedBranchId');
      const activeEmployees = data.filter(e => 
        e.status === 'active' && (!selectedBranchId || e.branchId === selectedBranchId)
      );
      setEmployees(activeEmployees);
      setSelectedEmployeeIds(activeEmployees.map(e => e.id));
    } catch (err) {
      setError('Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedules() {
    if (employees.length === 0) return;
    
    try {
      setLoading(true);
      const from = formatDateYYYYMMDD(weekDates[0]);
      const to = formatDateYYYYMMDD(weekDates[6]);
      const newSchedules = new Map<string, EmployeeSchedule>();

      await Promise.all(
        employees.map(async (employee) => {
          try {
            const [exceptionsRes, blocksRes] = await Promise.all([
              scheduleApi.getExceptions(employee.id, from, to),
              scheduleApi.getBlocks(employee.id, from, to),
            ]);

            // Group blocks by date (normalize from "2026-02-16T00:00:00.000Z" to "2026-02-16")
            const blocksByDate = new Map<string, WorkScheduleBlock[]>();
            blocksRes.blocks.forEach(block => {
              const normalizedDate = block.date.split('T')[0];
              const dateBlocks = blocksByDate.get(normalizedDate) || [];
              dateBlocks.push({...block, date: normalizedDate});
              blocksByDate.set(normalizedDate, dateBlocks);
            });

            // Build workDays map
            const workDays = new Map<string, WorkDayInfo>();
            exceptionsRes.items.forEach(item => {
              if (item.isWorkingDay && item.startTime && item.endTime) {
                const normalizedDate = item.date.split('T')[0];
                workDays.set(normalizedDate, {
                  date: normalizedDate,
                  isWorking: true,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  breaks: blocksByDate.get(normalizedDate) || [],
                });
              }
            });

            newSchedules.set(employee.id, {
              employee,
              workDays,
            });
          } catch (err) {
            console.error(`Failed to load schedule for ${employee.id}`, err);
          }
        })
      );

      setSchedules(newSchedules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  }

  const getCellData = (employeeId: string, date: Date): WorkDayInfo | null => {
    const schedule = schedules.get(employeeId);
    if (!schedule) return null;
    const dateStr = formatDateYYYYMMDD(date);
    return schedule.workDays.get(dateStr) || null;
  };

  const goToPrevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const openModal = (employeeId: string) => {
    setModalEmployeeId(employeeId);
    setIsModalOpen(true);
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const weekRangeText = `${weekDates[0].getDate()} ${getMonthName(weekDates[0].getMonth())}${weekDates[0].getMonth() !== weekDates[6].getMonth() ? '' : ''} - ${weekDates[6].getDate()} ${getMonthName(weekDates[6].getMonth())} ${weekDates[6].getFullYear()}`;

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header with Title */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold">Расписание сотрудников</h1>
        </header>

        {/* Navigation Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Employee Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Сотрудники:</span>
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedEmployeeIds.includes(emp.id)
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    selectedEmployeeIds.includes(emp.id) ? 'bg-white/20' : 'bg-primary/10 text-primary'
                  }`}>
                    {emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[120px]">{emp.fullName}</span>
                </button>
              ))}
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToPrevWeek}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Сегодня
              </button>
              <span className="text-lg font-medium min-w-[200px] text-center">
                {weekRangeText}
              </span>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Schedule Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="min-w-[800px] p-6">
              {/* Day Headers */}
              <div className="flex border-b border-gray-200">
                <div className="w-48 shrink-0"></div>
                {weekDates.map((date, index) => {
                  const isToday = new Date().toDateString() === date.toDateString();
                  const dayNum = date.getDate().toString().padStart(2, '0');
                  const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
                  return (
                    <div key={index} className="flex-1 min-w-[100px] p-3 text-center border-l border-gray-100">
                      <p className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-gray-600'}`}>
                        {getDayName(date)}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                        {dayNum}.{monthNum}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Employee Rows */}
              {employees
                .filter(e => selectedEmployeeIds.includes(e.id))
                .map(employee => {
                  return (
                    <div key={employee.id} className="flex border-b border-gray-100">
                      {/* Employee Info */}
                      <div className="w-48 shrink-0 p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {employee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{employee.fullName}</p>
                          <button
                            onClick={() => openModal(employee.id)}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit_calendar</span>
                            Изменить
                          </button>
                        </div>
                      </div>

                      {/* Days */}
                      {weekDates.map((date, dayIndex) => {
                        const workDay = getCellData(employee.id, date);
                        const isWorking = !!workDay;
                        
                        return (
                          <div
                            key={dayIndex}
                            className={`flex-1 min-w-[100px] p-2 border-l border-gray-100 min-h-[80px] ${
                              isWorking ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            {isWorking ? (
                              <div className="h-full flex flex-col justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-800">
                                    {workDay.startTime?.slice(0, 5)} - {workDay.endTime?.slice(0, 5)}
                                  </p>
                                  {workDay.breaks.length > 0 && (
                                    <p className="text-xs text-yellow-600 mt-1">
                                      {workDay.breaks.length} перерыв
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <span className="text-xs text-gray-400">—</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Work Schedule Modal */}
      <WorkScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employeeId={modalEmployeeId}
        onSaved={() => {
          loadSchedules();
        }}
      />
    </Layout>
  );
}

function getDayName(date: Date): string {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return days[date.getDay() === 0 ? 6 : date.getDay() - 1];
}

function getMonthName(month: number): string {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return months[month];
}
