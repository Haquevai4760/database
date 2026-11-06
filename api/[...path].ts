
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appPromise } from '../server';

let appInstance: any = null;
let initializationPromise: Promise<any> | null = null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (!appInstance) {
      initializationPromise ??= appPromise;
      appInstance = await initializationPromise;
    }

    if (typeof appInstance !== 'function') {
      throw new Error('Express application was not initialized correctly.');
    }

    return appInstance(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);

    return res.status(500).json({
      success: false,
      error: 'API initialization failed.',
    });
  }
}
