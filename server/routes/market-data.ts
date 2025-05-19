/**
 * واجهة برمجية لبيانات السوق
 * توفر معلومات عن أسعار الأصول وبيانات السوق الأخرى
 */

import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { logger } from '../services/logger';

const router = Router();

/**
 * الحصول على سعر زوج معين
 * GET /api/market-data/:pair
 */
router.get('/:pair', async (req: Request, res: Response) => {
  try {
    const { pair } = req.params;
    
    if (!pair) {
      return res.status(400).json({ error: 'يرجى تحديد زوج العملة' });
    }
    
    // محاولة الحصول على بيانات السوق من قاعدة البيانات
    let marketData = await storage.getMarketData(pair);
    
    // إذا لم يتم العثور على بيانات، قم بإنشاء بيانات افتراضية
    if (!marketData) {
      marketData = await generatePlaceholderMarketData(pair);
    }
    
    return res.json(marketData);
  } catch (error) {
    logger.error('MarketData', error instanceof Error ? error : new Error(String(error)), {
      route: 'GET /api/market-data/:pair',
      pair: req.params.pair
    });
    
    return res.status(500).json({ error: 'فشل في الحصول على بيانات السوق' });
  }
});

/**
 * الحصول على قائمة بالأزواج المتاحة
 * GET /api/market-data
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // قائمة بالأزواج المتاحة
    const availablePairs = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD',
      'BTC/USD', 'ETH/USD', 'XRP/USD', 'BNB/USD', 'SOL/USD'
    ];
    
    // بيانات موجزة عن كل زوج
    const pairsData = await Promise.all(
      availablePairs.map(async (pair) => {
        // محاولة الحصول على بيانات السوق من قاعدة البيانات
        let marketData = await storage.getMarketData(pair);
        
        // إذا لم يتم العثور على بيانات، استخدم الافتراضية
        if (!marketData) {
          marketData = await generatePlaceholderMarketData(pair);
        }
        
        return {
          pair,
          price: marketData.price,
          change24h: marketData.change24h || '0%'
        };
      })
    );
    
    return res.json(pairsData);
  } catch (error) {
    logger.error('MarketData', error instanceof Error ? error : new Error(String(error)), {
      route: 'GET /api/market-data'
    });
    
    return res.status(500).json({ error: 'فشل في الحصول على قائمة الأزواج' });
  }
});

/**
 * توليد بيانات سوق افتراضية لزوج معين
 * @param pair زوج العملة
 * @returns بيانات السوق الافتراضية
 */
async function generatePlaceholderMarketData(pair: string) {
  // تحديد سعر أساسي قريب من الواقع بناءً على نوع العملة
  let basePrice = 0;
  const now = new Date();
  
  if (pair.startsWith('BTC') || pair.includes('BTC')) {
    basePrice = 37500 + Math.floor(Math.random() * 2000);
  } else if (pair.startsWith('ETH') || pair.includes('ETH')) {
    basePrice = 2200 + Math.floor(Math.random() * 200);
  } else if (pair.startsWith('SOL') || pair.includes('SOL')) {
    basePrice = 140 + Math.floor(Math.random() * 20);
  } else if (pair.startsWith('XRP') || pair.includes('XRP')) {
    basePrice = 0.5 + Math.random() * 0.2;
  } else if (pair.startsWith('EUR') || pair.includes('EUR')) {
    basePrice = 1.08 + Math.random() * 0.02;
  } else if (pair.startsWith('GBP') || pair.includes('GBP')) {
    basePrice = 1.27 + Math.random() * 0.02;
  } else if (pair.startsWith('USD') || pair.includes('USD')) {
    basePrice = 1 + Math.random() * 0.01;
  } else {
    basePrice = 100 + Math.floor(Math.random() * 50);
  }
  
  // حفظ وإرجاع بيانات السوق
  return await storage.saveMarketData({
    asset: pair,
    price: basePrice.toFixed(2),
    change24h: (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 5).toFixed(2) + '%',
    high24h: (basePrice * 1.02).toFixed(2),
    low24h: (basePrice * 0.98).toFixed(2),
    volume24h: (Math.random() * 1000000 + 500000).toFixed(0),
    marketCap: (basePrice * (Math.random() * 1000000 + 5000000)).toFixed(0),
    dataSource: 'Server Model'
  });
}

export default router;