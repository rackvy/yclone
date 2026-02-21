import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
    Sale,
    SaleItem,
    createSale,
    addSalePayment,
    getSales,
    formatRubles,
    getRemainingAmount,
    getPaymentStatusText,
} from "../api/sales";
import { Product, productsApi } from "../api/products";
import { Client, clientsApi } from "../api/clients";
import { PaymentMethod, getPaymentMethods } from "../api/payments";
import { Cashbox, getCashboxes } from "../api/cashboxes";

interface CartItem {
    product: Product;
    qty: number;
    priceKopeks: number;
}

export function SalesPage() {
    // Состояния
    const [products, setProducts] = useState<Product[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentSale, setCurrentSale] = useState<Sale | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    // Состояния для оплаты
    const [paymentMethodId, setPaymentMethodId] = useState("");
    const [cashboxId, setCashboxId] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");

    // Загрузка данных
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const branchId = localStorage.getItem("selectedBranchId") || "";
            const [productsData, clientsData, methodsData, cashboxesData, salesData] =
                await Promise.all([
                    productsApi.list(branchId),
                    clientsApi.list(),
                    getPaymentMethods(),
                    getCashboxes(),
                    getSales(),
                ]);
            setProducts(productsData);
            setClients(clientsData);
            setPaymentMethods(methodsData);
            setCashboxes(cashboxesData);
            setSales(salesData);
        } catch (err) {
            console.error("Failed to load data:", err);
        }
    };

    // Добавить товар в корзину
    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, qty: item.qty + 1 }
                        : item
                );
            }
            return [
                ...prev,
                {
                    product,
                    qty: 1,
                    priceKopeks: product.price,
                },
            ];
        });
    };

    // Обновить количество
    const updateQty = (productId: string, qty: number) => {
        if (qty <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, qty } : item
            )
        );
    };

    // Обновить цену
    const updatePrice = (productId: string, priceKopeks: number) => {
        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, priceKopeks } : item
            )
        );
    };

    // Очистить корзину
    const clearCart = () => {
        setCart([]);
        setSelectedClient("");
    };

    // Сумма корзины
    const cartTotal = cart.reduce(
        (sum, item) => sum + item.priceKopeks * item.qty,
        0
    );

    // Фильтр товаров
    const filteredProducts = products.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Создать продажу
    const handleCreateSale = async () => {
        if (cart.length === 0) {
            alert("Добавьте товары в корзину");
            return;
        }

        const branchId = localStorage.getItem("selectedBranchId");
        if (!branchId) {
            alert("Выберите филиал");
            return;
        }

        try {
            setLoading(true);
            const sale = await createSale({
                branchId,
                clientId: selectedClient || undefined,
                items: cart.map((item) => ({
                    productId: item.product.id,
                    qty: item.qty,
                    priceKopeks: item.priceKopeks,
                })),
            });
            setCurrentSale(sale);
            setShowPaymentModal(true);
            setCart([]);
            setSelectedClient("");
            loadData(); // Обновляем список продаж
        } catch (err: any) {
            alert(err.message || "Ошибка при создании продажи");
        } finally {
            setLoading(false);
        }
    };

    // Оплатить
    const handlePayment = async () => {
        if (!currentSale) return;

        const amount = parseFloat(paymentAmount) * 100; // в копейки
        if (!amount || amount <= 0) {
            alert("Введите сумму");
            return;
        }
        if (!paymentMethodId) {
            alert("Выберите способ оплаты");
            return;
        }
        if (!cashboxId) {
            alert("Выберите кассу");
            return;
        }

        try {
            setLoading(true);
            const updatedSale = await addSalePayment(currentSale.id, {
                methodId: paymentMethodId,
                cashboxId,
                amountKopeks: Math.round(amount),
            });
            setCurrentSale(updatedSale);
            setShowPaymentModal(false);
            setShowReceipt(true);
            setPaymentAmount("");
            loadData();
        } catch (err: any) {
            alert(err.message || "Ошибка при оплате");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="h-full flex">
                {/* Левая панель - Товары */}
                <div className="flex-1 p-6 overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">Продажи</h1>

                    {/* Поиск */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Поиск товара..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        />
                    </div>

                    {/* Список товаров */}
                    <div className="grid grid-cols-3 gap-4">
                        {filteredProducts.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                disabled={product.stockQty <= 0}
                                className={`p-4 border rounded-lg text-left transition-colors ${
                                    product.stockQty > 0
                                        ? "hover:border-primary hover:shadow-md"
                                        : "opacity-50 cursor-not-allowed"
                                }`}
                            >
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500">
                                    {formatRubles(product.price)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Остаток: {product.stockQty}
                                </div>
                            </button>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            Товары не найдены
                        </div>
                    )}
                </div>

                {/* Правая панель - Корзина */}
                <div className="w-96 bg-gray-50 border-l p-6 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">Корзина</h2>

                    {/* Выбор клиента */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Клиент (необязательно)
                        </label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Розничный покупатель</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.fullName} ({client.phone})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Список товаров в корзине */}
                    <div className="flex-1 overflow-auto space-y-2 mb-4">
                        {cart.map((item) => (
                            <div
                                key={item.product.id}
                                className="bg-white p-3 rounded-lg border"
                            >
                                <div className="font-medium text-sm">
                                    {item.product.name}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        onClick={() =>
                                            updateQty(item.product.id, item.qty - 1)
                                        }
                                        className="w-8 h-8 bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">{item.qty}</span>
                                    <button
                                        onClick={() =>
                                            updateQty(item.product.id, item.qty + 1)
                                        }
                                        className="w-8 h-8 bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        +
                                    </button>
                                    <div className="flex-1 text-right">
                                        <input
                                            type="number"
                                            value={item.priceKopeks}
                                            onChange={(e) =>
                                                updatePrice(
                                                    item.product.id,
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                            className="w-20 text-right border rounded px-2 py-1 text-sm"
                                            step="1"
                                        />
                                    </div>
                                </div>
                                <div className="text-right text-sm text-gray-600 mt-1">
                                    {formatRubles(item.priceKopeks * item.qty)}
                                </div>
                            </div>
                        ))}

                        {cart.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                Корзина пуста
                            </div>
                        )}
                    </div>

                    {/* Итого */}
                    {cart.length > 0 && (
                        <div className="border-t pt-4">
                            <div className="flex justify-between text-xl font-bold mb-4">
                                <span>Итого:</span>
                                <span>{formatRubles(cartTotal)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={clearCart}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                >
                                    Очистить
                                </button>
                                <button
                                    onClick={handleCreateSale}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {loading ? "..." : "Продать"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Модалка оплаты */}
            {showPaymentModal && currentSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Оплата</h2>

                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between mb-2">
                                <span>Сумма:</span>
                                <span className="font-bold">
                                    {formatRubles(currentSale.totalKopeks)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Осталось:</span>
                                <span>
                                    {formatRubles(getRemainingAmount(currentSale))}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Способ оплаты
                                </label>
                                <select
                                    value={paymentMethodId}
                                    onChange={(e) => setPaymentMethodId(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Выберите...</option>
                                    {paymentMethods.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Касса
                                </label>
                                <select
                                    value={cashboxId}
                                    onChange={(e) => setCashboxId(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Выберите...</option>
                                    {cashboxes.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Сумма (₽)
                                </label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder={(
                                        getRemainingAmount(currentSale) / 100
                                    ).toString()}
                                    className="w-full border rounded-lg px-3 py-2"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? "..." : "Оплатить"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Чек */}
            {showReceipt && currentSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold">Чек</h2>
                            <p className="text-sm text-gray-500">
                                Продажа #{currentSale.id.slice(-6)}
                            </p>
                        </div>

                        <div className="border-t border-b py-4 my-4">
                            {currentSale.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between py-1"
                                >
                                    <span>
                                        {item.product?.name} x{item.qty}
                                    </span>
                                    <span>{formatRubles(item.totalKopeks)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xl font-bold">
                                <span>Итого:</span>
                                <span>{formatRubles(currentSale.totalKopeks)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Оплачено:</span>
                                <span>
                                    {formatRubles(currentSale.paidTotalKopeks)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Статус:</span>
                                <span
                                    className={`font-medium ${
                                        currentSale.paymentStatus === "paid"
                                            ? "text-green-600"
                                            : "text-orange-600"
                                    }`}
                                >
                                    {getPaymentStatusText(currentSale.paymentStatus)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowReceipt(false);
                                setCurrentSale(null);
                            }}
                            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
