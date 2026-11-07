import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken, getGoogleServiceAccessToken } from './src/server/platformAuth.js';
import {
  SHEET_SCHEMAS,
  getSpreadsheetMetadata,
  createAndInitializeSpreadsheet,
  initializeMissingSheets,
  readSheetRows,
  appendSheetRow,
  updateSheetRow,
  uploadImageToDrive,
} from './src/server/googleSheets.js';
import {
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_PRICE_HISTORY,
  INITIAL_QUOTATIONS,
  INITIAL_CS_RATES,
  INITIAL_DELIVERIES,
  INITIAL_CHALANS,
  INITIAL_BILLS,
  INITIAL_ACTIVITY_LOGS,
} from './src/server/mockData.js';
import type {
  ProductItem,
  PriceHistoryRecord,
  UserAccessRecord,
  QuotationRecord,
  CSRateRecord,
  DeliveryRecord,
  ChalanRecord,
  BillRecord,
  ActivityLogRecord,
} from './src/types/index.js';


// Dynamic In-Memory Store (Synchronized with Google Sheets or acting as fast resilient cache)
const DEFAULT_SPREADSHEET_ID = '12xd8lipwlIOIAs64biRDHy4NZO8K6_FhURYd1bWGU4';
let configuredSpreadsheetId = process.env.SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'nhaque4760@gmail.com').toLowerCase().trim();

function logSyncNotice(sheetName: string, err: any) {
  const msg = err instanceof Error ? err.message : String(err);
  const cleanMsg = msg.replace(/\s+/g, ' ').slice(0, 150);
  console.info(`[Sync Info] Sheet '${sheetName}' cache served (${cleanMsg})`);
}

// Local cache / resilient fallback store
let localUsers: UserAccessRecord[] = [...INITIAL_USERS];
let localProducts: ProductItem[] = [...INITIAL_PRODUCTS];
let localPriceHistory: PriceHistoryRecord[] = [...INITIAL_PRICE_HISTORY];
let localQuotations: QuotationRecord[] = [...INITIAL_QUOTATIONS];
let localCSRates: CSRateRecord[] = [...INITIAL_CS_RATES];
let localDeliveries: DeliveryRecord[] = [...INITIAL_DELIVERIES];
let localChalans: ChalanRecord[] = [...INITIAL_CHALANS];
let localBills: BillRecord[] = [...INITIAL_BILLS];
let localActivityLogs: ActivityLogRecord[] = [...INITIAL_ACTIVITY_LOGS];

// Ensure super admin is in localUsers
if (!localUsers.some((u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL)) {
  localUsers.unshift({
    email: SUPER_ADMIN_EMAIL,
    role: 'Admin',
    status: 'Active',
    addedOn: new Date().toISOString().split('T')[0],
    name: 'Super Administrator',
  });
}

// Vercel instances are ephemeral. Configure SPREADSHEET_ID in Vercel Environment Variables.
function saveSpreadsheetConfig(id: string) {
  configuredSpreadsheetId = id.trim();
}

// Extended Request interface
interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    name: string;
    picture: string;
    role: 'Admin' | 'Employee';
    status: 'Active' | 'Inactive';
  };
  accessToken?: string;
}

// Activity logger helper
async function logActivity(
  req: AuthenticatedRequest,
  action: string,
  moduleName: string,
  details: string
) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const userEmail = req.user?.email || 'system';

  const newLog: ActivityLogRecord = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp,
    userEmail,
    action,
    module: moduleName,
    details,
  };

  localActivityLogs.unshift(newLog);

  // If connected to Google Sheets, append to 'Activity Log'
  if (configuredSpreadsheetId && req.accessToken) {
    try {
      await appendSheetRow(
        configuredSpreadsheetId,
        'Activity Log',
        [timestamp, userEmail, action, moduleName, details],
        req.accessToken
      );
    } catch (err) {
      logSyncNotice('Activity Log', err);
    }
  }
}

