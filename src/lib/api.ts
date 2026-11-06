
import { getAccessToken } from './firebase';

import {
  ProductItem,
  PriceHistoryRecord,
  UserAccessRecord,
  QuotationRecord,
  CSRateRecord,
  DeliveryRecord,
  ChalanRecord,
  BillRecord,
  ActivityLogRecord,
  DashboardMetrics,
  SheetConfigStatus,
} from '../types';

/* =========================================
   API ERROR HANDLING
========================================= */

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/* =========================================
   AUTHENTICATED FETCH
========================================= */

async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new ApiError(
      'Not authenticated. Please sign in again.',
      401
    );
  }

  const headers = new Headers(options.headers);

  headers.set('Authorization', `Bearer ${token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  } catch (error) {
    throw new ApiError(
      'Network error. Please check your internet connection.',
      0,
      error
    );
  }

  const contentType = response.headers.get('content-type') || '';

  let data: any;

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => '');
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      (typeof data === 'string' && data) ||
      `API request failed (${response.status})`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

/* =========================================
   API METHODS
========================================= */

export const api = {

  /* =====================================
     AUTHENTICATION
  ===================================== */

  getCurrentUser: async () => {
    return fetchWithAuth('/api/auth/me');
  },

  /* =====================================
     SPREADSHEET SETTINGS
     ADMIN ONLY - Backend must enforce
  ===================================== */

  getSpreadsheetStatus: async (): Promise<SheetConfigStatus> => {
    return fetchWithAuth('/api/spreadsheet/status');
  },

  configureSpreadsheet: async (spreadsheetId: string) => {
    return fetchWithAuth('/api/spreadsheet/configure', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId }),
    });
  },

  createNewSpreadsheet: async (title?: string) => {
    return fetchWithAuth('/api/spreadsheet/create-new', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  initializeMissingSheets: async () => {
    return fetchWithAuth('/api/spreadsheet/initialize', {
      method: 'POST',
    });
  },

  /* =====================================
     PRODUCTS
     ADMIN + EMPLOYEE
  ===================================== */

  getProducts: async (): Promise<ProductItem[]> => {
    return fetchWithAuth('/api/products');
  },

  createProduct: async (
    product: Partial<ProductItem>
  ): Promise<ProductItem> => {
    return fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  updateProduct: async (
    codeNo: string,
    updates: Partial<ProductItem>
  ): Promise<ProductItem> => {
    return fetchWithAuth(
      `/api/products/${encodeURIComponent(codeNo)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  },

  /* =====================================
     PRICE HISTORY
     Employee email visibility must be
     filtered by Backend
  ===================================== */

  getPriceHistory: async (): Promise<PriceHistoryRecord[]> => {
    return fetchWithAuth('/api/price-history');
  },

  /* =====================================
     QUOTATIONS
  ===================================== */

  getQuotations: async (): Promise<QuotationRecord[]> => {
    return fetchWithAuth('/api/quotations');
  },

  createQuotation: async (
    quotationData: Partial<QuotationRecord>
  ): Promise<QuotationRecord> => {
    return fetchWithAuth('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
  },

  updateQuotationStatus: async (
    quotationNo: string,
    status: string
  ): Promise<QuotationRecord> => {
    return fetchWithAuth(
      `/api/quotations/${encodeURIComponent(quotationNo)}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }
    );
  },

  /* =====================================
     CS RATE
  ===================================== */

  getCSRates: async (): Promise<CSRateRecord[]> => {
    return fetchWithAuth('/api/cs-rates');
  },

  createCSRate: async (
    csRateData: Partial<CSRateRecord>
  ): Promise<CSRateRecord> => {
    return fetchWithAuth('/api/cs-rates', {
      method: 'POST',
      body: JSON.stringify(csRateData),
    });
  },

  /* =====================================
     DELIVERY
  ===================================== */

  getDeliveries: async (): Promise<DeliveryRecord[]> => {
    return fetchWithAuth('/api/deliveries');
  },

  createDelivery: async (
    deliveryData: Partial<DeliveryRecord>
  ): Promise<DeliveryRecord> => {
    return fetchWithAuth('/api/deliveries', {
      method: 'POST',
      body: JSON.stringify(deliveryData),
    });
  },

  /* =====================================
     CHALLAN
  ===================================== */

  getChallans: async (): Promise<ChalanRecord[]> => {
    return fetchWithAuth('/api/challans');
  },

  createChallan: async (
    challanData: Partial<ChalanRecord>
  ): Promise<ChalanRecord> => {
    return fetchWithAuth('/api/challans', {
      method: 'POST',
      body: JSON.stringify(challanData),
    });
  },

  /* =====================================
     BILLS
  ===================================== */

  getBills: async (): Promise<BillRecord[]> => {
    return fetchWithAuth('/api/bills');
  },

  createBill: async (
    billData: Partial<BillRecord>
  ): Promise<BillRecord> => {
    return fetchWithAuth('/api/bills', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
  },

  recordBillPayment: async (
    billNo: string,
    paymentAmount: number,
    paymentMethod: string,
    paymentNote?: string
  ) => {
    return fetchWithAuth(
      `/api/bills/${encodeURIComponent(billNo)}/payment`,
      {
        method: 'PUT',
        body: JSON.stringify({
          paymentAmount,
          paymentMethod,
          paymentNote,
        }),
      }
    );
  },

  /* =====================================
     USER MANAGEMENT
     ADMIN ONLY - Backend must enforce
  ===================================== */

  getUsers: async (): Promise<UserAccessRecord[]> => {
    return fetchWithAuth('/api/users');
  },

  addUser: async (
    email: string,
    role: string,
    status: string = 'Active'
  ): Promise<UserAccessRecord> => {
    return fetchWithAuth('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        role,
        status,
      }),
    });
  },

  updateUser: async (
    email: string,
    updates: {
      role?: string;
      status?: string;
    }
  ): Promise<UserAccessRecord> => {
    return fetchWithAuth(
      `/api/users/${encodeURIComponent(email)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  },

  /* =====================================
     ACTIVITY LOGS
     ADMIN ONLY - Backend must enforce
  ===================================== */

  getActivityLogs: async (): Promise<ActivityLogRecord[]> => {
    return fetchWithAuth('/api/activity-logs');
  },

  /* =====================================
     DASHBOARD
  ===================================== */

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    return fetchWithAuth('/api/dashboard/metrics');
  },

  /* =====================================
     GOOGLE DRIVE IMAGE UPLOAD
  ===================================== */

  uploadProductImage: async (
    base64Data: string,
    fileName: string,
    mimeType: string
  ) => {
    return fetchWithAuth('/api/drive/upload', {
      method: 'POST',
      body: JSON.stringify({
        base64Data,
        fileName,
        mimeType,
      }),
    });
  },

};
