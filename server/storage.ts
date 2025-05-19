import { users, type User, type InsertUser, signals, type Signal, type InsertSignal } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: number, data: Partial<User>): Promise<User>;
  updateUserLanguage(id: number, language: string): Promise<User>;
  
  // Signal methods
  getSignals(): Promise<Signal[]>;
  getSignalHistory(): Promise<Signal[]>;
  getSignalById(id: number): Promise<Signal | undefined>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private signals: Map<number, Signal>;
  sessionStore: session.SessionStore;
  currentUserId: number;
  currentSignalId: number;

  constructor() {
    this.users = new Map();
    this.signals = new Map();
    this.currentUserId = 1;
    this.currentSignalId = 1;
    
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Clear expired sessions every day
    });
    
    // Add some initial signals for demo purposes
    this.seedInitialSignals();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      subscriptionLevel: 'free',
      language: 'ar', // Default to Arabic
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserProfile(id: number, data: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserLanguage(id: number, language: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = { ...user, language };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getSignals(): Promise<Signal[]> {
    return Array.from(this.signals.values()).filter(signal => 
      signal.status === 'active'
    );
  }
  
  async getSignalHistory(): Promise<Signal[]> {
    return Array.from(this.signals.values());
  }
  
  async getSignalById(id: number): Promise<Signal | undefined> {
    return this.signals.get(id);
  }
  
  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const id = this.currentSignalId++;
    const now = new Date();
    
    const signal: Signal = {
      ...insertSignal,
      id,
      createdAt: now,
      status: 'active',
    };
    
    this.signals.set(id, signal);
    return signal;
  }
  
  private seedInitialSignals() {
    const assets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'];
    const indicators = [['RSI', 'MACD'], ['MA', 'MACD'], ['RSI', 'Bollinger'], ['MACD', 'OBV'], ['RSI', 'Stoch']];
    const times = ['12:30', '10:15', '09:45', '15:20', '14:05'];
    
    // Create 5 active signals
    for (let i = 0; i < 5; i++) {
      const type = i % 2 === 0 ? 'buy' : 'sell';
      const basePrice = type === 'buy' 
        ? (37000 + Math.random() * 3000).toFixed(2)
        : (37000 + Math.random() * 3000).toFixed(2);
      
      const entryPrice = parseFloat(basePrice);
      const targetPrice = type === 'buy'
        ? (entryPrice + (entryPrice * 0.03)).toFixed(2)
        : (entryPrice - (entryPrice * 0.03)).toFixed(2);
      const stopLoss = type === 'buy'
        ? (entryPrice - (entryPrice * 0.02)).toFixed(2)
        : (entryPrice + (entryPrice * 0.02)).toFixed(2);
      
      const signal: Signal = {
        id: this.currentSignalId++,
        asset: assets[i],
        type: type as 'buy' | 'sell',
        entryPrice: entryPrice.toString(),
        targetPrice: targetPrice.toString(),
        stopLoss: stopLoss.toString(),
        accuracy: 85 + Math.floor(Math.random() * 11),
        createdAt: new Date(),
        status: 'active',
        time: times[i],
        indicators: indicators[i],
      };
      
      this.signals.set(signal.id, signal);
    }
    
    // Create 5 completed signals
    for (let i = 0; i < 5; i++) {
      const type = i % 2 === 0 ? 'buy' : 'sell';
      const basePrice = type === 'buy' 
        ? (37000 + Math.random() * 3000).toFixed(2)
        : (37000 + Math.random() * 3000).toFixed(2);
      
      const entryPrice = parseFloat(basePrice);
      const targetPrice = type === 'buy'
        ? (entryPrice + (entryPrice * 0.03)).toFixed(2)
        : (entryPrice - (entryPrice * 0.03)).toFixed(2);
      const stopLoss = type === 'buy'
        ? (entryPrice - (entryPrice * 0.02)).toFixed(2)
        : (entryPrice + (entryPrice * 0.02)).toFixed(2);
      
      const signal: Signal = {
        id: this.currentSignalId++,
        asset: assets[i],
        type: type as 'buy' | 'sell',
        entryPrice: entryPrice.toString(),
        targetPrice: targetPrice.toString(),
        stopLoss: stopLoss.toString(),
        accuracy: 85 + Math.floor(Math.random() * 11),
        createdAt: new Date(Date.now() - 86400000 * (i + 1)), // Created 1-5 days ago
        status: 'completed',
        time: 'أمس ' + times[i],
        indicators: indicators[i],
        result: Math.random() < 0.9 ? 'success' : 'failure',
      };
      
      this.signals.set(signal.id, signal);
    }
  }
}

export const storage = new MemStorage();
