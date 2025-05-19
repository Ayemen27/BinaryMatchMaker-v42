export interface Signal {
  id: number;
  asset: string;
  type: 'buy' | 'sell';
  entryPrice: string;
  targetPrice: string;
  stopLoss: string;
  accuracy: number;
  time: string;
  status: 'active' | 'completed';
  indicators: string[];
  timeframes?: string[];
  createdAt?: Date;
  result?: 'success' | 'failure' | null;
  expiresAt?: string;
  platform?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  subscriptionLevel: 'free' | 'basic' | 'pro' | 'vip';
  subscriptionExpiry?: Date;
  language?: 'ar' | 'en';
  createdAt?: Date;
}

export interface TechnicalIndicator {
  name: string;
  value: number | string;
  interpretation?: 'buy' | 'sell' | 'neutral';
}

export interface MarketData {
  asset: string;
  price: string;
  change: string;
  isPositive: boolean;
  volume?: string;
  marketCap?: string;
  high24h?: string;
  low24h?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: {
    text: string;
    available: boolean;
  }[];
  isPopular?: boolean;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  signalGeneration: boolean;
  signalResults: boolean;
  marketAlerts: boolean;
  accountAlerts: boolean;
}
