import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Helper to get UTC dates for consistent DB queries
function getUTCDateParts(d: Date) {
    return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        date: d.getUTCDate(),
    };
}

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async getStats(companyId: string, branchId?: string) {
        const now = new Date();
        const { year, month, date } = getUTCDateParts(now);
        
        // Today in UTC (00:00:00 UTC)
        const today = new Date(Date.UTC(year, month, date, 0, 0, 0));
        const tomorrow = new Date(Date.UTC(year, month, date + 1, 0, 0, 0));

        // Month boundaries in UTC
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        const firstDayOfLastMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const lastDayOfLastMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        // Build where clause
        const buildWhere = (dateFrom?: Date, dateTo?: Date) => {
            const where: any = {
                companyId,
                status: { not: 'canceled' },
            };
            if (branchId) where.branchId = branchId;
            if (dateFrom) where.startAt = { gte: dateFrom };
            if (dateTo) where.startAt = { ...where.startAt, lt: dateTo };
            return where;
        };

        // Today's appointments
        const todayAppointments = await this.prisma.appointment.count({
            where: buildWhere(today, tomorrow),
        });

        // Today's revenue
        const todayRevenue = await this.prisma.appointment.aggregate({
            where: buildWhere(today, tomorrow),
            _sum: { total: true },
        });

        // Month revenue
        const monthRevenue = await this.prisma.appointment.aggregate({
            where: buildWhere(firstDayOfMonth, tomorrow),
            _sum: { total: true },
        });

        // Last month revenue for comparison
        const lastMonthRevenue = await this.prisma.appointment.aggregate({
            where: buildWhere(firstDayOfLastMonth, lastDayOfLastMonth),
            _sum: { total: true },
        });

        // Total clients
        const totalClients = await this.prisma.client.count({
            where: { companyId },
        });

        // New clients this month
        const newClientsThisMonth = await this.prisma.client.count({
            where: {
                companyId,
                createdAt: { gte: firstDayOfMonth },
            },
        });

        // Active employees
        const activeEmployees = await this.prisma.employee.count({
            where: {
                companyId,
                status: 'active',
                ...(branchId && { branchId }),
            },
        });

        // Calculate growth percentages
        const revenueGrowth = lastMonthRevenue._sum.total 
            ? ((monthRevenue._sum.total || 0) - (lastMonthRevenue._sum.total || 0)) / lastMonthRevenue._sum.total * 100
            : 0;

        return {
            todayAppointments,
            todayRevenue: todayRevenue._sum.total || 0,
            monthRevenue: monthRevenue._sum.total || 0,
            revenueGrowth: Math.round(revenueGrowth * 10) / 10,
            totalClients,
            newClientsThisMonth,
            activeEmployees,
        };
    }

    async getRevenueChart(companyId: string, branchId?: string, period: 'week' | 'month' | 'year' = 'month') {
        const now = new Date();
        const { year, month, date: day } = getUTCDateParts(now);
        const data: { label: string; revenue: number; appointments: number }[] = [];

        if (period === 'week') {
            // Last 7 days in UTC
            for (let i = 6; i >= 0; i--) {
                const dateUTC = new Date(Date.UTC(year, month, day - i, 0, 0, 0));
                const nextDateUTC = new Date(Date.UTC(year, month, day - i + 1, 0, 0, 0));

                const where: any = {
                    companyId,
                    status: { not: 'canceled' },
                    startAt: { gte: dateUTC, lt: nextDateUTC },
                };
                if (branchId) where.branchId = branchId;

                const result = await this.prisma.appointment.aggregate({
                    where,
                    _sum: { total: true },
                    _count: { id: true },
                });

                data.push({
                    label: dateUTC.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' }),
                    revenue: result._sum.total || 0,
                    appointments: result._count.id,
                });
            }
        } else if (period === 'month') {
            // Last 30 days by weeks in UTC
            for (let i = 3; i >= 0; i--) {
                const endDateUTC = new Date(Date.UTC(year, month, day - i * 7, 0, 0, 0));
                const startDateUTC = new Date(Date.UTC(year, month, day - i * 7 - 7, 0, 0, 0));

                const where: any = {
                    companyId,
                    status: { not: 'canceled' },
                    startAt: { gte: startDateUTC, lt: endDateUTC },
                };
                if (branchId) where.branchId = branchId;

                const result = await this.prisma.appointment.aggregate({
                    where,
                    _sum: { total: true },
                    _count: { id: true },
                });

                data.push({
                    label: `${startDateUTC.getUTCDate()}-${endDateUTC.getUTCDate()}`,
                    revenue: result._sum.total || 0,
                    appointments: result._count.id,
                });
            }
        } else {
            // Last 12 months in UTC
            for (let i = 11; i >= 0; i--) {
                const dateUTC = new Date(Date.UTC(year, month - i, 1, 0, 0, 0));
                const nextDateUTC = new Date(Date.UTC(year, month - i + 1, 1, 0, 0, 0));

                const where: any = {
                    companyId,
                    status: { not: 'canceled' },
                    startAt: { gte: dateUTC, lt: nextDateUTC },
                };
                if (branchId) where.branchId = branchId;

                const result = await this.prisma.appointment.aggregate({
                    where,
                    _sum: { total: true },
                    _count: { id: true },
                });

                data.push({
                    label: dateUTC.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' }),
                    revenue: result._sum.total || 0,
                    appointments: result._count.id,
                });
            }
        }

        return data;
    }

    async getServicesChart(companyId: string, branchId?: string, from?: string, to?: string) {
        const where: any = {
            companyId,
            status: { not: 'canceled' },
        };
        
        if (branchId) where.branchId = branchId;
        if (from || to) {
            where.startAt = {};
            if (from) where.startAt.gte = new Date(from);
            if (to) where.startAt.lte = new Date(to);
        }

        const appointments = await this.prisma.appointment.findMany({
            where,
            include: {
                services: {
                    include: {
                        service: true,
                    },
                },
            },
        });

        const serviceStats: Record<string, { name: string; count: number; revenue: number }> = {};

        for (const app of appointments) {
            for (const appService of app.services) {
                const serviceId = appService.serviceId;
                if (!serviceStats[serviceId]) {
                    serviceStats[serviceId] = {
                        name: appService.service?.name || 'Unknown',
                        count: 0,
                        revenue: 0,
                    };
                }
                serviceStats[serviceId].count++;
                serviceStats[serviceId].revenue += appService.price || 0;
            }
        }

        return Object.values(serviceStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    async getRecentAppointments(companyId: string, branchId?: string, limit: number = 5) {
        const where: any = {
            companyId,
            status: { not: 'canceled' },
        };
        if (branchId) where.branchId = branchId;

        return this.prisma.appointment.findMany({
            where,
            orderBy: { startAt: 'desc' },
            take: limit,
            include: {
                client: true,
                masterEmployee: true,
                services: {
                    include: {
                        service: true,
                    },
                },
            },
        });
    }
}
