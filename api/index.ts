import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appPromise } from '../server';

let appInstance: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    appInstance ||= await appPromise;
    return appInstance(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    return res.status(500).json({ error: 'API initialization failed.' });
  }
}
