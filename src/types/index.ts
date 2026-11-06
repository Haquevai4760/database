export type UserRole = 'Admin' | 'Employee';
export type UserStatus = 'Active' | 'Inactive';

export interface UserAccessRecord {
  email: string;
  role: UserRole;
  status: UserStatus;
  addedOn: string;
  name?: string;
  picture?: string;
}

export interface ProductItem {
  itemName: string;       // Column A
  codeNo: string;         // Column B
  brandName: string;      // Column C
  size: string;           // Column D
  unit: string;           // Column E
  unitPrice: number;      // Column F
  updatedDate: string;    // Column G
  remark: string;         // Column H
  category: string;       // Column I (Reserved/Category)
  productImageFileId: string; // Column J
}

export interface PriceHistoryRecord {
  id?: string;
  updateDate: string;
  itemName: string;
  codeNo: string;
  brandName: string;
  size: string;
  previousPrice: number;
  newPrice: number;
  priceDiff?: number;
  remark: string;
  updatedBy: string;
}

export interface QuotationLineItem {
  codeNo: string;
  itemName: string;
  brandName?: string;
  size: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface QuotationRecord {
  quotationNo: string;
  date: string;
  customerName: string;
  customerContact: string;
  items: QuotationLineItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  grandTotal: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  createdBy: string;
  notes?: string;
}

export interface CSRateRecord {
  itemName: string;
  codeNo: string;
  brand: string;
  size?: string;
  vendorA: string;
  rateA: number;
  vendorB: string;
  rateB: number;
  vendorC: string;
  rateC: number;
  recommendedVendor: string;
  lowestRate: number;
  remarks: string;
  updatedDate: string;
}

export interface DeliveryRecord {
  deliveryNo: string;
  date: string;
  customerName: string;
  quotationNo: string;
  itemsSummary: string;
  deliveryStatus: 'Pending' | 'In Transit' | 'Delivered' | 'Returned';
  deliveredBy: string;
  remarks: string;
}

export interface ChalanRecord {
  challanNo: string;
  date: string;
  customerName: string;
  deliveryNo: string;
  vehicleNo: string;
  itemsDetails: string;
  receivedBy: string;
  remarks: string;
}

export interface BillRecord {
  billNo: string;
  date: string;
  customerName: string;
  referenceNo: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  paymentMethod: string;
  remarks: string;
}

export interface ActivityLogRecord {
  id?: string;
  timestamp: string;
  userEmail: string;
  action: string;
  module: string;
  details: string;
}

export interface DashboardMetrics {
  totalProducts: number;
  totalQuotations: number;
  totalDeliveries: number;
  totalChallans: number;
  totalBills: number;
  totalReceivables: number;
  recentActivities: ActivityLogRecord[];
  recentProducts: ProductItem[];
}

export interface SheetConfigStatus {
  connected: boolean;
  spreadsheetId: string;
  spreadsheetTitle?: string;
  sheetsFound: string[];
  missingSheets: string[];
  isUsingFallbackData: boolean;
  message?: string;
}
