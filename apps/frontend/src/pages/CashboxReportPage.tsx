import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { formatRubles } from "../api/payments";
import { apiClient } from "../api/client";

interface CashboxReportData {
    date: string;
    branchId: string | null;
    cashboxes: {
        cashboxId: string;
        cashboxName: string;
        cashboxType: string;
        incomeKopeks: number;
        refundKopeks: number;
        totalKopeks: number;
        methods: {
            methodId: string;
            methodName: string;
            methodType: string;
            incomeKopeks: number;
            refundKopeks: number;
            totalKopeks: number;
        }[];
    }[];
    summary: {
        totalIncomeKopeks: number;
        totalRefundKopeks: number;
        totalNetKopeks: number;
    };
}

export function CashboxReportPage() {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [report, setReport] = useState<CashboxReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const loadReport = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<CashboxReportData>(`/api/reports/cashbox-day?date=${date}`);
            setReport(data);
        } catch (err) {
            console.error("Failed to load report:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, [date]);

    return (
        <Layout>
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Отчёт по кассам</h1>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Дата:</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border rounded-lg px-3 py-2"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Загрузка...</div>
            ) : report ? (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-sm text-green-600 mb-1">Приход</div>
                            <div className="text-2xl font-bold text-green-800">
                                {formatRubles(report.summary.totalIncomeKopeks)}
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                            <div className="text-sm text-red-600 mb-1">Возвраты</div>
                            <div className="text-2xl font-bold text-red-800">
                                {formatRubles(report.summary.totalRefundKopeks)}
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-sm text-blue-600 mb-1">Итого</div>
                            <div className="text-2xl font-bold text-blue-800">
                                {formatRubles(report.summary.totalNetKopeks)}
                            </div>
                        </div>
                    </div>

                    {/* Cashboxes Detail */}
                    {report.cashboxes.length > 0 ? (
                        <div className="space-y-4">
                            {report.cashboxes.map((cashbox) => (
                                <div key={cashbox.cashboxId} className="bg-white rounded-lg shadow overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-gray-400">
                                                {cashbox.cashboxType === "cash" ? "payments" : 
                                                 cashbox.cashboxType === "bank" ? "account_balance" : "wallet"}
                                            </span>
                                            <span className="font-medium text-gray-900">{cashbox.cashboxName}</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">
                                            {formatRubles(cashbox.totalKopeks)}
                                        </div>
                                    </div>

                                    <div className="px-4 py-2">
                                        <div className="flex gap-4 text-sm mb-3">
                                            <span className="text-green-600">
                                                +{formatRubles(cashbox.incomeKopeks)}
                                            </span>
                                            <span className="text-red-600">
                                                -{formatRubles(cashbox.refundKopeks)}
                                            </span>
                                        </div>

                                        {/* Methods breakdown */}
                                        {cashbox.methods.length > 0 && (
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-gray-500">
                                                        <th className="text-left py-1">Способ оплаты</th>
                                                        <th className="text-right py-1">Приход</th>
                                                        <th className="text-right py-1">Возврат</th>
                                                        <th className="text-right py-1">Итого</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {cashbox.methods.map((method) => (
                                                        <tr key={method.methodId}>
                                                            <td className="py-1 text-gray-700">{method.methodName}</td>
                                                            <td className="py-1 text-right text-green-600">
                                                                +{formatRubles(method.incomeKopeks)}
                                                            </td>
                                                            <td className="py-1 text-right text-red-600">
                                                                -{formatRubles(method.refundKopeks)}
                                                            </td>
                                                            <td className="py-1 text-right font-medium">
                                                                {formatRubles(method.totalKopeks)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
                            Нет операций за выбранную дату
                        </div>
                    )}
                </div>
            ) : null}
        </div>
        </Layout>
    );
}
