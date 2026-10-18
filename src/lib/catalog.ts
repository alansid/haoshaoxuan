import type { MenuItem } from "./types";

// 內建的常見外食品項（固定品項清單）。價格、熱量、蛋白質都是估計值，不是任何店家的官方資料；
// 畫面上一律標示「約」。
export const CATALOG: MenuItem[] = [
  // 便利商店
  { id: "cv-chicken-breast", venue: "convenience", role: "main", name: "即食雞胸肉（原味）", priceEst: 65, kcalEst: 130, proteinG: 25, tags: ["high-protein"] },
  { id: "cv-onigiri-salmon", venue: "convenience", role: "main", name: "鮭魚飯糰", priceEst: 38, kcalEst: 200, proteinG: 6, tags: [] },
  { id: "cv-sweet-potato", venue: "convenience", role: "main", name: "烤地瓜（中）", priceEst: 45, kcalEst: 230, proteinG: 3, tags: ["whole-grain"] },
  { id: "cv-sandwich-egg", venue: "convenience", role: "main", name: "雞蛋三明治", priceEst: 45, kcalEst: 320, proteinG: 12, tags: [] },
  { id: "cv-fried-chicken", venue: "convenience", role: "main", name: "炸雞腿便當", priceEst: 99, kcalEst: 850, proteinG: 32, tags: ["fried"] },
  { id: "cv-salad-chicken", venue: "convenience", role: "main", name: "雞肉沙拉", priceEst: 79, kcalEst: 220, proteinG: 18, tags: ["high-protein", "veggie"] },
  { id: "cv-oden-mix", venue: "convenience", role: "main", name: "關東煮組合（蘿蔔、玉米、豆腐、蒟蒻）", priceEst: 60, kcalEst: 180, proteinG: 9, tags: ["veggie"] },
  { id: "cv-tea-egg", venue: "convenience", role: "side", name: "茶葉蛋 ×2", priceEst: 26, kcalEst: 150, proteinG: 13, tags: ["high-protein"] },
  { id: "cv-edamame", venue: "convenience", role: "side", name: "毛豆", priceEst: 35, kcalEst: 130, proteinG: 11, tags: ["high-protein", "veggie"] },
  { id: "cv-veg-cup", venue: "convenience", role: "side", name: "生菜沙拉杯", priceEst: 49, kcalEst: 60, proteinG: 2, tags: ["veggie"] },
  { id: "cv-soy-milk", venue: "convenience", role: "drink", name: "無糖豆漿", priceEst: 30, kcalEst: 110, proteinG: 9, tags: ["high-protein"] },
  { id: "cv-milk-tea", venue: "convenience", role: "drink", name: "瓶裝奶茶", priceEst: 35, kcalEst: 280, proteinG: 4, tags: ["sugary"] },
  { id: "cv-greek-yogurt", venue: "convenience", role: "side", name: "希臘優格（無糖）", priceEst: 45, kcalEst: 110, proteinG: 10, tags: ["high-protein"] },

  // 咖啡廳
  { id: "cf-chicken-wrap", venue: "cafe", role: "main", name: "烤雞全麥捲餅", priceEst: 145, kcalEst: 420, proteinG: 28, tags: ["high-protein", "whole-grain"] },
  { id: "cf-croissant-ham", venue: "cafe", role: "main", name: "火腿起司可頌", priceEst: 120, kcalEst: 480, proteinG: 16, tags: [] },
  { id: "cf-salad-salmon", venue: "cafe", role: "main", name: "煙燻鮭魚沙拉", priceEst: 180, kcalEst: 350, proteinG: 22, tags: ["high-protein", "veggie"] },
  { id: "cf-bagel-egg", venue: "cafe", role: "main", name: "蛋沙拉貝果", priceEst: 110, kcalEst: 450, proteinG: 15, tags: [] },
  { id: "cf-waffle", venue: "cafe", role: "main", name: "鬆餅（附糖漿）", priceEst: 160, kcalEst: 650, proteinG: 10, tags: ["sugary"] },
  { id: "cf-overnight-oats", venue: "cafe", role: "main", name: "隔夜燕麥杯", priceEst: 95, kcalEst: 320, proteinG: 12, tags: ["whole-grain"] },
  { id: "cf-boiled-egg", venue: "cafe", role: "side", name: "水煮蛋", priceEst: 25, kcalEst: 75, proteinG: 7, tags: ["high-protein"] },
  { id: "cf-fruit-cup", venue: "cafe", role: "side", name: "新鮮水果杯", priceEst: 70, kcalEst: 90, proteinG: 1, tags: ["veggie"] },
  { id: "cf-americano", venue: "cafe", role: "drink", name: "美式咖啡（無糖）", priceEst: 60, kcalEst: 10, proteinG: 0, tags: [] },
  { id: "cf-latte", venue: "cafe", role: "drink", name: "拿鐵（無糖）", priceEst: 90, kcalEst: 180, proteinG: 9, tags: ["high-protein"] },
  { id: "cf-caramel", venue: "cafe", role: "drink", name: "焦糖瑪奇朵", priceEst: 120, kcalEst: 290, proteinG: 8, tags: ["sugary"] },

  // 便當店
  { id: "bt-grilled-chicken", venue: "bento", role: "main", name: "烤雞腿便當（飯半碗）", priceEst: 110, kcalEst: 620, proteinG: 38, tags: ["high-protein"] },
  { id: "bt-fried-pork", venue: "bento", role: "main", name: "排骨便當", priceEst: 100, kcalEst: 880, proteinG: 30, tags: ["fried"] },
  { id: "bt-mackerel", venue: "bento", role: "main", name: "鯖魚便當（飯半碗）", priceEst: 120, kcalEst: 650, proteinG: 30, tags: ["high-protein"] },
  { id: "bt-chicken-rice", venue: "bento", role: "main", name: "雞肉飯（小）＋燙青菜", priceEst: 70, kcalEst: 450, proteinG: 20, tags: ["veggie"] },
  { id: "bt-veg-bento", venue: "bento", role: "main", name: "三寶蔬菜便當（換糙米）", priceEst: 95, kcalEst: 520, proteinG: 15, tags: ["veggie", "whole-grain"] },
  { id: "bt-braised-pork", venue: "bento", role: "main", name: "滷肉飯（大）", priceEst: 50, kcalEst: 700, proteinG: 15, tags: [] },
  { id: "bt-blanched-veg", venue: "bento", role: "side", name: "燙青菜", priceEst: 35, kcalEst: 60, proteinG: 2, tags: ["veggie"] },
  { id: "bt-tofu", venue: "bento", role: "side", name: "滷豆腐＋滷蛋", priceEst: 30, kcalEst: 180, proteinG: 14, tags: ["high-protein"] },
  { id: "bt-clear-soup", venue: "bento", role: "drink", name: "蔬菜清湯", priceEst: 30, kcalEst: 40, proteinG: 1, tags: ["veggie"] },
  { id: "bt-black-tea", venue: "bento", role: "drink", name: "紅茶（全糖）", priceEst: 25, kcalEst: 180, proteinG: 0, tags: ["sugary"] },
  { id: "bt-fish-soup", venue: "bento", role: "drink", name: "虱目魚湯", priceEst: 50, kcalEst: 150, proteinG: 15, tags: ["high-protein"] },
];