async function createApp() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // --- AUTHENTICATION & RBAC MIDDLEWARE ---
  const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify Firebase ID token, then use a server-side service account for Google APIs.
      const firebaseUser = await verifyFirebaseIdToken(token);
      const userEmail = (firebaseUser.email || '').toLowerCase().trim();
      if (!userEmail || !firebaseUser.email_verified) {
        return res.status(401).json({ error: 'A verified Google account is required.' });
      }
      req.accessToken = await getGoogleServiceAccessToken();
      const googleUser = {
        email: userEmail,
        name: firebaseUser.name || userEmail.split('@')[0],
        picture: firebaseUser.picture || '',
      };

      if (!userEmail) {
        return res.status(401).json({ error: 'Could not resolve email from Google account.' });
      }

      // Check User Access
      let userRecord: UserAccessRecord | undefined;

      // 1. Super admin is always authorized as Admin/Active
      if (userEmail === SUPER_ADMIN_EMAIL) {
        userRecord = {
          email: userEmail,
          role: 'Admin',
          status: 'Active',
          addedOn: '2026-01-01',
          name: googleUser.name || 'Super Administrator',
          picture: googleUser.picture,
        };
      } else {
        // Check Google Sheet User Access if connected
        if (!configuredSpreadsheetId) {
          return res.status(503).json({ error: 'User Access spreadsheet is not configured.' });
        }

        let rows: string[][];
        try {
          const result = await readSheetRows(configuredSpreadsheetId, 'User Access', req.accessToken!);
          rows = result.rows;
        } catch (sheetErr) {
          logSyncNotice('User Access', sheetErr);
          return res.status(503).json({ error: 'Unable to verify your account against the private User Access sheet. Please contact the administrator.' });
        }

        const accessRow = rows.find(
          (row) => row[0] && row[0].toLowerCase().trim() === userEmail
        );

        if (accessRow) {
          userRecord = {
            email: userEmail,
            role: (accessRow[1] === 'Admin' ? 'Admin' : 'Employee') as 'Admin' | 'Employee',
            status: (accessRow[2] === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
            addedOn: accessRow[3] || '',
            name: googleUser.name,
            picture: googleUser.picture,
          };
        }
      }

      if (!userRecord) {
        return res.status(403).json({
          error: `Access Denied: Your email address (${userEmail}) is not authorized. Please ask an Administrator to add your Google email to the User Access directory.`,
          unauthorizedEmail: userEmail,
        });
      }

      if (userRecord.status === 'Inactive') {
        return res.status(403).json({
          error: `Access Suspended: Your account (${userEmail}) has been set to Inactive. Please contact your system administrator.`,
        });
      }

      req.user = {
        email: userRecord.email,
        name: googleUser.name || userRecord.name || userEmail.split('@')[0],
        picture: googleUser.picture || '',
        role: userRecord.role,
        status: userRecord.status,
      };

      next();
    } catch (err: any) {
      console.error('Auth verification error:', err);
      return res.status(500).json({ error: 'Internal error verifying Google authentication session.' });
    }
  };

  const adminOnlyMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'Admin') {
      return res.status(403).json({
        error: 'Forbidden: This action requires Administrator privileges.',
      });
    }
    next();
  };

  // --- API ENDPOINTS ---

  // Auth Status & User Profile
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: req.user,
      isSuperAdmin: req.user?.email.toLowerCase() === SUPER_ADMIN_EMAIL,
    });
  });

  // Spreadsheet Status & Settings
  app.get('/api/spreadsheet/status', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!configuredSpreadsheetId) {
      return res.json({
        connected: false,
        spreadsheetId: '',
        sheetsFound: [],
        missingSheets: Object.keys(SHEET_SCHEMAS),
        isUsingFallbackData: true,
        message: 'No Google Spreadsheet configured. The application is operating in local mock/cache mode.',
      });
    }

    try {
      const metadata = await getSpreadsheetMetadata(configuredSpreadsheetId, req.accessToken!);
      const existingSheetNames = metadata.sheets.map((s) => s.title);
      const missing = Object.keys(SHEET_SCHEMAS).filter((name) => !existingSheetNames.includes(name));

      res.json({
        connected: true,
        spreadsheetId: configuredSpreadsheetId,
        spreadsheetTitle: metadata.title,
        sheetsFound: existingSheetNames,
        missingSheets: missing,
        isUsingFallbackData: false,
      });
    } catch (err: any) {
      res.json({
        connected: false,
        spreadsheetId: configuredSpreadsheetId,
        sheetsFound: [],
        missingSheets: Object.keys(SHEET_SCHEMAS),
        isUsingFallbackData: true,
        message: `Failed to connect to spreadsheet ${configuredSpreadsheetId}: ${err.message}`,
      });
    }
  });

  // Inspect Drive file or Apps Script project
  app.get('/api/drive/inspect/:fileId', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const fileId = req.params.fileId;
    try {
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,parents,webViewLink,description,owners`,
        {
          headers: { Authorization: `Bearer ${req.accessToken}` },
        }
      );
      if (!driveRes.ok) {
        const err = await driveRes.text();
        return res.status(driveRes.status).json({ error: err });
      }
      const data = await driveRes.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Configure existing Spreadsheet ID (Admin only)
  app.post('/api/spreadsheet/configure', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { spreadsheetId } = req.body;
    let cleanId = (spreadsheetId || '').trim();

    // If full URL was pasted, extract the sheet ID
    const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      cleanId = match[1];
    }

    if (!cleanId) {
      return res.status(400).json({ error: 'Please provide a valid Google Spreadsheet ID or URL.' });
    }

    try {
      const metadata = await getSpreadsheetMetadata(cleanId, req.accessToken!);
      saveSpreadsheetConfig(cleanId);

      await logActivity(
        req,
        'CONFIGURE_SPREADSHEET',
        'Settings',
        `Connected to Google Spreadsheet "${metadata.title}" (ID: ${cleanId})`
      );

      const existingSheetNames = metadata.sheets.map((s) => s.title);
      const missing = Object.keys(SHEET_SCHEMAS).filter((name) => !existingSheetNames.includes(name));

      res.json({
        success: true,
        spreadsheetId: cleanId,
        spreadsheetTitle: metadata.title,
        sheetsFound: existingSheetNames,
        missingSheets: missing,
      });
    } catch (err: any) {
      res.status(400).json({
        error: `Could not verify access to Google Spreadsheet. Check permissions: ${err.message}`,
      });
    }
  });

  // Create brand new Spreadsheet with all 9 sheets in Google Drive (Admin only)
  app.post('/api/spreadsheet/create-new', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const title = req.body.title || 'Price Database Management System Central Database';
    try {
      const result = await createAndInitializeSpreadsheet(title, req.accessToken!, req.user!.email);
      saveSpreadsheetConfig(result.spreadsheetId);

      await logActivity(
        req,
        'CREATE_SPREADSHEET',
        'Settings',
        `Created and initialized central Google Spreadsheet (ID: ${result.spreadsheetId})`
      );

      res.json({
        success: true,
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        message: 'Successfully created Google Spreadsheet with all 9 sheets initialized!',
      });
    } catch (err: any) {
      console.error('Failed to create spreadsheet:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Initialize missing sheets in existing spreadsheet (Admin only)
  app.post('/api/spreadsheet/initialize', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!configuredSpreadsheetId) {
      return res.status(400).json({ error: 'No spreadsheet configured to initialize.' });
    }

    try {
      const createdSheets = await initializeMissingSheets(configuredSpreadsheetId, req.accessToken!);
      await logActivity(
        req,
        'INITIALIZE_SHEETS',
        'Settings',
        `Initialized missing sheets: ${createdSheets.join(', ') || 'All sheets already present'}`
      );

      res.json({
        success: true,
        createdSheets,
        message: createdSheets.length > 0
          ? `Created ${createdSheets.length} missing sheets with required column structures.`
          : 'All 9 required sheets already exist with correct structures.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PRODUCTS (Price Database) ---
  app.get('/api/products', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { headers, rows } = await readSheetRows(configuredSpreadsheetId, 'Price Database', req.accessToken!);
        
        let codeIdx = 0;
        let nameIdx = 1;
        let brandIdx = 2;
        let sizeIdx = 3;
        let unitIdx = 4;
        let priceIdx = 5;
        let dateIdx = 6;
        let remarkIdx = 7;
        let catIdx = 8;
        let imgIdx = 9;

        headers.forEach((h, i) => {
          const lower = (h || '').toLowerCase().trim();
          if (lower.includes('code')) codeIdx = i;
          else if (lower.includes('item') || lower.includes('name')) nameIdx = i;
          else if (lower.includes('brand')) brandIdx = i;
          else if (lower.includes('size')) sizeIdx = i;
          else if (lower === 'unit') unitIdx = i;
          else if (lower.includes('price')) priceIdx = i;
          else if (lower.includes('date')) dateIdx = i;
          else if (lower.includes('remark')) remarkIdx = i;
          else if (lower.includes('category')) catIdx = i;
          else if (lower.includes('image') || lower.includes('file')) imgIdx = i;
        });

        const products: ProductItem[] = rows
          .filter((r) => (r[codeIdx] || r[nameIdx]) && r[codeIdx] !== 'Code No.')
          .map((r) => ({
            codeNo: r[codeIdx] || '',
            itemName: r[nameIdx] || '',
            brandName: r[brandIdx] || '',
            size: r[sizeIdx] || '',
            unit: r[unitIdx] || '',
            unitPrice: parseFloat(String(r[priceIdx] || '').replace(/,/g, '')) || 0,
            updatedDate: r[dateIdx] || '',
            remark: r[remarkIdx] || '',
            category: r[catIdx] || '',
            productImageFileId: r[imgIdx] || '',
          }));

        localProducts = products;
        return res.json(products);
      } catch (err) {
        logSyncNotice('Price Database', err);
      }
    }

    res.json(localProducts);
  });

  app.post('/api/products', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { itemName, codeNo, brandName, size, unit, unitPrice, remark, category, productImageFileId } = req.body;

    if (!itemName || !codeNo) {
      return res.status(400).json({ error: 'Item Name and Code No. are required.' });
    }

    const cleanCode = codeNo.trim().toUpperCase();

    // Check duplicate code
    const existing = localProducts.find((p) => p.codeNo.toUpperCase() === cleanCode);
    if (existing) {
      return res.status(400).json({ error: `Product Code "${cleanCode}" already exists (${existing.itemName}). Product Codes must be unique.` });
    }

    const updatedDate = new Date().toISOString().split('T')[0];
    const newProduct: ProductItem = {
      itemName: itemName.trim(),
      codeNo: cleanCode,
      brandName: (brandName || '').trim(),
      size: (size || '').trim(),
      unit: (unit || 'Pcs').trim(),
      unitPrice: Number(unitPrice) || 0,
      updatedDate,
      remark: (remark || '').trim(),
      category: (category || 'General').trim(),
      productImageFileId: (productImageFileId || '').trim(),
    };

    localProducts.unshift(newProduct);

    // Initial Price History entry
    const historyEntry: PriceHistoryRecord = {
      id: `ph-${Date.now()}`,
      updateDate: updatedDate,
      itemName: newProduct.itemName,
      codeNo: newProduct.codeNo,
      brandName: newProduct.brandName,
      size: newProduct.size,
      previousPrice: 0,
      newPrice: newProduct.unitPrice,
      priceDiff: newProduct.unitPrice,
      remark: remark ? `Initial catalog entry: ${remark}` : 'Initial catalog entry',
      updatedBy: req.user!.email,
    };
    localPriceHistory.unshift(historyEntry);

    // Sync with Google Sheets if configured
    if (configuredSpreadsheetId && req.accessToken) {
      try {
        await appendSheetRow(
          configuredSpreadsheetId,
          'Price Database',
          [
            newProduct.codeNo,
            newProduct.itemName,
            newProduct.brandName,
            newProduct.size,
            newProduct.unit,
            newProduct.unitPrice,
            newProduct.updatedDate,
            newProduct.remark,
            newProduct.category,
            newProduct.productImageFileId,
          ],
          req.accessToken
        );

        await appendSheetRow(
          configuredSpreadsheetId,
          'Price History',
          [
            historyEntry.updateDate,
            historyEntry.itemName,
            historyEntry.codeNo,
            historyEntry.brandName,
            historyEntry.size,
            historyEntry.previousPrice,
            historyEntry.newPrice,
            historyEntry.remark,
            historyEntry.updatedBy,
          ],
          req.accessToken
        );
      } catch (err) {
        logSyncNotice('Price Database (append)', err);
      }
    }

    await logActivity(
      req,
      'CREATE_PRODUCT',
      'Price Database',
      `Added product "${newProduct.itemName}" (${newProduct.codeNo}) at price ${newProduct.unitPrice}`
    );

    res.status(201).json(newProduct);
  });

  app.put('/api/products/:codeNo', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const targetCode = req.params.codeNo.toUpperCase();
    const { itemName, brandName, size, unit, unitPrice, remark, category, productImageFileId } = req.body;

    const prodIndex = localProducts.findIndex((p) => p.codeNo.toUpperCase() === targetCode);
    if (prodIndex === -1) {
      return res.status(404).json({ error: `Product with Code ${targetCode} not found.` });
    }

    const prevProduct = localProducts[prodIndex];
    const prevPrice = prevProduct.unitPrice;
    const newPrice = Number(unitPrice);
    const priceChanged = !isNaN(newPrice) && newPrice !== prevPrice;
    const updateDate = new Date().toISOString().split('T')[0];

    const updatedProduct: ProductItem = {
      ...prevProduct,
      itemName: itemName ? itemName.trim() : prevProduct.itemName,
      brandName: brandName !== undefined ? brandName.trim() : prevProduct.brandName,
      size: size !== undefined ? size.trim() : prevProduct.size,
      unit: unit !== undefined ? unit.trim() : prevProduct.unit,
      unitPrice: priceChanged ? newPrice : prevProduct.unitPrice,
      updatedDate: updateDate,
      remark: remark !== undefined ? remark.trim() : prevProduct.remark,
      category: category !== undefined ? category.trim() : prevProduct.category,
      productImageFileId: productImageFileId !== undefined ? productImageFileId.trim() : prevProduct.productImageFileId,
    };

    localProducts[prodIndex] = updatedProduct;

    // If price changed, create Price History record
    if (priceChanged) {
      const historyEntry: PriceHistoryRecord = {
        id: `ph-${Date.now()}`,
        updateDate,
        itemName: updatedProduct.itemName,
        codeNo: updatedProduct.codeNo,
        brandName: updatedProduct.brandName,
        size: updatedProduct.size,
        previousPrice: prevPrice,
        newPrice: newPrice,
        priceDiff: newPrice - prevPrice,
        remark: remark || 'Price updated',
        updatedBy: req.user!.email,
      };

      localPriceHistory.unshift(historyEntry);

      if (configuredSpreadsheetId && req.accessToken) {
        try {
          await appendSheetRow(
            configuredSpreadsheetId,
            'Price History',
            [
              historyEntry.updateDate,
              historyEntry.itemName,
              historyEntry.codeNo,
              historyEntry.brandName,
              historyEntry.size,
              historyEntry.previousPrice,
              historyEntry.newPrice,
              historyEntry.remark,
              historyEntry.updatedBy,
            ],
            req.accessToken
          );
        } catch (e) {
          logSyncNotice('Price History (append)', e);
        }
      }

      await logActivity(
        req,
        'UPDATE_PRICE',
        'Price Database',
        `Changed price for ${updatedProduct.codeNo} from ${prevPrice} to ${newPrice} (diff: ${newPrice - prevPrice})`
      );
    } else {
      await logActivity(
        req,
        'UPDATE_PRODUCT',
        'Price Database',
        `Updated details for product ${updatedProduct.codeNo} (${updatedProduct.itemName})`
      );
    }

    // Update in Google Sheet if configured
    if (configuredSpreadsheetId && req.accessToken) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Price Database', req.accessToken);
        const rowIndex = rows.findIndex(
          (r) => (r[0] && r[0].toUpperCase() === targetCode) || (r[1] && r[1].toUpperCase() === targetCode)
        );
        if (rowIndex !== -1) {
          await updateSheetRow(
            configuredSpreadsheetId,
            'Price Database',
            rowIndex + 2, // 1 for header + 1-indexed
            [
              updatedProduct.codeNo,
              updatedProduct.itemName,
              updatedProduct.brandName,
              updatedProduct.size,
              updatedProduct.unit,
              updatedProduct.unitPrice,
              updatedProduct.updatedDate,
              updatedProduct.remark,
              updatedProduct.category,
              updatedProduct.productImageFileId,
            ],
            req.accessToken
          );
        }
      } catch (err) {
        logSyncNotice('Price Database (update)', err);
      }
    }

    res.json(updatedProduct);
  });

  // Product deletion is intentionally not exposed as an API endpoint.
  // Only Admin may receive a future DELETE endpoint if deletion is required.

  // --- PRICE HISTORY ---
  app.get('/api/price-history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Price History', req.accessToken!);
        const history: PriceHistoryRecord[] = rows.map((r, i) => {
          const prev = parseFloat(r[5]) || 0;
          const next = parseFloat(r[6]) || 0;
          return {
            id: `ph-sheet-${i}`,
            updateDate: r[0] || '',
            itemName: r[1] || '',
            codeNo: r[2] || '',
            brandName: r[3] || '',
            size: r[4] || '',
            previousPrice: prev,
            newPrice: next,
            priceDiff: next - prev,
            remark: r[7] || '',
            updatedBy: r[8] || '',
          };
        });

        history.reverse(); // latest first
        localPriceHistory = history;

        // Admin can see every editor's email. Employees can see only their own email.
        const visibleHistory = req.user?.role === 'Admin'
          ? history
          : history.map((record) => ({
              ...record,
              updatedBy:
                record.updatedBy?.toLowerCase().trim() === req.user?.email.toLowerCase().trim()
                  ? record.updatedBy
                  : '',
            }));

        return res.json(visibleHistory);
      } catch (err) {
        logSyncNotice('Price History', err);
      }
    }

    const fallbackHistory = req.user?.role === 'Admin'
      ? localPriceHistory
      : localPriceHistory.map((record) => ({
          ...record,
          updatedBy: record.updatedBy?.toLowerCase().trim() === req.user?.email.toLowerCase().trim()
            ? record.updatedBy
            : '',
        }));
    res.json(fallbackHistory);
  });

  // --- QUOTATIONS ---
  app.get('/api/quotations', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Quotation', req.accessToken!);
        const quotations: QuotationRecord[] = rows.map((r) => {
          let parsedItems = [];
          try {
            parsedItems = r[11] ? JSON.parse(r[11]) : [];
          } catch (e) {
            parsedItems = [];
          }

          return {
            quotationNo: r[0] || '',
            date: r[1] || '',
            customerName: r[2] || '',
            customerContact: r[3] || '',
            items: parsedItems,
            subtotal: parseFloat(r[5]) || 0,
            discount: parseFloat(r[6]) || 0,
            taxRate: parseFloat(r[7]) || 0,
            grandTotal: parseFloat(r[8]) || 0,
            status: (r[9] || 'Draft') as any,
            createdBy: r[10] || '',
          };
        });

        localQuotations = quotations;
        return res.json(quotations);
      } catch (err) {
        logSyncNotice('Quotation', err);
      }
    }

    res.json(localQuotations);
  });

  app.post('/api/quotations', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { customerName, customerContact, items, discount = 0, taxRate = 0, notes } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer Name and at least one line item are required.' });
    }

    const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.unitPrice) * Number(it.quantity)), 0);
    const discAmount = Number(discount) || 0;
    const taxAmt = ((subtotal - discAmount) * (Number(taxRate) || 0)) / 100;
    const grandTotal = Math.round(subtotal - discAmount + taxAmt);

    const quotationNo = `QT-${new Date().getFullYear()}-${String(localQuotations.length + 91).padStart(4, '0')}`;
    const date = new Date().toISOString().split('T')[0];

    const newQuotation: QuotationRecord = {
      quotationNo,
      date,
      customerName: customerName.trim(),
      customerContact: (customerContact || '').trim(),
      items,
      subtotal,
      discount: discAmount,
      taxRate: Number(taxRate) || 0,
      grandTotal,
      status: 'Approved',
      createdBy: req.user!.email,
      notes: notes || '',
    };

    localQuotations.unshift(newQuotation);

    const itemsSummary = items.map((i: any) => `${i.quantity}x ${i.itemName}`).join(', ');

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        await appendSheetRow(
          configuredSpreadsheetId,
          'Quotation',
          [
            newQuotation.quotationNo,
            newQuotation.date,
            newQuotation.customerName,
            newQuotation.customerContact,
            itemsSummary,
            newQuotation.subtotal,
            newQuotation.discount,
            newQuotation.taxRate,
            newQuotation.grandTotal,
            newQuotation.status,
            newQuotation.createdBy,
            JSON.stringify(newQuotation.items),
          ],
          req.accessToken
        );
      } catch (e) {
        logSyncNotice('Quotation (append)', e);
      }
    }

    await logActivity(
      req,
      'CREATE_QUOTATION',
      'Quotation',
      `Created Quotation ${newQuotation.quotationNo} for ${newQuotation.customerName} (Total: ${newQuotation.grandTotal})`
    );

    res.status(201).json(newQuotation);
  });

  app.put('/api/quotations/:id/status', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const qNo = req.params.id;
    const { status } = req.body;

    const q = localQuotations.find((item) => item.quotationNo === qNo);
    if (!q) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    q.status = status;

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Quotation', req.accessToken);
        const rowIndex = rows.findIndex((r) => r[0] === qNo);
        if (rowIndex !== -1) {
          const r = rows[rowIndex];
          r[9] = status;
          await updateSheetRow(configuredSpreadsheetId, 'Quotation', rowIndex + 2, r, req.accessToken);
        }
      } catch (e) {
        logSyncNotice('Quotation (update)', e);
      }
    }

    await logActivity(req, 'UPDATE_QUOTATION_STATUS', 'Quotation', `Updated ${qNo} status to ${status}`);
    res.json(q);
  });

  // --- CS RATE (Comparative Statement Rates) ---
  app.get('/api/cs-rates', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'CS Rate', req.accessToken!);
        const rates: CSRateRecord[] = rows.map((r) => ({
          itemName: r[0] || '',
          codeNo: r[1] || '',
          brand: r[2] || '',
          vendorA: r[3] || '',
          rateA: parseFloat(r[4]) || 0,
          vendorB: r[5] || '',
          rateB: parseFloat(r[6]) || 0,
          vendorC: r[7] || '',
          rateC: parseFloat(r[8]) || 0,
          recommendedVendor: r[9] || '',
          lowestRate: parseFloat(r[10]) || 0,
          remarks: r[11] || '',
          updatedDate: r[12] || '',
        }));

        localCSRates = rates;
        return res.json(rates);
      } catch (err) {
        logSyncNotice('CS Rate', err);
      }
    }

    res.json(localCSRates);
  });

  app.post('/api/cs-rates', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { itemName, codeNo, brand, vendorA, rateA, vendorB, rateB, vendorC, rateC, remarks } = req.body;

    const rA = Number(rateA) || 0;
    const rB = Number(rateB) || 0;
    const rC = Number(rateC) || 0;

    const candidates = [
      { vendor: vendorA || 'Vendor A', rate: rA },
      { vendor: vendorB || 'Vendor B', rate: rB },
      { vendor: vendorC || 'Vendor C', rate: rC },
    ].filter((c) => c.rate > 0);

    let lowestRate = 0;
    let recommendedVendor = vendorA || 'Vendor A';

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.rate - b.rate);
      lowestRate = candidates[0].rate;
      recommendedVendor = candidates[0].vendor;
    }

    const updatedDate = new Date().toISOString().split('T')[0];

    const newRecord: CSRateRecord = {
      itemName: (itemName || '').trim(),
      codeNo: (codeNo || '').trim(),
      brand: (brand || '').trim(),
      vendorA: vendorA || '',
      rateA: rA,
      vendorB: vendorB || '',
      rateB: rB,
      vendorC: vendorC || '',
      rateC: rC,
      recommendedVendor,
      lowestRate,
      remarks: remarks || '',
      updatedDate,
    };

    localCSRates.unshift(newRecord);

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        await appendSheetRow(
          configuredSpreadsheetId,
          'CS Rate',
          [
            newRecord.itemName,
            newRecord.codeNo,
            newRecord.brand,
            newRecord.vendorA,
            newRecord.rateA,
            newRecord.vendorB,
            newRecord.rateB,
            newRecord.vendorC,
            newRecord.rateC,
            newRecord.recommendedVendor,
            newRecord.lowestRate,
            newRecord.remarks,
            newRecord.updatedDate,
          ],
          req.accessToken
        );
      } catch (e) {
        logSyncNotice('CS Rate (append)', e);
      }
    }

    await logActivity(req, 'ADD_CS_RATE', 'CS Rate', `Added CS rate comparison for ${newRecord.itemName} (${newRecord.codeNo})`);
    res.status(201).json(newRecord);
  });

  // --- DELIVERY ---
  app.get('/api/deliveries', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Delivery', req.accessToken!);
        const deliveries: DeliveryRecord[] = rows.map((r) => ({
          deliveryNo: r[0] || '',
          date: r[1] || '',
          customerName: r[2] || '',
          quotationNo: r[3] || '',
          itemsSummary: r[4] || '',
          deliveryStatus: (r[5] || 'Pending') as any,
          deliveredBy: r[6] || '',
          remarks: r[7] || '',
        }));

        localDeliveries = deliveries;
        return res.json(deliveries);
      } catch (err) {
        logSyncNotice('Delivery', err);
      }
    }

    res.json(localDeliveries);
  });

  app.post('/api/deliveries', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { customerName, quotationNo, itemsSummary, deliveryStatus = 'Pending', deliveredBy, remarks } = req.body;

    const deliveryNo = `DEL-${new Date().getFullYear()}-${String(localDeliveries.length + 47).padStart(4, '0')}`;
    const date = new Date().toISOString().split('T')[0];

    const newDelivery: DeliveryRecord = {
      deliveryNo,
      date,
      customerName: customerName.trim(),
      quotationNo: quotationNo || '',
      itemsSummary: itemsSummary || '',
      deliveryStatus,
      deliveredBy: deliveredBy || req.user!.name,
      remarks: remarks || '',
    };

    localDeliveries.unshift(newDelivery);

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        await appendSheetRow(
          configuredSpreadsheetId,
          'Delivery',
          [
            newDelivery.deliveryNo,
            newDelivery.date,
            newDelivery.customerName,
            newDelivery.quotationNo,
            newDelivery.itemsSummary,
            newDelivery.deliveryStatus,
            newDelivery.deliveredBy,
            newDelivery.remarks,
          ],
          req.accessToken
        );
      } catch (e) {
        logSyncNotice('Delivery (append)', e);
      }
    }

    await logActivity(req, 'CREATE_DELIVERY', 'Delivery', `Dispatched delivery ${newDelivery.deliveryNo} to ${newDelivery.customerName}`);
    res.status(201).json(newDelivery);
  });

  // --- CHALAN ---
  app.get('/api/challans', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Chalan', req.accessToken!);
        const chalans: ChalanRecord[] = rows.map((r) => ({
          challanNo: r[0] || '',
          date: r[1] || '',
          customerName: r[2] || '',
          deliveryNo: r[3] || '',
          vehicleNo: r[4] || '',
          itemsDetails: r[5] || '',
          receivedBy: r[6] || '',
          remarks: r[7] || '',
        }));

        localChalans = chalans;
        return res.json(chalans);
      } catch (err) {
        logSyncNotice('Chalan', err);
      }
    }

    res.json(localChalans);
  });

  app.post('/api/challans', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { customerName, deliveryNo, vehicleNo, itemsDetails, receivedBy, remarks } = req.body;

    const challanNo = `CH-${new Date().getFullYear()}-${String(localChalans.length + 79).padStart(4, '0')}`;
    const date = new Date().toISOString().split('T')[0];

    const newChalan: ChalanRecord = {
      challanNo,
      date,
      customerName: customerName.trim(),
      deliveryNo: deliveryNo || '',
      vehicleNo: vehicleNo || '',
      itemsDetails: itemsDetails || '',
      receivedBy: receivedBy || '',
      remarks: remarks || '',
    };

    localChalans.unshift(newChalan);

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        await appendSheetRow(
          configuredSpreadsheetId,
          'Chalan',
          [
            newChalan.challanNo,
            newChalan.date,
            newChalan.customerName,
            newChalan.deliveryNo,
            newChalan.vehicleNo,
            newChalan.itemsDetails,
            newChalan.receivedBy,
            newChalan.remarks,
          ],
          req.accessToken
        );
      } catch (e) {
        logSyncNotice('Chalan (append)', e);
      }
    }

    await logActivity(req, 'CREATE_CHALLAN', 'Chalan', `Generated Delivery Challan ${newChalan.challanNo} for ${newChalan.customerName}`);
    res.status(201).json(newChalan);
  });

  // --- BILL / INVOICING ---
  app.get('/api/bills', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Bill', req.accessToken!);
        const bills: BillRecord[] = rows.map((r) => ({
          billNo: r[0] || '',
          date: r[1] || '',
          customerName: r[2] || '',
          referenceNo: r[3] || '',
          totalAmount: parseFloat(r[4]) || 0,
          paidAmount: parseFloat(r[5]) || 0,
          balanceDue: parseFloat(r[6]) || 0,
          paymentStatus: (r[7] || 'Unpaid') as any,
          paymentMethod: r[8] || '',
          remarks: r[9] || '',
        }));

        localBills = bills;
        return res.json(bills);
      } catch (err) {
        logSyncNotice('Bill', err);
      }
    }

    res.json(localBills);
  });

  app.post('/api/bills', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { customerName, referenceNo, totalAmount, paidAmount = 0, paymentMethod = 'Bank Transfer', remarks } = req.body;

    const total = Number(totalAmount) || 0;
    const paid = Number(paidAmount) || 0;
    const balanceDue = Math.max(0, total - paid);
    let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
    if (balanceDue === 0 && total > 0) paymentStatus = 'Paid';
    else if (paid > 0) paymentStatus = 'Partial';

    const billNo = `INV-${new Date().getFullYear()}-${String(localBills.length + 114).padStart(4, '0')}`;
    const date = new Date().toISOString().split('T')[0];

    const newBill: BillRecord = {
      billNo,
      date,
      customerName: customerName.trim(),
      referenceNo: referenceNo || '',
      totalAmount: total,
      paidAmount: paid,
      balanceDue,
      paymentStatus,
      paymentMethod,
      remarks: remarks || '',
    };

    localBills.unshift(newBill);

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        await appendSheetRow(
          configuredSpreadsheetId,
          'Bill',
          [
            newBill.billNo,
            newBill.date,
            newBill.customerName,
            newBill.referenceNo,
            newBill.totalAmount,
            newBill.paidAmount,
            newBill.balanceDue,
            newBill.paymentStatus,
            newBill.paymentMethod,
            newBill.remarks,
          ],
          req.accessToken
        );
      } catch (e) {
        logSyncNotice('Bill (append)', e);
      }
    }

    await logActivity(req, 'CREATE_BILL', 'Bill', `Generated Bill ${newBill.billNo} for ${newBill.customerName} (Amount: ${newBill.totalAmount})`);
    res.status(201).json(newBill);
  });

  app.put('/api/bills/:id/payment', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const billNo = req.params.id;
    const { paymentAmount, paymentMethod, paymentNote } = req.body;

    const bill = localBills.find((b) => b.billNo === billNo);
    if (!bill) {
      return res.status(404).json({ error: 'Bill record not found.' });
    }

    const additionalPaid = Number(paymentAmount) || 0;
    bill.paidAmount += additionalPaid;
    bill.balanceDue = Math.max(0, bill.totalAmount - bill.paidAmount);
    if (bill.balanceDue === 0) bill.paymentStatus = 'Paid';
    else if (bill.paidAmount > 0) bill.paymentStatus = 'Partial';
    if (paymentMethod) bill.paymentMethod = paymentMethod;
    if (paymentNote) bill.remarks = `${bill.remarks ? bill.remarks + ' | ' : ''}Received ${additionalPaid} (${paymentNote})`;

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Bill', req.accessToken);
        const rowIndex = rows.findIndex((r) => r[0] === billNo);
        if (rowIndex !== -1) {
          await updateSheetRow(
            configuredSpreadsheetId,
            'Bill',
            rowIndex + 2,
            [
              bill.billNo,
              bill.date,
              bill.customerName,
              bill.referenceNo,
              bill.totalAmount,
              bill.paidAmount,
              bill.balanceDue,
              bill.paymentStatus,
              bill.paymentMethod,
              bill.remarks,
            ],
            req.accessToken
          );
        }
      } catch (e) {
        logSyncNotice('Bill (payment update)', e);
      }
    }

    await logActivity(req, 'RECORD_PAYMENT', 'Bill', `Recorded payment of ${additionalPaid} for ${billNo}`);
    res.json(bill);
  });

  // --- USER ACCESS MANAGEMENT (Admin Only) ---
  app.get('/api/users', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'User Access', req.accessToken!);
        const users: UserAccessRecord[] = rows.map((r) => ({
          email: (r[0] || '').toLowerCase().trim(),
          role: (r[1] === 'Admin' ? 'Admin' : 'Employee') as 'Admin' | 'Employee',
          status: (r[2] === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
          addedOn: r[3] || '',
        }));

        // Guarantee Super Admin is present
        if (!users.some((u) => u.email === SUPER_ADMIN_EMAIL)) {
          users.unshift({
            email: SUPER_ADMIN_EMAIL,
            role: 'Admin',
            status: 'Active',
            addedOn: '2026-01-01',
            name: 'Super Administrator',
          });
        }

        localUsers = users;
        return res.json(users);
      } catch (err) {
        logSyncNotice('User Access', err);
      }
    }

    res.json(localUsers);
  });

  app.post('/api/users', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { email, role = 'Employee', status = 'Active' } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid Google account email address.' });
    }

    // Check if user already exists
    if (localUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: `User with email ${cleanEmail} is already in the system.` });
    }

    const addedOn = new Date().toISOString().split('T')[0];
    const newUser: UserAccessRecord = {
      email: cleanEmail,
      role: role === 'Admin' ? 'Admin' : 'Employee',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      addedOn,
    };

    localUsers.push(newUser);

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        await appendSheetRow(
          configuredSpreadsheetId,
          'User Access',
          [newUser.email, newUser.role, newUser.status, newUser.addedOn],
          req.accessToken
        );
      } catch (e) {
        logSyncNotice('User Access (append)', e);
      }
    }

    await logActivity(req, 'ADD_USER', 'User Management', `Added user ${cleanEmail} with role ${newUser.role}`);
    res.status(201).json(newUser);
  });

  app.put('/api/users/:email', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const targetEmail = req.params.email.toLowerCase().trim();
    const { role, status } = req.body;

    // Security: Prevent demoting or deactivating the logged-in admin or super admin
    if (targetEmail === SUPER_ADMIN_EMAIL && (status === 'Inactive' || role !== 'Admin')) {
      return res.status(400).json({ error: 'Security Protection: The Super Administrator account cannot be demoted or deactivated.' });
    }
    if (targetEmail === req.user?.email.toLowerCase() && status === 'Inactive') {
      return res.status(400).json({ error: 'Security Protection: You cannot deactivate your own administrative account.' });
    }

    const userIndex = localUsers.findIndex((u) => u.email.toLowerCase() === targetEmail);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (role) localUsers[userIndex].role = role === 'Admin' ? 'Admin' : 'Employee';
    if (status) localUsers[userIndex].status = status === 'Inactive' ? 'Inactive' : 'Active';

    const updatedUser = localUsers[userIndex];

    if (configuredSpreadsheetId && req.accessToken) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'User Access', req.accessToken);
        const rowIndex = rows.findIndex((r) => r[0] && r[0].toLowerCase().trim() === targetEmail);
        if (rowIndex !== -1) {
          await updateSheetRow(
            configuredSpreadsheetId,
            'User Access',
            rowIndex + 2,
            [updatedUser.email, updatedUser.role, updatedUser.status, updatedUser.addedOn],
            req.accessToken
          );
        }
      } catch (e) {
        logSyncNotice('User Access (update)', e);
      }
    }

    await logActivity(
      req,
      'UPDATE_USER_PERMISSIONS',
      'User Management',
      `Updated user ${targetEmail}: Role=${updatedUser.role}, Status=${updatedUser.status}`
    );

    res.json(updatedUser);
  });

  // --- ACTIVITY LOGS ---
  app.get('/api/activity-logs', authMiddleware, adminOnlyMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (configuredSpreadsheetId) {
      try {
        const { rows } = await readSheetRows(configuredSpreadsheetId, 'Activity Log', req.accessToken!);
        const logs: ActivityLogRecord[] = rows.map((r, i) => ({
          id: `log-sheet-${i}`,
          timestamp: r[0] || '',
          userEmail: r[1] || '',
          action: r[2] || '',
          module: r[3] || '',
          details: r[4] || '',
        }));

        logs.reverse(); // latest first
        localActivityLogs = logs;
        return res.json(logs);
      } catch (err) {
        logSyncNotice('Activity Log', err);
      }
    }

    res.json(localActivityLogs);
  });

  // --- GOOGLE DRIVE IMAGE UPLOAD ---
  app.post('/api/drive/upload', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { base64Data, fileName, mimeType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'Base64 image data is required.' });
    }

    try {
      const uploadResult = await uploadImageToDrive(
        base64Data,
        fileName || `product-${Date.now()}.jpg`,
        mimeType || 'image/jpeg',
        req.accessToken!
      );

      await logActivity(
        req,
        'UPLOAD_PRODUCT_IMAGE',
        'Google Drive',
        `Uploaded product image ${fileName} (Drive ID: ${uploadResult.fileId})`
      );

      res.json(uploadResult);
    } catch (err: any) {
      console.error('Google Drive upload error:', err);
      res.status(500).json({ error: `Drive upload failed: ${err.message}` });
    }
  });

  // --- DASHBOARD METRICS ---
  app.get('/api/dashboard/metrics', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    // Employee dashboard is limited to product-related information.
    if (req.user?.role !== 'Admin') {
      return res.json({
        totalProducts: localProducts.length,
        recentProducts: localProducts.slice(0, 5),
      });
    }

    const totalReceivables = localBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);

    res.json({
      totalProducts: localProducts.length,
      totalQuotations: localQuotations.length,
      totalDeliveries: localDeliveries.length,
      totalChallans: localChalans.length,
      totalBills: localBills.length,
      totalReceivables,
      recentActivities: localActivityLogs.slice(0, 8),
      recentProducts: localProducts.slice(0, 5),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

export const appPromise = createApp();

// Local development only. Vercel imports appPromise and runs it as a serverless function.
if (process.env.NODE_ENV !== 'production') {
  appPromise.then((app) => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, '0.0.0.0', () => {
      console.log(`API server running on port ${port}`);
    });
  }).catch((error) => {
    console.error('Failed to initialize API server:', error);
  });
}
