import { reactive } from './deps.js';
import { PRESET_PEOPLE } from './data.js';
import { getPrewritten } from './readings/index.js';

const PEOPLE_STORAGE = 'ziwei:people';
const CACHE_STORAGE = 'ziwei:reports';
const REMOVED_STORAGE = 'ziwei:removedPresets';
const SHOWBIRTH_STORAGE = 'ziwei:showBirth';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch (e) {
    return fallback;
  }
}

const savedPeople = load(PEOPLE_STORAGE, null);
const removedPresets = load(REMOVED_STORAGE, []);

/**
 * 合併名單：以使用者存的為主，但把「之後才新增的預設人物」補進來。
 * 否則已經動過名單的人，永遠看不到新加的預設人物。
 * 被使用者刪掉的預設人物會記在 removedPresets，不會復活。
 */
function mergePeople() {
  if (!Array.isArray(savedPeople) || !savedPeople.length) return [...PRESET_PEOPLE];
  const have = new Set(savedPeople.map((p) => p.id));
  const gone = new Set(removedPresets);
  const missing = PRESET_PEOPLE.filter((p) => !have.has(p.id) && !gone.has(p.id));
  return [...savedPeople, ...missing];
}

/** 扁平化 store：一份人員名單 + 一份解讀快取，全部存 localStorage */
export const store = reactive({
  people: mergePeople(),
  reports: load(CACHE_STORAGE, {}),
  selectedId: '',
  // 隱私：預設不顯示出生年月日等個資，命盤本身照常顯示
  showBirth: load(SHOWBIRTH_STORAGE, false) === true,
});

export function setShowBirth(v) {
  store.showBirth = !!v;
  localStorage.setItem(SHOWBIRTH_STORAGE, JSON.stringify(store.showBirth));
}

store.selectedId = store.people[0] ? store.people[0].id : '';

function persistPeople() {
  localStorage.setItem(PEOPLE_STORAGE, JSON.stringify(store.people));
}
function persistReports() {
  localStorage.setItem(CACHE_STORAGE, JSON.stringify(store.reports));
}

export function selectedPerson() {
  return store.people.find((p) => p.id === store.selectedId);
}

export function addPerson(p) {
  const person = { ...p, id: `p_${Date.now().toString(36)}` };
  store.people.push(person);
  persistPeople();
  return person;
}

export function updatePerson(id, patch) {
  const i = store.people.findIndex((p) => p.id === id);
  if (i === -1) return;
  store.people[i] = { ...store.people[i], ...patch };
  persistPeople();
  invalidatePerson(id); // 生辰變了，這個人的解讀全部失效
}

export function removePerson(id) {
  store.people = store.people.filter((p) => p.id !== id);
  // 刪掉的預設人物要記下來，不然下次開啟又會被合併回來
  if (PRESET_PEOPLE.some((p) => p.id === id) && !removedPresets.includes(id)) {
    removedPresets.push(id);
    localStorage.setItem(REMOVED_STORAGE, JSON.stringify(removedPresets));
  }
  persistPeople();
  invalidatePerson(id);
  if (store.selectedId === id) store.selectedId = store.people[0] ? store.people[0].id : '';
}

export function resetToPresets() {
  store.people = [...PRESET_PEOPLE];
  removedPresets.length = 0;
  localStorage.removeItem(REMOVED_STORAGE);
  persistPeople();
  store.selectedId = store.people[0].id;
}

// ---- 解讀快取：命盤固定，同一份解讀算一次就好 ----

/**
 * 讀解讀：先看使用者自己存的，沒有就用預先寫好的。
 * 這樣點開就有東西看，改寫過的又不會被蓋掉。
 */
export function getReport(key) {
  if (store.reports[key]) return store.reports[key];
  const pre = getPrewritten(key);
  return pre ? { text: pre, prewritten: true } : undefined;
}

export function saveReport(key, text) {
  store.reports[key] = { text, createdAt: Date.now() };
  persistReports();
}

export function invalidate(key) {
  delete store.reports[key];
  persistReports();
}

export function invalidatePerson(personId) {
  for (const k of Object.keys(store.reports)) {
    if (k.includes(personId)) delete store.reports[k];
  }
  persistReports();
}

export function clearAllReports() {
  store.reports = {};
  persistReports();
}

/** 快取 key：種類 + 人 + 年份/對象 */
export const cacheKey = (kind, personId, extra = '') =>
  [kind, personId, extra].filter(Boolean).join(':');
