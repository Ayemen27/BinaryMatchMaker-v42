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
import { eq, and, gte, lt, desc, count, isNull, sql } from "drizzle-orm";
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
  
  // Signal methods - Public Signals (Admin Created)
  getSignals(): Promise<Signal[]>;
  getActiveSignals(): Promise<Signal[]>;
  getCompletedSignals(): Promise<Signal[]>;
  getSignalHistory(): Promise<Signal[]>;
  getPublicSignals(): Promise<Signal[]>; // Get signals created by admin and marked as public
  getSignalById(id: number): Promise<Signal | undefined>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  updateSignalStatus(id: number, status: 'active' | 'completed'): Promise<Signal>;
  updateSignalResult(id: number, result: 'success' | 'failure'): Promise<Signal>;
  getUserSignalUsageToday(userId: number): Promise<number>;
  
  // User signals methods - Private Signals (User Created)
  getUserSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]>;
  getUserFavoriteSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]>;
  getUserGeneratedSignals(userId: number): Promise<Signal[]>; // New - Get signals created by specific user
  createUserSignal(userId: number, signal: InsertSignal): Promise<Signal>; // New - Create signal owned by user
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
    // 1. أولاً نتأكد من الحصول على الإعدادات الحالية
    const currentSettings = await this.getUserSettings(userId);
    
    if (!currentSettings) {
      // إذا لم تكن الإعدادات موجودة، قم بإنشائها بدلاً من التحديث
      return this.createUserSettings({
        userId,
        // استخدام القيم الافتراضية المحددة في المخطط
        theme: settings.theme || 'dark',
        defaultAsset: settings.defaultAsset || 'BTC/USDT',
        defaultTimeframe: settings.defaultTimeframe || '1h',
        defaultPlatform: settings.defaultPlatform || '',
        chartType: settings.chartType || 'candlestick',
        showTradingTips: settings.showTradingTips !== undefined ? settings.showTradingTips : true,
        autoRefreshData: settings.autoRefreshData !== undefined ? settings.autoRefreshData : true,
        refreshInterval: settings.refreshInterval !== undefined ? settings.refreshInterval : 60,
        // نسخ بقية الإعدادات من الكائن المرسل
        useAiForSignals: settings.useAiForSignals !== undefined ? settings.useAiForSignals : true,
        useCustomAiKey: settings.useCustomAiKey !== undefined ? settings.useCustomAiKey : false,
        openaiApiKey: settings.openaiApiKey || null,
      });
    }
    
    // تحديد نوع الإعدادات التي يتم تحديثها (لتسهيل التنقيح)
    console.log('تحديث إعدادات المستخدم', {
      userId,
      currentSettings: {...currentSettings, openaiApiKey: currentSettings.openaiApiKey ? '[موجود]' : null},
      newSettings: {...settings, openaiApiKey: settings.openaiApiKey ? '[موجود]' : null},
    });
    
    // 2. قم بتحديث الإعدادات الموجودة
    const [updatedSettings] = await db
      .update(userSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();
    
    if (!updatedSettings) {
      throw new Error('لم يتم العثور على إعدادات المستخدم');
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
  
  // Signal methods - Public Signals (Admin Created)
  async getSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(
        and(
          eq(signals.status, 'active'),
          eq(signals.isPublic, true)
        )
      )
      .orderBy(desc(signals.createdAt));
  }
  
  async getActiveSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(
        and(
          eq(signals.status, 'active'),
          eq(signals.isPublic, true)
        )
      )
      .orderBy(desc(signals.createdAt));
  }
  
  async getCompletedSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(
        and(
          eq(signals.status, 'completed'),
          eq(signals.isPublic, true)
        )
      )
      .orderBy(desc(signals.createdAt));
  }
  
  async getSignalHistory(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(eq(signals.isPublic, true))
      .orderBy(desc(signals.createdAt));
  }
  
  async getPublicSignals(): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(eq(signals.isPublic, true))
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
        isPublic: true, // الإشارات التي ينشئها المسؤول تكون عامة افتراضياً
        createdBy: null, // لا يوجد مستخدم محدد أنشأ هذه الإشارة
      })
      .returning();
    
    return signal;
  }
  
  // وظائف الإشارات الخاصة بالمستخدمين
  async getUserGeneratedSignals(userId: number): Promise<Signal[]> {
    return db.select()
      .from(signals)
      .where(eq(signals.createdBy, userId))
      .orderBy(desc(signals.createdAt));
  }
  
  async createUserSignal(userId: number, insertSignal: InsertSignal): Promise<Signal> {
    const [signal] = await db.insert(signals)
      .values({
        ...insertSignal,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        result: null,
        isPublic: false, // الإشارات التي ينشئها المستخدم تكون خاصة افتراضياً
        createdBy: userId, // تحديد المستخدم الذي أنشأ الإشارة
      })
      .returning();
    
    // إضافة الإشارة تلقائياً إلى مجموعة المستخدم
    await this.addSignalToUser(userId, signal.id);
    
    // تتبع استخدام المستخدم لإنشاء الإشارات
    await this.trackSignalUsage(userId, 'generated');
    
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
    
    // البحث عن سجل استخدام إشارات المستخدم لليوم الحالي
    const usageToday = await this.getSignalUsage(userId, today);
    
    if (!usageToday) {
      return 0; // لا يوجد استخدام مسجل اليوم
    }
    
    // إجمالي الإشارات المولدة والتحليلات المطلوبة
    return (usageToday.signalsGenerated || 0) + (usageToday.analysisRequested || 0);
  }
  
  // User signals methods
  async getUserSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]> {
    try {
      // استخدام استعلام drizzle المباشر
      const results = await db.select()
        .from(userSignals)
        .innerJoin(signals, eq(userSignals.signalId, signals.id))
        .where(eq(userSignals.userId, userId))
        .orderBy(desc(userSignals.createdAt));
      
      // تحويل النتائج إلى التنسيق المطلوب
      return results.map(({ userSignals: us, signals: s }) => {
        return {
          ...us,
          signal: s
        };
      });
    } catch (error) {
      console.error("خطأ في استرجاع إشارات المستخدم:", error);
      return [];
    }
  }
  
  async getUserFavoriteSignals(userId: number): Promise<(UserSignal & { signal: Signal })[]> {
    // استعلام الحصول على الإشارات المفضلة للمستخدم
    const results = await db.execute(
      sql`SELECT us.*, s.* 
          FROM user_signals us
          INNER JOIN signals s ON us.signal_id = s.id
          WHERE us.user_id = ${userId} AND us.is_favorite = true
          ORDER BY us.created_at DESC`
    );
    
    // تحويل البيانات المستخرجة إلى النموذج المطلوب
    return results.map(row => {
      const userSignal: UserSignal = {
        id: row.id,
        userId: row.user_id,
        signalId: row.signal_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isFavorite: row.is_favorite,
        isTaken: row.is_taken,
        result: row.result,
        notes: row.notes
      };
      
      const signal: Signal = {
        id: row.signal_id || row.id,
        type: row.type,
        asset: row.asset,
        entryPrice: row.entry_price,
        targetPrice: row.target_price,
        stopLoss: row.stop_loss,
        timeframe: row.timeframe,
        expiryTime: row.expiry_time ? new Date(row.expiry_time) : null,
        status: row.status,
        result: row.result,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        createdBy: row.created_by,
        confidence: row.confidence,
        analysis: row.analysis,
        isPublic: row.is_public
      };
      
      return {
        ...userSignal,
        signal
      };
    });
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
    // التحقق أولاً مما إذا كانت هناك بيانات موجودة لهذا الزوج
    const existingData = await this.getMarketData(data.asset);
    
    if (existingData) {
      // تحديث البيانات الموجودة بدلاً من إنشاء سجل جديد
      const [updatedData] = await db
        .update(marketData)
        .set({
          ...data,
          timestamp: new Date(),
        })
        .where(eq(marketData.asset, data.asset))
        .returning();
      
      return updatedData;
    } else {
      // إنشاء سجل جديد إذا لم تكن هناك بيانات موجودة
      const [savedData] = await db
        .insert(marketData)
        .values({
          ...data,
          timestamp: new Date(),
        })
        .returning();
      
      return savedData;
    }
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
      
      // لا نقوم بإنشاء إشارات افتراضية بعد الآن
      // الإشارات العامة ستتم إضافتها من قبل المسؤول
      // والإشارات الخاصة سيقوم المستخدمون بتوليدها
      
      console.log(`[نظام البذور] تخطي إنشاء الإشارات الافتراضية - سيتم إنشاؤها من قبل المسؤول أو المستخدمين`);
      
      console.log(`[نظام البذور] تم الانتهاء من تهيئة البيانات الأولية بنجاح`);
    } catch (error) {
      console.error(`[نظام البذور] خطأ أثناء تهيئة البيانات الأولية:`, error);
    }
  }
}

export const storage = new DatabaseStorage();