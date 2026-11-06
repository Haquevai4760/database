
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appPromise } from '../server.js';

let appInstance: any = null;
let initializationPromise: Promise<any> | null = null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Initialize Express app only once per serverless instance
    if (!appInstance) {
      initializationPromise ??= appPromise;
      appInstance = await initializationPromise;
    }

    if (typeof appInstance !== 'function') {
      console.error('Invalid Express app: app is not a function');

      return res.status(500).json({
        success: false,
        error: 'Server configuration error.',
      });
    }

    // Pass request to Express
    return appInstance(req, res);

  } catch (error) {
    console.error('Vercel API initialization failed:', error);

    return res.status(500).json({
      success: false,
      error: 'API initialization failed.',
    });
  }
}
