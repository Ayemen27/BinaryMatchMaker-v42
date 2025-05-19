import { users, type User, type InsertUser, signals, type Signal, type InsertSignal } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

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
  sessionStore: session.Store;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Seed initial data if needed
    this.seedInitialData();
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      subscriptionLevel: 'free',
      language: 'ar', // Default to Arabic
      createdAt: new Date(),
    }).returning();
    
    return user;
  }
  
  async updateUserProfile(id: number, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }
  
  async updateUserLanguage(id: number, language: string): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ language })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }
  
  async getSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(eq(signals.status, 'active'));
  }
  
  async getSignalHistory(): Promise<Signal[]> {
    return db.select().from(signals);
  }
  
  async getSignalById(id: number): Promise<Signal | undefined> {
    const [signal] = await db.select()
      .from(signals)
      .where(eq(signals.id, id));
    
    return signal;
  }
  
  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const [signal] = await db.insert(signals)
      .values({
        ...insertSignal,
        createdAt: new Date(),
        status: 'active',
        result: null,
      })
      .returning();
    
    return signal;
  }
  
  private async seedInitialData() {
    // Check if we already have signals
    const existingSignals = await db.select().from(signals).limit(1);
    
    if (existingSignals.length === 0) {
      // Seed initial signals
      const assets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'];
      const indicators = [['RSI', 'MACD'], ['MA', 'MACD'], ['RSI', 'Bollinger'], ['MACD', 'OBV'], ['RSI', 'Stoch']];
      const times = ['12:30', '10:15', '09:45', '15:20', '14:05'];
      
      // Create 5 active signals
      for (let i = 0; i < 5; i++) {
        const type = i % 2 === 0 ? 'buy' : 'sell';
        const basePrice = (37000 + Math.random() * 3000).toFixed(2);
        
        const entryPrice = parseFloat(basePrice);
        const targetPrice = type === 'buy'
          ? (entryPrice + (entryPrice * 0.03)).toFixed(2)
          : (entryPrice - (entryPrice * 0.03)).toFixed(2);
        const stopLoss = type === 'buy'
          ? (entryPrice - (entryPrice * 0.02)).toFixed(2)
          : (entryPrice + (entryPrice * 0.02)).toFixed(2);
        
        await db.insert(signals).values({
          asset: assets[i],
          type: type as 'buy' | 'sell',
          entryPrice: entryPrice.toString(),
          targetPrice: targetPrice.toString(),
          stopLoss: stopLoss.toString(),
          accuracy: 85 + Math.floor(Math.random() * 11),
          time: times[i],
          status: 'active',
          indicators: indicators[i],
          createdAt: new Date(),
          result: null
        });
      }
      
      // Create 5 completed signals
      for (let i = 0; i < 5; i++) {
        const type = i % 2 === 0 ? 'buy' : 'sell';
        const basePrice = (37000 + Math.random() * 3000).toFixed(2);
        
        const entryPrice = parseFloat(basePrice);
        const targetPrice = type === 'buy'
          ? (entryPrice + (entryPrice * 0.03)).toFixed(2)
          : (entryPrice - (entryPrice * 0.03)).toFixed(2);
        const stopLoss = type === 'buy'
          ? (entryPrice - (entryPrice * 0.02)).toFixed(2)
          : (entryPrice + (entryPrice * 0.02)).toFixed(2);
        
        await db.insert(signals).values({
          asset: assets[i],
          type: type as 'buy' | 'sell',
          entryPrice: entryPrice.toString(),
          targetPrice: targetPrice.toString(),
          stopLoss: stopLoss.toString(),
          accuracy: 85 + Math.floor(Math.random() * 11),
          time: 'أمس ' + times[i],
          status: 'completed',
          indicators: indicators[i],
          createdAt: new Date(Date.now() - 86400000 * (i + 1)), // Created 1-5 days ago
          result: Math.random() < 0.9 ? 'success' : 'failure'
        });
      }
    }
  }
}

export const storage = new DatabaseStorage();