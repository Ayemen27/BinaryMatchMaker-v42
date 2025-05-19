import { 
  users, type User, type InsertUser, 
  signals, type Signal, type InsertSignal,
  userSettings, type UserSettings, type InsertUserSettings,
  userNotificationSettings, type UserNotificationSettings, type InsertUserNotificationSettings,
  subscriptions, type Subscription, type InsertSubscription,
  userSignals, type UserSignal, type InsertUserSignal,
  userSignalUsage, type UserSignalUsage,
  notifications, type Notification, type InsertNotification,
  marketData, type MarketData
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lt, desc, count, isNull } from "drizzle-orm";
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
  updateUserLastLogin(id: number): Promise<void>;
  
  // User settings methods
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: Partial<UserSettings>): Promise<UserSettings>;
  
  // User notification settings methods
  getUserNotificationSettings(userId: number): Promise<UserNotificationSettings | undefined>;
  createUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings>;
  updateUserNotificationSettings(userId: number, settings: Partial<UserNotificationSettings>): Promise<UserNotificationSettings>;
  
  // Subscription methods
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  createUserSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateUserSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription>;
  
  // Signal methods
  getSignals(): Promise<Signal[]>;
  getActiveSignals(): Promise<Signal[]>;
  getCompletedSignals(): Promise<Signal[]>;
  getSignalHistory(): Promise<Signal[]>;
  getSignalById(id: number): Promise<Signal | undefined>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  updateSignalStatus(id: number, status: 'active' | 'completed'): Promise<Signal>;
  updateSignalResult(id: number, result: 'success' | 'failure'): Promise<Signal>;
  getUserSignalUsageToday(userId: number): Promise<number>;
  
  // User signals methods
  getUserSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]>;
  getUserFavoriteSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]>;
  addSignalToUser(userId: number, signalId: number): Promise<UserSignal>;
  markSignalAsFavorite(userId: number, signalId: number, isFavorite: boolean): Promise<UserSignal>;
  updateUserSignalNotes(userId: number, signalId: number, notes: string): Promise<UserSignal>;
  
  // Signal usage methods
  trackSignalUsage(userId: number, type: 'generated' | 'viewed' | 'analyzed'): Promise<void>;
  getSignalUsage(userId: number, date?: Date): Promise<UserSignalUsage | undefined>;
  
  // Notification methods
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUserUnreadNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  
  // Market data methods
  getMarketData(asset: string): Promise<MarketData | undefined>;
  saveMarketData(data: { asset: string; price: string; change24h?: string; high24h?: string; low24h?: string; volume24h?: string; marketCap?: string; dataSource?: string }): Promise<MarketData>;
  
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

  // User methods
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
      language: insertUser.language || 'ar', // Default to Arabic
      createdAt: new Date(),
    }).returning();
    
    // Create default settings for the user
    await this.createUserSettings({
      userId: user.id,
      theme: "dark",
      defaultAsset: "BTC/USDT",
      defaultTimeframe: "1h",
    });
    
    // Create default notification settings
    await this.createUserNotificationSettings({
      userId: user.id,
      emailNotifications: true,
      pushNotifications: true,
      signalAlerts: true,
      marketUpdates: true,
      accountAlerts: true,
      promotionalEmails: false,
    });
    
    // Create default subscription
    await this.createUserSubscription({
      userId: user.id,
      type: "free",
      startDate: new Date(),
      isActive: true,
      dailySignalLimit: 3,
    });
    
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
  
  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }
  
  // User settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }
  
  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [createdSettings] = await db
      .insert(userSettings)
      .values({
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return createdSettings;
  }
  
  async updateUserSettings(userId: number, settings: Partial<UserSettings>): Promise<UserSettings> {
    const [updatedSettings] = await db
      .update(userSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();
    
    if (!updatedSettings) {
      throw new Error('User settings not found');
    }
    
    return updatedSettings;
  }
  
  // User notification settings methods
  async getUserNotificationSettings(userId: number): Promise<UserNotificationSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));
    return settings;
  }
  
  async createUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings> {
    const [createdSettings] = await db
      .insert(userNotificationSettings)
      .values({
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return createdSettings;
  }
  
  async updateUserNotificationSettings(userId: number, settings: Partial<UserNotificationSettings>): Promise<UserNotificationSettings> {
    const [updatedSettings] = await db
      .update(userNotificationSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationSettings.userId, userId))
      .returning();
    
    if (!updatedSettings) {
      throw new Error('User notification settings not found');
    }
    
    return updatedSettings;
  }
  
  // Subscription methods
  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.isActive, true)
      ));
    return subscription;
  }
  
  async createUserSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [createdSubscription] = await db
      .insert(subscriptions)
      .values({
        ...subscription,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return createdSubscription;
  }
  
  async updateUserSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription> {
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set({
        ...subscription,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();
    
    if (!updatedSubscription) {
      throw new Error('Subscription not found');
    }
    
    return updatedSubscription;
  }
  
  // Signal methods
  async getSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(eq(signals.status, 'active'))
      .orderBy(desc(signals.createdAt));
  }
  
  async getActiveSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(eq(signals.status, 'active'))
      .orderBy(desc(signals.createdAt));
  }
  
  async getCompletedSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(eq(signals.status, 'completed'))
      .orderBy(desc(signals.createdAt));
  }
  
  async getSignalHistory(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .orderBy(desc(signals.createdAt));
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
        updatedAt: new Date(),
        status: 'active',
        result: null,
      })
      .returning();
    
    return signal;
  }
  
  async updateSignalStatus(id: number, status: 'active' | 'completed'): Promise<Signal> {
    const now = new Date();
    const updateData: any = { 
      status,
      updatedAt: now,
    };
    
    if (status === 'completed') {
      updateData.completedAt = now;
    }
    
    const [updatedSignal] = await db
      .update(signals)
      .set(updateData)
      .where(eq(signals.id, id))
      .returning();
    
    if (!updatedSignal) {
      throw new Error('Signal not found');
    }
    
    return updatedSignal;
  }
  
  async updateSignalResult(id: number, result: 'success' | 'failure'): Promise<Signal> {
    const [updatedSignal] = await db
      .update(signals)
      .set({
        result,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(signals.id, id))
      .returning();
    
    if (!updatedSignal) {
      throw new Error('Signal not found');
    }
    
    return updatedSignal;
  }
  
  async getUserSignalUsageToday(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [usage] = await db
      .select({
        count: count(),
      })
      .from(userSignalUsage)
      .where(
        and(
          eq(userSignalUsage.userId, userId),
          gte(userSignalUsage.date, today)
        )
      );
    
    return Number(usage?.count || 0);
  }
  
  // User signals methods
  async getUserSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]> {
    return db
      .select({
        ...userSignals,
        signal: signals,
      })
      .from(userSignals)
      .innerJoin(signals, eq(userSignals.signalId, signals.id))
      .where(eq(userSignals.userId, userId))
      .orderBy(desc(userSignals.createdAt));
  }
  
  async getUserFavoriteSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]> {
    return db
      .select({
        ...userSignals,
        signal: signals,
      })
      .from(userSignals)
      .innerJoin(signals, eq(userSignals.signalId, signals.id))
      .where(
        and(
          eq(userSignals.userId, userId),
          eq(userSignals.isFavorite, true)
        )
      )
      .orderBy(desc(userSignals.createdAt));
  }
  
  async addSignalToUser(userId: number, signalId: number): Promise<UserSignal> {
    // Check if relation already exists
    const [existing] = await db
      .select()
      .from(userSignals)
      .where(
        and(
          eq(userSignals.userId, userId),
          eq(userSignals.signalId, signalId)
        )
      );
    
    if (existing) {
      return existing;
    }
    
    const [userSignal] = await db
      .insert(userSignals)
      .values({
        userId,
        signalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return userSignal;
  }
  
  async markSignalAsFavorite(userId: number, signalId: number, isFavorite: boolean): Promise<UserSignal> {
    // Check if relation exists first
    const [existing] = await db
      .select()
      .from(userSignals)
      .where(
        and(
          eq(userSignals.userId, userId),
          eq(userSignals.signalId, signalId)
        )
      );
    
    if (!existing) {
      // Create relation first
      const [userSignal] = await db
        .insert(userSignals)
        .values({
          userId,
          signalId,
          isFavorite,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return userSignal;
    }
    
    // Update existing relation
    const [updatedUserSignal] = await db
      .update(userSignals)
      .set({
        isFavorite,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSignals.userId, userId),
          eq(userSignals.signalId, signalId)
        )
      )
      .returning();
    
    return updatedUserSignal;
  }
  
  async updateUserSignalNotes(userId: number, signalId: number, notes: string): Promise<UserSignal> {
    // Check if relation exists first
    const [existing] = await db
      .select()
      .from(userSignals)
      .where(
        and(
          eq(userSignals.userId, userId),
          eq(userSignals.signalId, signalId)
        )
      );
    
    if (!existing) {
      // Create relation first
      const [userSignal] = await db
        .insert(userSignals)
        .values({
          userId,
          signalId,
          notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return userSignal;
    }
    
    // Update existing relation
    const [updatedUserSignal] = await db
      .update(userSignals)
      .set({
        notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSignals.userId, userId),
          eq(userSignals.signalId, signalId)
        )
      )
      .returning();
    
    return updatedUserSignal;
  }
  
  // Signal usage methods
  async trackSignalUsage(userId: number, type: 'generated' | 'viewed' | 'analyzed'): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if there's an entry for today
    const [existingUsage] = await db
      .select()
      .from(userSignalUsage)
      .where(
        and(
          eq(userSignalUsage.userId, userId),
          gte(userSignalUsage.date, today)
        )
      );
    
    if (existingUsage) {
      // Update existing usage
      const updateData: any = {};
      
      if (type === 'generated') {
        updateData.signalsGenerated = existingUsage.signalsGenerated + 1;
      } else if (type === 'viewed') {
        updateData.signalsViewed = existingUsage.signalsViewed + 1;
      } else if (type === 'analyzed') {
        updateData.analysisRequested = existingUsage.analysisRequested + 1;
      }
      
      await db
        .update(userSignalUsage)
        .set(updateData)
        .where(eq(userSignalUsage.id, existingUsage.id));
    } else {
      // Create new usage entry
      const newUsage: any = {
        userId,
        date: today,
        signalsGenerated: 0,
        signalsViewed: 0,
        analysisRequested: 0,
      };
      
      if (type === 'generated') {
        newUsage.signalsGenerated = 1;
      } else if (type === 'viewed') {
        newUsage.signalsViewed = 1;
      } else if (type === 'analyzed') {
        newUsage.analysisRequested = 1;
      }
      
      await db
        .insert(userSignalUsage)
        .values(newUsage);
    }
  }
  
  async getSignalUsage(userId: number, date?: Date): Promise<UserSignalUsage | undefined> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const [usage] = await db
      .select()
      .from(userSignalUsage)
      .where(
        and(
          eq(userSignalUsage.userId, userId),
          gte(userSignalUsage.date, targetDate),
          lt(userSignalUsage.date, nextDate)
        )
      );
    
    return usage;
  }
  
  // Notification methods
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }
  
  async getUserUnreadNotifications(userId: number): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt));
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [createdNotification] = await db
      .insert(notifications)
      .values({
        ...notification,
        createdAt: new Date(),
      })
      .returning();
    
    return createdNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({
        isRead: true,
      })
      .where(eq(notifications.id, id))
      .returning();
    
    if (!updatedNotification) {
      throw new Error('Notification not found');
    }
    
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: true,
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }
  
  // Market data methods
  async getMarketData(asset: string): Promise<MarketData | undefined> {
    const [data] = await db
      .select()
      .from(marketData)
      .where(eq(marketData.asset, asset))
      .orderBy(desc(marketData.timestamp))
      .limit(1);
    
    return data;
  }
  
  async saveMarketData(data: {
    asset: string;
    price: string;
    change24h?: string;
    high24h?: string;
    low24h?: string;
    volume24h?: string;
    marketCap?: string;
    dataSource?: string;
  }): Promise<MarketData> {
    const [savedData] = await db
      .insert(marketData)
      .values({
        ...data,
        timestamp: new Date(),
      })
      .returning();
    
    return savedData;
  }
  
  private async seedInitialData() {
    try {
      console.log(`[نظام البذور] البدء في فحص وتهيئة البيانات الأولية...`);
      
      // التحقق من وجود مستخدمين
      const existingUsers = await db.select().from(users).limit(1);
      
      if (existingUsers.length === 0) {
        console.log(`[نظام البذور] عدم وجود مستخدمين، إنشاء المستخدم الافتراضي...`);
        
        // إنشاء كلمة مرور للمستخدم الافتراضي - يجب تشفيرها
        // سنقوم بتشفير كلمة المرور باستخدام دالة hashPassword من ملف auth.ts
        
        // استيراد وظيفة تشفير كلمة المرور (للاستخدام المستقبلي)
        // حاليًا نستخدم القيمة المشفرة مسبقًا لكلمة المرور "Ay**--772293228"
        const hashedPassword = "e051a0d56106a5927530411e9b3385f99397cdbcd470a5e789825c6453e3675df873dd5cfee1d617f2ca05bc64f758ed6e24c735235cd288d28df39172f803bf.3ca8193a4531de57f89d226f3634a57f";
        
        // إنشاء المستخدم الافتراضي
        const [user] = await db.insert(users).values({
          username: "Binarjoinanalytic",
          password: hashedPassword,
          language: "ar",
          createdAt: new Date(),
          isActive: true
        }).returning();
        
        console.log(`[نظام البذور] تم إنشاء المستخدم الافتراضي بنجاح مع المعرف: ${user.id}`);
        
        // إنشاء إعدادات المستخدم
        await db.insert(userSettings).values({
          userId: user.id,
          theme: "dark",
          defaultAsset: "BTC/USDT",
          defaultTimeframe: "1h",
          chartType: "candlestick",
          showTradingTips: true,
          autoRefreshData: true,
          refreshInterval: 60,
          useAiForSignals: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`[نظام البذور] تم إنشاء إعدادات المستخدم بنجاح`);
        
        // إنشاء إعدادات إشعارات المستخدم
        await db.insert(userNotificationSettings).values({
          userId: user.id,
          emailNotifications: true,
          pushNotifications: true,
          signalAlerts: true,
          marketUpdates: true,
          accountAlerts: true,
          promotionalEmails: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`[نظام البذور] تم إنشاء إعدادات إشعارات المستخدم بنجاح`);
        
        // إنشاء اشتراك للمستخدم
        await db.insert(subscriptions).values({
          userId: user.id,
          type: "free",
          startDate: new Date(),
          isActive: true,
          dailySignalLimit: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`[نظام البذور] تم إنشاء اشتراك المستخدم بنجاح`);
      } else {
        console.log(`[نظام البذور] تم العثور على مستخدمين موجودين بالفعل، تخطي إنشاء المستخدم الافتراضي`);
      }
      
      // التحقق من وجود إشارات
      const existingSignals = await db.select().from(signals).limit(1);
      
      if (existingSignals.length === 0) {
        console.log(`[نظام البذور] عدم وجود إشارات، إنشاء الإشارات الافتراضية...`);
        
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
            platform: 'IQ Option',
            timeframe: '5m',
            createdAt: new Date(),
            updatedAt: new Date(),
            result: null
          });
        }
        
        console.log(`[نظام البذور] تم إنشاء 5 إشارات نشطة بنجاح`);
        
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
          
          const createdAt = new Date(Date.now() - 86400000 * (i + 1)); // Created 1-5 days ago
          
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
            platform: 'IQ Option',
            timeframe: '15m',
            createdAt: createdAt,
            updatedAt: createdAt,
            completedAt: new Date(createdAt.getTime() + 3600000 * (2 + i)), // Completed 2-6 hours later
            result: Math.random() < 0.9 ? 'success' : 'failure'
          });
        }
        
        console.log(`[نظام البذور] تم إنشاء 5 إشارات مكتملة بنجاح`);
      } else {
        console.log(`[نظام البذور] تم العثور على إشارات موجودة بالفعل، تخطي إنشاء الإشارات الافتراضية`);
      }
      
      console.log(`[نظام البذور] تم الانتهاء من تهيئة البيانات الأولية بنجاح`);
    } catch (error) {
      console.error(`[نظام البذور] خطأ أثناء تهيئة البيانات الأولية:`, error);
    }
  }
}

export const storage = new DatabaseStorage();