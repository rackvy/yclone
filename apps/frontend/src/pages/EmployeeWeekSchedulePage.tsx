import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import WorkScheduleModal from '../components/WorkScheduleModal';
import { employeesApi, Employee } from '../api/employees';
import { appointmentsApi, Appointment } from '../api/appointments';
import { scheduleApi, WorkScheduleBlock } from '../api/schedule';
import { formatDateYYYYMMDD, formatTime } from '../utils/date';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 09:00 - 23:00
const SLOT_HEIGHT = 80;

interface WorkDayInfo {
  date: string;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  breaks: WorkScheduleBlock[];
}

export default function EmployeeWeekSchedulePage() {
  // Get employeeId from URL path /employee/:id/schedule
  const pathParts = window.location.pathname.split('/');
  const employeeId = pathParts[2];
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workDays, setWorkDays] = useState<WorkDayInfo[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(() => {
    // Check if URL has openModal=true
    const params = new URLSearchParams(window.location.search);
    return params.get('openModal') === 'true';
  });

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId, currentWeekStart]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      
      // Load employee
      const emp = await employeesApi.get(employeeId);
      setEmployee(emp);
      
      // Load appointments for the week
      const weekDates = getWeekDates();
      const apps: Appointment[] = [];
      
      for (const date of weekDates) {
        const dateStr = formatDateYYYYMMDD(date);
        const dayApps = await appointmentsApi.listDay(emp.branchId || '', dateStr);
        apps.push(...dayApps.filter(a => a.masterEmployeeId === employeeId));
      }
      setAppointments(apps);
      
      // Load work days info from exceptions
      const from = formatDateYYYYMMDD(weekDates[0]);
      const to = formatDateYYYYMMDD(weekDates[6]);
      const [exceptionsRes, blocksRes] = await Promise.all([
        scheduleApi.getExceptions(employeeId, from, to),
        scheduleApi.getBlocks(employeeId, from, to),
      ]);
      
      // Group blocks by date (normalize from "2026-02-16T00:00:00.000Z" to "2026-02-16")
      const blocksByDate = new Map<string, WorkScheduleBlock[]>();
      blocksRes.blocks.forEach(block => {
        const normalizedDate = block.date.split('T')[0];
        const dateBlocks = blocksByDate.get(normalizedDate) || [];
        dateBlocks.push({...block, date: normalizedDate});
        blocksByDate.set(normalizedDate, dateBlocks);
      });
      
      // Build workDays from exceptions
      const workDaysData: WorkDayInfo[] = weekDates.map(date => {
        const dateStr = formatDateYYYYMMDD(date);
        const exception = exceptionsRes.items.find(e => e.date.split('T')[0] === dateStr);
        if (exception && exception.isWorkingDay) {
          return {
            date: dateStr,
            isWorking: true,
            startTime: exception.startTime,
            endTime: exception.endTime,
            breaks: blocksByDate.get(dateStr) || [],
          };
        }
        return {
          date: dateStr,
          isWorking: false,
          startTime: null,
          endTime: null,
          breaks: [],
        };
      });
      setWorkDays(workDaysData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getDayName = (date: Date): string => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return days[date.getDay() === 0 ? 6 : date.getDay() - 1];
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

  const getAppointmentsForDay = (date: Date): Appointment[] => {
    const dateStr = formatDateYYYYMMDD(date);
    return appointments.filter(a => a.startAt.startsWith(dateStr));
  };

  const getAppointmentStyle = (appointment: Appointment) => {
    const startMatch = appointment.startAt.match(/T(\d{2}):(\d{2})/);
    const endMatch = appointment.endAt.match(/T(\d{2}):(\d{2})/);
    
    if (!startMatch || !endMatch) {
      return { top: '0px', height: '50px' };
    }
    
    const startHour = parseInt(startMatch[1]) + parseInt(startMatch[2]) / 60;
    const endHour = parseInt(endMatch[1]) + parseInt(endMatch[2]) / 60;
    const duration = endHour - startHour;
    
    const top = (startHour - 9) * SLOT_HEIGHT + 4;
    const height = Math.max(duration * SLOT_HEIGHT - 8, 40);
    
    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const weekDates = getWeekDates();
  const weekRangeText = `${weekDates[0].getDate()} ${getMonthName(weekDates[0].getMonth())} - ${weekDates[6].getDate()} ${getMonthName(weekDates[6].getMonth())}`;

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {employee && (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {employee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{employee.fullName}</h1>
                    <p className="text-sm text-gray-500">Недельное расписание</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={goToPrevWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined">calendar_add_on</span>
              Редактировать расписание
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
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          /* Week Grid */
          <div className="flex-1 overflow-auto">
            <div className="min-w-[1000px] p-6">
              {/* Day Headers */}
              <div className="flex border-b border-gray-200">
                <div className="w-16 shrink-0"></div>
                {weekDates.map((date, index) => {
                  const isToday = new Date().toDateString() === date.toDateString();
                  const workDay = workDays[index];
                  return (
                    <div key={index} className="flex-1 min-w-[140px] p-3 text-center border-l border-gray-100">
                      <p className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-gray-600'}`}>
                        {getDayName(date)}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                        {date.getDate()}
                      </p>
                      {workDay?.isWorking ? (
                        <p className="text-xs text-gray-500">
                          {workDay.startTime} - {workDay.endTime}
                        </p>
                      ) : (
                        <p className="text-xs text-red-500">Выходной</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div className="flex">
                {/* Time Column */}
                <div className="w-16 shrink-0 border-r border-gray-200">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-gray-100 text-center text-xs text-gray-500"
                      style={{ height: `${SLOT_HEIGHT}px`, paddingTop: '4px' }}
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDates.map((date, dayIndex) => {
                  const dayApps = getAppointmentsForDay(date);
                  const workDay = workDays[dayIndex];
                  
                  return (
                    <div
                      key={dayIndex}
                      className="flex-1 min-w-[140px] border-l border-gray-100 relative"
                    >
                      {/* Time slots */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-b border-gray-100"
                          style={{ height: `${SLOT_HEIGHT}px` }}
                        >
                          {!workDay?.isWorking && (
                            <div className="h-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xs text-gray-400">—</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Breaks */}
                      {workDay?.breaks.map(block => {
                        const startMatch = block.startTime.match(/(\d{2}):(\d{2})/);
                        const endMatch = block.endTime.match(/(\d{2}):(\d{2})/);
                        if (!startMatch || !endMatch) return null;
                        
                        const startHour = parseInt(startMatch[1]) + parseInt(startMatch[2]) / 60;
                        const endHour = parseInt(endMatch[1]) + parseInt(endMatch[2]) / 60;
                        const top = (startHour - 9) * SLOT_HEIGHT;
                        const height = (endHour - startHour) * SLOT_HEIGHT;
                        
                        return (
                          <div
                            key={block.id}
                            className="absolute left-0 right-0 bg-yellow-100 border-y border-yellow-300 flex items-center justify-center"
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <span className="text-xs text-yellow-700 font-medium">Перерыв</span>
                          </div>
                        );
                      })}

                      {/* Appointments */}
                      {dayApps.map(app => (
                        <div
                          key={app.id}
                          className="absolute left-1 right-1 bg-primary text-white rounded-lg p-2 text-xs shadow-sm overflow-hidden cursor-pointer hover:bg-primary/90 z-10"
                          style={getAppointmentStyle(app)}
                        >
                          <p className="font-semibold truncate">{app.client?.fullName || 'Клиент'}</p>
                          <p className="opacity-80">
                            {formatTime(app.startAt)} - {formatTime(app.endAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Work Schedule Modal */}
      <WorkScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employeeId={employeeId}
        onSaved={() => {
          // Reload data after modal closes
          loadData();
        }}
      />
    </Layout>
  );
}

function getMonthName(month: number): string {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return months[month];
}
