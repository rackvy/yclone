import { useState, useEffect } from "react";
import {
    Cashbox,
    CashboxType,
    getCashboxes,
    createCashbox,
    updateCashbox,
    deleteCashbox,
    toggleCashboxActive,
    getCashboxTypeText,
    getCashboxTypeIcon,
} from "../api/cashboxes";

export function CashboxesPage() {
    const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCashbox, setEditingCashbox] = useState<Cashbox | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [type, setType] = useState<CashboxType>("cash");
    const [currency, setCurrency] = useState("RUB");
    const [sortOrder, setSortOrder] = useState(100);

    const loadCashboxes = async () => {
        try {
            setLoading(true);
            const data = await getCashboxes();
            setCashboxes(data);
        } catch (err) {
            console.error("Failed to load cashboxes:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCashboxes();
    }, []);

    const handleCreate = () => {
        setEditingCashbox(null);
        setName("");
        setType("cash");
        setCurrency("RUB");
        setSortOrder(100);
        setShowModal(true);
    };

    const handleEdit = (cashbox: Cashbox) => {
        setEditingCashbox(cashbox);
        setName(cashbox.name);
        setType(cashbox.type);
        setCurrency(cashbox.currency);
        setSortOrder(cashbox.sortOrder);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCashbox) {
                await updateCashbox(editingCashbox.id, {
                    name,
                    type,
                    currency,
                    sortOrder,
                });
            } else {
                await createCashbox({
                    name,
                    type,
                    currency,
                    sortOrder,
                });
            }
            await loadCashboxes();
            setShowModal(false);
        } catch (err) {
            console.error("Failed to save cashbox:", err);
            alert("Ошибка при сохранении кассы");
        }
    };

    const handleToggleActive = async (cashbox: Cashbox) => {
        try {
            await toggleCashboxActive(cashbox.id);
            await loadCashboxes();
        } catch (err) {
            console.error("Failed to toggle cashbox:", err);
        }
    };

    const handleDelete = async (cashbox: Cashbox) => {
        if (!confirm(`Удалить кассу "${cashbox.name}"?`)) return;
        try {
            await deleteCashbox(cashbox.id);
            await loadCashboxes();
        } catch (err) {
            console.error("Failed to delete cashbox:", err);
            alert("Ошибка при удалении кассы");
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Кассы</h1>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                    Добавить кассу
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Загрузка...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Название</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Тип</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Валюта</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Статус</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Порядок</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {cashboxes.map((cashbox) => (
                                <tr key={cashbox.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-gray-400">
                                                {getCashboxTypeIcon(cashbox.type)}
                                            </span>
                                            <span className="font-medium text-gray-900">{cashbox.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {getCashboxTypeText(cashbox.type)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{cashbox.currency}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleToggleActive(cashbox)}
                                            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                                cashbox.isActive
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {cashbox.isActive ? "Активна" : "Неактивна"}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{cashbox.sortOrder}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(cashbox)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cashbox)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {cashboxes.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            Нет касс. Создайте первую кассу.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            {editingCashbox ? "Редактировать кассу" : "Новая касса"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Название
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Тип
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as CashboxType)}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                >
                                    <option value="cash">Наличные</option>
                                    <option value="bank">Банк</option>
                                    <option value="other">Другое</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Валюта
                                </label>
                                <input
                                    type="text"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Порядок сортировки
                                </label>
                                <input
                                    type="number"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(parseInt(e.target.value))}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
