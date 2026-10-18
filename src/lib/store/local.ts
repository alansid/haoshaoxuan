import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MealLog, MealLogInput } from "@/lib/types";
import { taipeiDay, type Store } from "./types";

type Data = {
  logs: MealLog[];
  /** key: `${userId}|${day}` */
  chatUsage: Record<string, number>;
};

/** 本機開發模式用：資料存在一個 JSON 檔，只適合單機開發與測試 */
export class LocalStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string = path.join(process.cwd(), ".data", "store.json")) {}

  private async read(): Promise<Data> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as Data;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return { logs: [], chatUsage: {} };
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
}
