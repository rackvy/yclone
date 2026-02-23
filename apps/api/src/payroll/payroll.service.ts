import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSalaryRuleDto, UpdateSalaryRuleDto, CreateAssignmentDto, ListAssignmentsDto, ServiceOverrideDto, ProductOverrideDto, CalcPayrollDto, PayrollCalcResult, PayrollSummaryRow, PayrollEmployeeDetails, PayrollServiceDetail, PayrollProductDetail } from "./dto";

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  // ==================== SALARY RULES ====================

  async findAllRules(companyId: string) {
    return this.prisma.salaryRule.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });
  }

  async findOneRule(companyId: string, id: string) {
    const rule = await this.prisma.salaryRule.findFirst({
      where: { id, companyId },
      include: {
        serviceOverrides: {
          include: {
            service: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
        productOverrides: {
          include: {
            product: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
        assignments: {
          include: {
            employee: { select: { id: true, fullName: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!rule) throw new NotFoundException("Правило не найдено");
    return rule;
  }

  async createRule(companyId: string, dto: CreateSalaryRuleDto) {
    // Валидация процентов
    if (dto.servicesMode === "percent" && dto.servicesValue > 100) {
      throw new BadRequestException("Процент для услуг не может быть больше 100");
    }
    if (dto.productsMode === "percent" && dto.productsValue > 100) {
      throw new BadRequestException("Процент для товаров не может быть больше 100");
    }

    return this.prisma.salaryRule.create({
      data: {
        companyId,
        name: dto.name,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        calcByPayments: dto.calcByPayments ?? true,
        includeRefunds: dto.includeRefunds ?? false,
        servicesMode: dto.servicesMode,
        servicesValue: dto.servicesValue,
        productsMode: dto.productsMode,
        productsValue: dto.productsValue,
        minMode: dto.minMode,
        minValue: dto.minValue,
      },
    });
  }

  async updateRule(companyId: string, id: string, dto: UpdateSalaryRuleDto) {
    const rule = await this.prisma.salaryRule.findFirst({
      where: { id, companyId },
    });
    if (!rule) throw new NotFoundException("Правило не найдено");

    // Валидация процентов
    const servicesMode = dto.servicesMode ?? rule.servicesMode;
    const servicesValue = dto.servicesValue ?? rule.servicesValue;
    if (servicesMode === "percent" && servicesValue > 100) {
      throw new BadRequestException("Процент для услуг не может быть больше 100");
    }

    const productsMode = dto.productsMode ?? rule.productsMode;
    const productsValue = dto.productsValue ?? rule.productsValue;
    if (productsMode === "percent" && productsValue > 100) {
      throw new BadRequestException("Процент для товаров не может быть больше 100");
    }

    // Обновляем правило и синхронизируем overrides в транзакции
    return this.prisma.$transaction(async (tx) => {
      // Обновляем основные поля правила
      const updatedRule = await tx.salaryRule.update({
        where: { id },
        data: {
          name: dto.name,
          isActive: dto.isActive,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          calcByPayments: dto.calcByPayments,
          includeRefunds: dto.includeRefunds,
          servicesMode: dto.servicesMode,
          servicesValue: dto.servicesValue,
          productsMode: dto.productsMode,
          productsValue: dto.productsValue,
          minMode: dto.minMode,
          minValue: dto.minValue,
        },
      });

      // Синхронизируем service overrides
      if (dto.serviceOverrides !== undefined) {
        await this.syncServiceOverrides(tx, id, dto.serviceOverrides);
      }

      // Синхронизируем product overrides
      if (dto.productOverrides !== undefined) {
        await this.syncProductOverrides(tx, id, dto.productOverrides);
      }

      return updatedRule;
    });
  }

  private async syncServiceOverrides(
    tx: any,
    ruleId: string,
    overrides: ServiceOverrideDto[]
  ) {
    // Получаем существующие overrides
    const existing = await tx.salaryRuleServiceOverride.findMany({
      where: { ruleId },
    });

    const existingIds = new Set(existing.map((o: any) => o.id));
    const receivedIds = new Set(overrides.filter((o) => o.id).map((o) => o.id));

    // Удаляем отсутствующие
    const toDelete = existing.filter((o: any) => !receivedIds.has(o.id));
    for (const item of toDelete) {
      await tx.salaryRuleServiceOverride.delete({ where: { id: item.id } });
    }

    // Upsert: обновляем существующие или создаём новые
    for (const override of overrides) {
      const data = {
        ruleId,
        serviceId: override.serviceId || null,
        categoryId: override.categoryId || null,
        mode: override.mode,
        value: override.value,
      };

      if (override.id && existingIds.has(override.id)) {
        // Обновляем существующий
        await tx.salaryRuleServiceOverride.update({
          where: { id: override.id },
          data,
        });
      } else {
        // Создаём новый
        await tx.salaryRuleServiceOverride.create({ data });
      }
    }
  }

  private async syncProductOverrides(
    tx: any,
    ruleId: string,
    overrides: ProductOverrideDto[]
  ) {
    // Получаем существующие overrides
    const existing = await tx.salaryRuleProductOverride.findMany({
      where: { ruleId },
    });

    const existingIds = new Set(existing.map((o: any) => o.id));
    const receivedIds = new Set(overrides.filter((o) => o.id).map((o) => o.id));

    // Удаляем отсутствующие
    const toDelete = existing.filter((o: any) => !receivedIds.has(o.id));
    for (const item of toDelete) {
      await tx.salaryRuleProductOverride.delete({ where: { id: item.id } });
    }

    // Upsert: обновляем существующие или создаём новые
    for (const override of overrides) {
      const data = {
        ruleId,
        productId: override.productId || null,
        categoryId: override.categoryId || null,
        mode: override.mode,
        value: override.value,
      };

      if (override.id && existingIds.has(override.id)) {
        // Обновляем существующий
        await tx.salaryRuleProductOverride.update({
          where: { id: override.id },
          data,
        });
      } else {
        // Создаём новый
        await tx.salaryRuleProductOverride.create({ data });
      }
    }
  }

  async deleteRule(companyId: string, id: string) {
    const rule = await this.prisma.salaryRule.findFirst({
      where: { id, companyId },
    });
    if (!rule) throw new NotFoundException("Правило не найдено");

    // Soft delete - деактивируем
    return this.prisma.salaryRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== ASSIGNMENTS ====================

  async listAssignments(companyId: string, dto: ListAssignmentsDto) {
    return this.prisma.salaryRuleAssignment.findMany({
      where: {
        rule: { companyId },
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.ruleId ? { ruleId: dto.ruleId } : {}),
      },
      include: {
        rule: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAssignment(companyId: string, dto: CreateAssignmentDto) {
    // Проверяем что правило существует и принадлежит компании
    const rule = await this.prisma.salaryRule.findFirst({
      where: { id: dto.ruleId, companyId },
    });
    if (!rule) throw new NotFoundException("Правило не найдено");

    // Проверяем что сотрудник существует и принадлежит компании
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException("Сотрудник не найден");

    // Если указан филиал - проверяем
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, companyId },
      });
      if (!branch) throw new NotFoundException("Филиал не найден");
    }

    return this.prisma.salaryRuleAssignment.create({
      data: {
        ruleId: dto.ruleId,
        employeeId: dto.employeeId,
        branchId: dto.branchId || null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
      },
      include: {
        rule: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async deleteAssignment(companyId: string, id: string) {
    const assignment = await this.prisma.salaryRuleAssignment.findFirst({
      where: { id, rule: { companyId } },
    });
    if (!assignment) throw new NotFoundException("Назначение не найдено");

    return this.prisma.salaryRuleAssignment.delete({
      where: { id },
    });
  }

  // ==================== PAYROLL CALCULATION ====================

  async calculatePayroll(
    companyId: string,
    dto: CalcPayrollDto
  ): Promise<PayrollCalcResult> {
    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);
    toDate.setHours(23, 59, 59, 999);

    // Получаем сотрудников (мастеров) с активными назначениями правил
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        role: "master",
        ...(dto.employeeId && { id: dto.employeeId }),
        ...(dto.branchId && { branchId: dto.branchId }),
        status: 'active',
      },
      include: {
        salaryAssignments: {
          where: { rule: { isActive: true } },
          include: {
            rule: {
              include: {
                serviceOverrides: true,
                productOverrides: true,
              },
            },
          },
        },
      },
    });

    const summaryRows: PayrollSummaryRow[] = [];
    const detailsByEmployee: Record<string, PayrollEmployeeDetails> = {};

    for (const employee of employees) {
      const result = await this.calculateEmployeePayroll(
        employee,
        fromDate,
        toDate,
        companyId
      );

      summaryRows.push({
        employeeId: employee.id,
        fullName: employee.fullName,
        workDaysCount: result.workDaysCount,
        servicesKopeks: result.servicesKopeks,
        productsKopeks: result.productsKopeks,
        bonusKopeks: 0,
        minimumTopUpKopeks: result.minimumTopUpKopeks,
        totalKopeks:
          result.servicesKopeks +
          result.productsKopeks +
          result.minimumTopUpKopeks,
      });

      detailsByEmployee[employee.id] = result.details;
    }

    return { summaryRows, detailsByEmployee };
  }

  private async calculateEmployeePayroll(
    employee: any,
    fromDate: Date,
    toDate: Date,
    companyId: string
  ) {
    // Находим активное правило на период (берём последнее по startsAt)
    const activeAssignment = employee.salaryAssignments
      .filter((a: any) => !a.rule.startsAt || new Date(a.rule.startsAt) <= toDate)
      .sort((a: any, b: any) => {
        const dateA = a.rule.startsAt ? new Date(a.rule.startsAt).getTime() : 0;
        const dateB = b.rule.startsAt ? new Date(b.rule.startsAt).getTime() : 0;
        return dateB - dateA;
      })[0];

    const rule = activeAssignment?.rule;

    // Получаем записи сотрудника за период
    const appointments = await this.prisma.appointment.findMany({
      where: {
        masterEmployeeId: employee.id,
        startAt: { gte: fromDate, lte: toDate },
        status: { not: "canceled" },
      },
      include: {
        services: {
          include: { service: { include: { category: true } } },
        },
        products: {
          include: { product: { include: { category: true } } },
        },
        appointmentPayments: true,
      },
    });

    // Получаем продажи сотрудника за период
    const sales = await this.prisma.sale.findMany({
      where: {
        createdByEmployeeId: employee.id,
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: {
          include: { product: { include: { category: true } } },
        },
      },
    });

    let servicesKopeks = 0;
    let productsKopeks = 0;
    const servicesDetails: PayrollServiceDetail[] = [];
    const productsDetails: PayrollProductDetail[] = [];

    // Расчёт по услугам
    for (const apt of appointments) {
      const paidTotal = apt.paidTotalKopeks || 0;
      const servicesTotal = apt.services.reduce(
        (sum: number, s: any) => sum + (s.priceKopeks || 0),
        0
      );

      for (const aptService of apt.services) {
        const service = aptService.service;
        const basePrice = aptService.price || 0;
        
        // Применяем правило
        const earned = rule
          ? this.applyServiceRule(
              rule,
              service.id,
              service.categoryId,
              basePrice,
              paidTotal,
              servicesTotal
            )
          : Math.round(basePrice * 0.3); // дефолт 30%

        servicesKopeks += earned;

        servicesDetails.push({
          appointmentId: apt.id,
          date: apt.startAt.toISOString().split("T")[0],
          serviceName: service.name,
          baseKopeks: basePrice,
          ruleApplied: rule
            ? `${rule.servicesMode === "percent" ? rule.servicesValue + "%" : rule.servicesValue + "₽"}`
            : "30% (default)",
          earnedKopeks: earned,
        });
      }

      // Расчёт по товарам в записи
      for (const aptProduct of apt.products) {
        const product = aptProduct.product;
        const revenue = (aptProduct.price || 0) * aptProduct.qty;
        
        const earned = rule
          ? this.applyProductRule(
              rule,
              product.id,
              product.categoryId,
              revenue
            )
          : Math.round(revenue * 0.1); // дефолт 10%

        productsKopeks += earned;

        productsDetails.push({
          saleIdOrAppointmentId: apt.id,
          date: apt.startAt.toISOString().split("T")[0],
          productName: product.name,
          qty: aptProduct.qty,
          revenueKopeks: revenue,
          ruleApplied: rule
            ? `${rule.productsMode === "percent" ? rule.productsValue + "%" : rule.productsValue + "₽"}`
            : "10% (default)",
          earnedKopeks: earned,
        });
      }
    }

    // Расчёт по продажам
    for (const sale of sales) {
      for (const item of sale.items) {
        const product = item.product;
        const revenue = (item.priceKopeks || 0) * item.qty;
        
        const earned = rule
          ? this.applyProductRule(
              rule,
              product.id,
              product.categoryId,
              revenue
            )
          : Math.round(revenue * 0.1);

        productsKopeks += earned;

        productsDetails.push({
          saleIdOrAppointmentId: sale.id,
          date: sale.createdAt.toISOString().split("T")[0],
          productName: product.name,
          qty: item.qty,
          revenueKopeks: revenue,
          ruleApplied: rule
            ? `${rule.productsMode === "percent" ? rule.productsValue + "%" : rule.productsValue + "₽"}`
            : "10% (default)",
          earnedKopeks: earned,
        });
      }
    }

    // Получаем рабочие дни из расписания (всегда, для отображения)
    const workDays = await this.prisma.workScheduleException.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: fromDate, lte: toDate },
        isWorkingDay: true,
      },
    });
    
    const uniqueWorkDays = new Set(workDays.map(w => w.date.toISOString().split('T')[0]));
    const workDaysCount = uniqueWorkDays.size;

    // Расчёт минимума
    let minimumTopUpKopeks = 0;
    if (rule && rule.minMode !== "none" && rule.minValue > 0) {
      const total = servicesKopeks + productsKopeks;
      
      if (rule.minMode === "daily") {
        const daysCount = workDaysCount || 1;
        const minTotal = rule.minValue * daysCount; // minValue в рублях
        if (total < minTotal) {
          minimumTopUpKopeks = minTotal - total;
        }
      } else {
        // monthly
        const minTotal = rule.minValue; // minValue в рублях
        if (total < minTotal) {
          minimumTopUpKopeks = minTotal - total;
        }
      }
    }

    return {
      servicesKopeks,
      productsKopeks,
      workDaysCount,
      minimumTopUpKopeks,
      details: {
        services: servicesDetails,
        products: productsDetails,
        refunds: [],
      } as PayrollEmployeeDetails,
    };
  }

  private applyServiceRule(
    rule: any,
    serviceId: string,
    categoryId: string | null,
    basePrice: number,
    paidTotal: number,
    servicesTotal: number
  ): number {
    // Ищем override
    const override =
      rule.serviceOverrides?.find(
        (o: any) => o.serviceId === serviceId || o.categoryId === categoryId
      );

    const mode = override?.mode || rule.servicesMode;
    const value = override?.value || rule.servicesValue;

    if (mode === "fixed") {
      return value; // value в рублях
    }

    // percent
    const percentage = value / 100;
    
    // Если есть оплаты - берём пропорцию от оплаченного
    if (paidTotal > 0 && servicesTotal > 0) {
      const share = basePrice / servicesTotal;
      const paidShare = Math.round(paidTotal * share);
      return Math.round(paidShare * percentage);
    }

    return Math.round(basePrice * percentage);
  }

  private applyProductRule(
    rule: any,
    productId: string,
    categoryId: string | null,
    revenue: number
  ): number {
    // Ищем override
    const override =
      rule.productOverrides?.find(
        (o: any) => o.productId === productId || o.categoryId === categoryId
      );

    const mode = override?.mode || rule.productsMode;
    const value = override?.value || rule.productsValue;

    if (mode === "fixed") {
      return value; // value в рублях
    }

    // percent
    return Math.round(revenue * (value / 100));
  }

  // ==================== PAYROLL RUNS ====================

  async createRun(companyId: string, userId: string, dto: { branchId?: string; fromDate: string; toDate: string }) {
    // Сначала делаем расчёт
    const calcResult = await this.calculatePayroll(companyId, {
      from: dto.fromDate,
      to: dto.toDate,
      branchId: dto.branchId,
    });

    // Создаём run
    const run = await this.prisma.payrollRun.create({
      data: {
        companyId,
        branchId: dto.branchId || null,
        fromDate: new Date(dto.fromDate),
        toDate: new Date(dto.toDate),
        status: 'draft',
      },
    });

    // Создаём lines
    for (const row of calcResult.summaryRows) {
      await this.prisma.payrollRunLine.create({
        data: {
          runId: run.id,
          employeeId: row.employeeId,
          workDaysCount: row.workDaysCount || 0,
          servicesKopeks: row.servicesKopeks,
          productsKopeks: row.productsKopeks,
          bonusKopeks: row.bonusKopeks,
          minimumTopUpKopeks: row.minimumTopUpKopeks,
          totalKopeks: row.totalKopeks,
        },
      });

      // Создаём details
      const details = calcResult.detailsByEmployee[row.employeeId];
      if (details) {
        await this.prisma.payrollRunDetail.create({
          data: {
            runId: run.id,
            employeeId: row.employeeId,
            payload: details as any,
          },
        });
      }
    }

    return this.findOneRun(companyId, run.id);
  }

  async approveRun(companyId: string, runId: string, userId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, companyId },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    if (run.status !== 'draft') {
      throw new BadRequestException('Run is already approved');
    }

    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedByUserId: userId,
      },
      include: {
        lines: {
          include: {
            employee: { select: { id: true, fullName: true } },
          },
        },
        details: {
          include: {
            employee: { select: { id: true, fullName: true } },
          },
        },
      },
    });
  }

  async findAllRuns(companyId: string, query: { from?: string; to?: string }) {
    const where: any = { companyId };
    
    if (query.from || query.to) {
      where.fromDate = {};
      if (query.from) where.fromDate.gte = new Date(query.from);
      if (query.to) where.fromDate.lte = new Date(query.to);
    }

    return this.prisma.payrollRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { lines: true },
        },
      },
    });
  }

  async findOneRun(companyId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, companyId },
      include: {
        branch: { select: { id: true, name: true } },
        lines: {
          include: {
            employee: { select: { id: true, fullName: true } },
          },
          orderBy: { employee: { fullName: 'asc' } },
        },
        details: {
          include: {
            employee: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    return run;
  }
}
