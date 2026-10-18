import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { taipeiDay } from "@/lib/dates";
import type { MealLog, MealLogInput, Profile, ProfileInput } from "@/lib/types";
import type { AdminStore, PushSubscriptionJSON, Store } from "./types";

type Data = {
  profiles: Record<string, Profile>;
  logs: MealLog[];
  /** key: `${userId}|${day}` */
  chatUsage: Record<string, number>;
  /** key: `${userId}|${day}` */
  dailyTips: Record<string, string>;
  pushSubscriptions: { userId: string; subscription: PushSubscriptionJSON }[];
};

const EMPTY: Data = { profiles: {}, logs: [], chatUsage: {}, dailyTips: {}, pushSubscriptions: [] };

// 部署環境（例如 Netlify）的程式目錄是唯讀的，只能寫暫存目錄，資料隨時可能消失
const DEFAULT_FILE =
  process.env.NODE_ENV === "production" ? path.join(tmpdir(), "haoshaoxuan-store.json") : path.join(process.cwd(), ".data", "store.json");

/** 本機測試模式用：資料存在一個 JSON 檔，只適合單機開發與測試 */
export class LocalStore implements Store, AdminStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string = DEFAULT_FILE) {}

  private async read(): Promise<Data> {
    try {
      return { ...EMPTY, ...(JSON.parse(await readFile(this.file, "utf8")) as Partial<Data>) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
      throw e;
    }
  }

  private async write(data: Data): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2));
    await rename(tmp, this.file);
  }

  /** 讀寫依序執行，避免同時寫入互相覆蓋 */
  private mutate<T>(fn: (data: Data) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = fn(data);
      await this.write(data);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    return (await this.read()).profiles[userId] ?? null;
  }

  saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
    return this.mutate((data) => {
      const profile: Profile = { ...input, userId };
      data.profiles[userId] = profile;
      return profile;
    });
  }

  async listLogs(userId: string): Promise<MealLog[]> {
    const { logs } = await this.read();
    return logs.filter((l) => l.userId === userId).sort((a, b) => b.eatenAt.localeCompare(a.eatenAt));
  }

  async getLog(userId: string, id: string): Promise<MealLog | null> {
    const { logs } = await this.read();
    return logs.find((l) => l.id === id && l.userId === userId) ?? null;
  }

  createLog(userId: string, input: MealLogInput): Promise<MealLog> {
    return this.mutate((data) => {
      const now = new Date().toISOString();
      const log: MealLog = { ...input, id: randomUUID(), userId, createdAt: now, updatedAt: now };
      data.logs.push(log);
      return log;
    });
  }

  updateLog(userId: string, id: string, input: MealLogInput): Promise<MealLog | null> {
    return this.mutate((data) => {
      const log = data.logs.find((l) => l.id === id && l.userId === userId);
      if (!log) return null;
      Object.assign(log, input, { updatedAt: new Date().toISOString() });
      return log;
    });
  }

  deleteLog(userId: string, id: string): Promise<boolean> {
    return this.mutate((data) => {
      const before = data.logs.length;
      data.logs = data.logs.filter((l) => !(l.id === id && l.userId === userId));
      return data.logs.length < before;
    });
  }

  async chatCountToday(userId: string): Promise<number> {
    const { chatUsage } = await this.read();
    return chatUsage[`${userId}|${taipeiDay()}`] ?? 0;
  }

  incrementChatCount(userId: string): Promise<number> {
    return this.mutate((data) => {
      const key = `${userId}|${taipeiDay()}`;
      data.chatUsage[key] = (data.chatUsage[key] ?? 0) + 1;
      return data.chatUsage[key];
    });
  }

  async getDailyTip(userId: string, day: string): Promise<string | null> {
    return (await this.read()).dailyTips[`${userId}|${day}`] ?? null;
  }

  async saveDailyTip(userId: string, day: string, text: string): Promise<void> {
    await this.mutate((data) => {
      data.dailyTips[`${userId}|${day}`] = text;
    });
  }

  async savePushSubscription(userId: string, sub: PushSubscriptionJSON): Promise<void> {
    await this.mutate((data) => {
      data.pushSubscriptions = data.pushSubscriptions.filter((s) => s.subscription.endpoint !== sub.endpoint);
      data.pushSubscriptions.push({ userId, subscription: sub });
    });
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.mutate((data) => {
      data.pushSubscriptions = data.pushSubscriptions.filter(
        (s) => !(s.userId === userId && s.subscription.endpoint === endpoint),
      );
    });
  }

  async hasPushSubscription(userId: string): Promise<boolean> {
    return (await this.read()).pushSubscriptions.some((s) => s.userId === userId);
  }

  async listPushSubscriptions() {
    return (await this.read()).pushSubscriptions;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await this.mutate((data) => {
      data.pushSubscriptions = data.pushSubscriptions.filter((s) => s.subscription.endpoint !== endpoint);
    });
  }
}
