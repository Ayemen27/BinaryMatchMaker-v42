import { Signal } from '@/types';

interface GeneratorOptions {
  statusRatio?: {
    active: number;
    completed: number;
  };
  typeRatio?: {
    buy: number;
    sell: number;
  };
}

const defaultOptions: GeneratorOptions = {
  statusRatio: { active: 0.5, completed: 0.5 },
  typeRatio: { buy: 0.5, sell: 0.5 }
};

const assets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'];
const indicators = ['RSI', 'MACD', 'MA', 'Bollinger', 'Stoch', 'OBV', 'EMA', 'ATR'];
const times = ['12:30', '10:15', '09:45', '15:20', '14:05', '11:35', 'أمس 15:20', 'أمس 14:05'];

/**
 * Generates dummy signal data for development purposes
 * Note: This should NEVER be used in production - it's only for development
 */
export function generateDummySignals(count: number, options: GeneratorOptions = {}): Signal[] {
  const mergedOptions = { ...defaultOptions, ...options };
  const signals: Signal[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = Math.random() < mergedOptions.typeRatio!.buy ? 'buy' : 'sell';
    const basePrice = type === 'buy' 
      ? (37000 + Math.random() * 3000).toFixed(2)
      : (37000 + Math.random() * 3000).toFixed(2);
    
    const entryPrice = parseFloat(basePrice);
    const targetPrice = type === 'buy'
      ? (entryPrice + (entryPrice * (0.02 + Math.random() * 0.03))).toFixed(2)
      : (entryPrice - (entryPrice * (0.02 + Math.random() * 0.03))).toFixed(2);
    const stopLoss = type === 'buy'
      ? (entryPrice - (entryPrice * (0.01 + Math.random() * 0.02))).toFixed(2)
      : (entryPrice + (entryPrice * (0.01 + Math.random() * 0.02))).toFixed(2);
    
    const accuracy = Math.floor(85 + Math.random() * 11);
    const status = Math.random() < mergedOptions.statusRatio!.active ? 'active' : 'completed';
    
    // Get 2-3 random indicators
    const signalIndicators = [...indicators]
      .sort(() => 0.5 - Math.random())
      .slice(0, 2 + Math.floor(Math.random() * 2));
    
    signals.push({
      id: i + 1,
      asset: assets[Math.floor(Math.random() * assets.length)],
      type,
      entryPrice: entryPrice.toLocaleString(),
      targetPrice: targetPrice.toString(),
      stopLoss: stopLoss.toString(),
      accuracy,
      time: times[Math.floor(Math.random() * times.length)],
      status,
      indicators: signalIndicators,
      result: status === 'completed' ? (Math.random() < 0.9 ? 'success' : 'failure') : null
    });
  }
  
  return signals;
}
