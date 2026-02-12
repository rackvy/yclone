import { apiClient } from './client';

export interface Product {
  id: string;
  branchId: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  stockQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
}

export interface CreateProductDto {
  branchId: string;
  name: string;
  price: number;
  stockQty?: number;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface UpdateProductDto {
  branchId?: string;
  name?: string;
  price?: number;
  stockQty?: number;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  isActive?: boolean;
}

export const productsApi = {
  list: async (branchId: string, categoryId?: string, q?: string): Promise<Product[]> => {
    let url = `/products?branchId=${branchId}`;
    if (categoryId) url += `&categoryId=${categoryId}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return apiClient.get<Product[]>(url);
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    return apiClient.post<Product>('/products', data);
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    return apiClient.patch<Product>(`/products/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/products/${id}`);
  },
};

// Product Categories API
export interface ProductCategory {
  id: string;
  name: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductCategoryDto {
  name: string;
  sort?: number;
}

export interface UpdateProductCategoryDto {
  name?: string;
  sort?: number;
}

export const productCategoriesApi = {
  list: async (): Promise<ProductCategory[]> => {
    return apiClient.get<ProductCategory[]>('/product-categories');
  },

  create: async (data: CreateProductCategoryDto): Promise<ProductCategory> => {
    return apiClient.post<ProductCategory>('/product-categories', data);
  },

  update: async (id: string, data: UpdateProductCategoryDto): Promise<ProductCategory> => {
    return apiClient.patch<ProductCategory>(`/product-categories/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/product-categories/${id}`);
  },
};

// Stock Movements API
export interface StockMovement {
  id: string;
  type: 'in' | 'out' | 'adjust';
  qty: number;
  note: string | null;
  createdAt: string;
  productId: string;
  product?: { id: string; name: string };
  appointmentId: string | null;
  createdByEmployeeId: string | null;
  createdByEmployee?: { id: string; fullName: string } | null;
}

export interface BaseMovementDto {
  branchId: string;
  productId: string;
  qty: number;
  note?: string;
  createdByEmployeeId?: string;
}

export interface AdjustMovementDto extends BaseMovementDto {
  reason?: string;
}

export interface TransferMovementDto {
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  qty: number;
  note?: string;
  createdByEmployeeId?: string;
}

export const stockMovementsApi = {
  list: async (branchId: string, productId?: string, take?: number): Promise<StockMovement[]> => {
    let url = `/stock-movements?branchId=${branchId}`;
    if (productId) url += `&productId=${productId}`;
    if (take) url += `&take=${take}`;
    return apiClient.get<StockMovement[]>(url);
  },

  // Приход
  in: async (data: BaseMovementDto): Promise<StockMovement> => {
    return apiClient.post<StockMovement>('/stock-movements/in', data);
  },

  // Расход
  out: async (data: BaseMovementDto): Promise<StockMovement> => {
    return apiClient.post<StockMovement>('/stock-movements/out', data);
  },

  // Корректировка
  adjust: async (data: AdjustMovementDto): Promise<StockMovement> => {
    return apiClient.post<StockMovement>('/stock-movements/adjust', data);
  },

  // Перемещение между филиалами
  transfer: async (data: TransferMovementDto): Promise<{ outMovement: StockMovement; inMovement: StockMovement; targetProduct: Product }> => {
    return apiClient.post('/stock-movements/transfer', data);
  },
};
