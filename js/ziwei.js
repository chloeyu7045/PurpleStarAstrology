import { astro } from './deps.js';

/**
 * 把「時」轉成 iztro 的 timeIndex。
 * 0=早子(00-01) 1=丑 2=寅 3=卯 4=辰 5=巳 6=午 7=未 8=申 9=酉 10=戌 11=亥 12=晚子(23-24)
 * 慣例：時辰起點含入（05:00 算卯時）。排盤只看時辰，分鐘僅供記錄。
 */
export function toTimeIndex(hour) {
  if (hour === 23) return 12;
  if (hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
}

export const TIME_NAMES = [
  '早子時', '丑時', '寅時', '卯時', '辰時', '巳時',
  '午時', '未時', '申時', '酉時', '戌時', '亥時', '晚子時',
];

/** 取得 iztro 原始命盤物件（流年、三方四正等進階查詢都靠它） */
export function rawAstrolabe(person) {
  const dateStr = `${person.birth_year}-${person.birth_month}-${person.birth_day}`;
  const ti = toTimeIndex(person.birth_hour);
  return person.calendar_type === 'lunar'
    ? astro.byLunar(dateStr, ti, person.gender, person.is_leap_month, true, 'zh-TW')
    : astro.bySolar(dateStr, ti, person.gender, true, 'zh-TW');
}

const star = (s) => ({ name: s.name, mutagen: s.mutagen || '', brightness: s.brightness || '' });

/** 看盤習慣的宮位順序：從命宮起，而不是按地支排 */
const PALACE_ORDER = [
  '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄',
  '遷移', '僕役', '官祿', '田宅', '福德', '父母',
];

/** 排出給畫面用的命盤 */
export function buildChart(person) {
  const a = rawAstrolabe(person);
  return {
    solarDate: a.solarDate,
    lunarDate: a.lunarDate,
    chineseDate: a.chineseDate,
    time: a.time,
    timeRange: a.timeRange,
    zodiac: a.zodiac,
    sign: a.sign,
    soul: a.soul,
    body: a.body,
    fiveElementsClass: a.fiveElementsClass,
    palaces: [...a.palaces]
      .sort((x, y) => PALACE_ORDER.indexOf(x.name) - PALACE_ORDER.indexOf(y.name))
      .map((p) => ({
        index: p.index,
        name: p.name,
        stem: p.heavenlyStem,
        branch: p.earthlyBranch,
        isBody: p.isBodyPalace,
        majorStars: p.majorStars.map(star),
        minorStars: p.minorStars.map(star),
        adjectiveStars: p.adjectiveStars.map(star),
        decadalRange: (p.decadal && p.decadal.range) || [],
      })),
  };
}

/** 年齡（用來判斷是否未成年） */
export function calcAge(person, now = new Date()) {
  let age = now.getFullYear() - person.birth_year;
  const bd = new Date(now.getFullYear(), person.birth_month - 1, person.birth_day);
  if (now < bd) age -= 1;
  return age;
}

/** 把生日遮起來但保留形狀，例如 1982 → 19**-*-* */
export function maskSolar(year) {
  return `${String(year).slice(0, 2)}**-*-*`;
}

/** 命盤上跟生辰有關的欄位，遮掉但保留欄位在，讓版面不會突然少一塊 */
export function maskChartMeta(chart) {
  const lunarPrefix = (chart.lunarDate || '').slice(0, 2); // 例如「一九」
  return {
    solarDate: maskSolar(chart.solarDate),
    lunarDate: `${lunarPrefix}**年＊月＊`,
    chineseDate: '＊＊＊＊',
    time: '＊時',
    timeRange: '',
    zodiac: '＊',
    sign: '＊＊',
  };
}
