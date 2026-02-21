import { useState, useEffect } from "react";
import {
    Payment,
    PaymentMethod,
    getPaymentMethods,
    getAppointmentPayments,
    createPayment,
    createRefund,
    formatRubles,
    getPaymentStatusText,
    getPaymentStatusColor,
    rublesToKopeks,
    PaymentStatus,
} from "../api/payments";
import { Appointment } from "../api/appointments";
import { Cashbox, getCashboxes } from "../api/cashboxes";

interface PaymentBlockProps {
    appointment: Appointment;
    onPaymentCreated?: () => void;
}

export function PaymentBlock({ appointment, onPaymentCreated }: PaymentBlockProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);

    // Загрузка платежей, методов и касс
    const loadData = async () => {
        try {
            setLoading(true);
            const [paymentsData, methodsData, cashboxesData] = await Promise.all([
                getAppointmentPayments(appointment.id),
                getPaymentMethods(),
                getCashboxes(),
            ]);
            setPayments(paymentsData);
            setMethods(methodsData);
            setCashboxes(cashboxesData.filter(cb => cb.isActive));
        } catch (err) {
            console.error("Failed to load payments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [appointment.id]);

    const totalKopeks = appointment.total * 100;
    const paidKopeks = appointment.paidTotalKopeks || 0;
    const remainingKopeks = totalKopeks - paidKopeks;

    return (
        <div className="border-t pt-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-3">Оплата</h3>

            {/* Сводка по оплате */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Сумма записи:</span>
                    <span className="font-medium">{formatRubles(totalKopeks)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Оплачено:</span>
                    <span className="font-medium text-green-600">{formatRubles(paidKopeks)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Осталось:</span>
                    <span className={`font-medium ${remainingKopeks > 0 ? "text-red-600" : "text-gray-600"}`}>
                        {formatRubles(Math.max(0, remainingKopeks))}
                    </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium text-gray-700">Статус:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(appointment.paymentStatus as PaymentStatus)}`}>
                        {getPaymentStatusText(appointment.paymentStatus as PaymentStatus)}
                    </span>
                </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={remainingKopeks <= 0}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    Принять оплату
                </button>
                <button
                    onClick={() => setShowRefundModal(true)}
                    disabled={paidKopeks <= 0}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    Возврат
                </button>
            </div>

            {/* Список платежей */}
            {payments.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">История платежей</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {payments.map((payment) => (
                            <div
                                key={payment.id}
                                className={`p-2 rounded-lg text-sm ${
                                    payment.direction === "income" ? "bg-green-50" : "bg-orange-50"
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-medium">
                                            {payment.direction === "income" ? "+" : "-"}
                                            {formatRubles(payment.amountKopeks)}
                                        </span>
                                        <span className="text-gray-500 ml-2">{payment.method.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(payment.paidAt).toLocaleDateString("ru-RU")}
                                    </span>
                                </div>
                                {payment.comment && (
                                    <div className="text-gray-500 text-xs mt-1">{payment.comment}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Модалка приёма оплаты */}
            {showPaymentModal && (
                <PaymentModal
                    title="Принять оплату"
                    methods={methods}
                    cashboxes={cashboxes}
                    maxAmount={remainingKopeks / 100}
                    onSubmit={async (methodId, cashboxId, amountRub, comment) => {
                        await createPayment(appointment.id, {
                            methodId,
                            cashboxId,
                            amountKopeks: rublesToKopeks(amountRub),
                            comment,
                        });
                        await loadData();
                        onPaymentCreated?.();
                        setShowPaymentModal(false);
                    }}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}

            {/* Модалка возврата */}
            {showRefundModal && (
                <PaymentModal
                    title="Возврат средств"
                    methods={methods}
                    cashboxes={cashboxes}
                    maxAmount={paidKopeks / 100}
                    onSubmit={async (methodId, cashboxId, amountRub, comment) => {
                        await createRefund(appointment.id, {
                            methodId,
                            cashboxId,
                            amountKopeks: rublesToKopeks(amountRub),
                            comment,
                        });
                        await loadData();
                        onPaymentCreated?.();
                        setShowRefundModal(false);
                    }}
                    onClose={() => setShowRefundModal(false)}
                />
            )}
        </div>
    );
}

// Модалка для создания платежа/возврата
interface PaymentModalProps {
    title: string;
    methods: PaymentMethod[];
    cashboxes: Cashbox[];
    maxAmount: number;
    onSubmit: (methodId: string, cashboxId: string, amountRub: number, comment: string) => Promise<void>;
    onClose: () => void;
}

function PaymentModal({ title, methods, cashboxes, maxAmount, onSubmit, onClose }: PaymentModalProps) {
    const [methodId, setMethodId] = useState(methods[0]?.id || "");
    const [cashboxId, setCashboxId] = useState(cashboxes[0]?.id || "");
    const [amount, setAmount] = useState(maxAmount.toString());
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(amount);
        if (!methodId || !cashboxId || amountNum <= 0 || amountNum > maxAmount) return;

        setLoading(true);
        try {
            await onSubmit(methodId, cashboxId, amountNum, comment);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">{title}</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Касса
                        </label>
                        <select
                            value={cashboxId}
                            onChange={(e) => setCashboxId(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                        >
                            {cashboxes.map((cb) => (
                                <option key={cb.id} value={cb.id}>
                                    {cb.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Способ оплаты
                        </label>
                        <select
                            value={methodId}
                            onChange={(e) => setMethodId(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                        >
                            {methods.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Сумма (руб.) {maxAmount > 0 && `(макс: ${maxAmount.toFixed(2)})`}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={maxAmount}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Комментарий (опционально)
                        </label>
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Например: Предоплата"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {loading ? "Сохранение..." : "Сохранить"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
