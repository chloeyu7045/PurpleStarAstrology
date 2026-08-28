import { rawAstrolabe, calcAge } from './ziwei.js';

/** 六煞＋空劫：解讀盲點課題時要看的 */
const SHA_STARS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
const MINOR_AGE = 16;

/** iztro 的 mutagen 是無標籤陣列，順序固定為 祿權科忌 —— 補上標籤才餵得出去 */
const MUTAGEN_ORDER = ['祿', '權', '科', '忌'];
function labelMutagen(list) {
  if (!list) return [];
  return list.map((s, i) => `${s}化${MUTAGEN_ORDER[i] || '?'}`);
}

function starLabel(s) {
  return s.name + (s.mutagen ? `(化${s.mutagen})` : '') + (s.brightness ? `[${s.brightness}]` : '');
}

function palaceStars(p) {
  return [...p.majorStars, ...p.minorStars].map(starLabel);
}

/**
 * 把命盤嚼碎成餵給 Claude 的資料。
 * 三方四正、四化落宮、煞星分布全部由程式算好，Claude 不需要（也不准）自己推理。
 */
export function buildPayload(person) {
  const a = rawAstrolabe(person);
  const age = calcAge(person);

  const 四化 = [];
  a.palaces.forEach((p) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      if (s.mutagen) 四化.push({ 星: s.name, 類: s.mutagen, 宮: p.name });
    });
  });

  const 煞星分布 = [];
  a.palaces.forEach((p) => {
    [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].forEach((s) => {
      if (SHA_STARS.includes(s.name)) 煞星分布.push({ 星: s.name, 宮: p.name });
    });
  });

  const keyPalaces = {};
  for (const name of ['命宮', '福德', '官祿', '夫妻', '財帛']) {
    const p = a.palaces.find((x) => x.name === name);
    if (!p) continue;
    const entry = {
      地支: p.earthlyBranch,
      主星: p.majorStars.map(starLabel),
      輔星: p.minorStars.map(starLabel),
      雜曜: p.adjectiveStars.map((s) => s.name),
    };
    if (name === '命宮') {
      try {
        const s = a.surroundedPalaces('命宮');
        entry['三方四正'] = {
          對宮_遷移: palaceStars(s.opposite),
          三合_財帛: palaceStars(s.wealth),
          三合_官祿: palaceStars(s.career),
        };
      } catch (e) {
        /* 取不到就略過，不編造 */
      }
    }
    keyPalaces[name] = entry;
  }

  const bodyPalace = a.palaces.find((p) => p.isBodyPalace);
  const mingPalace = a.palaces.find((p) => p.name === '命宮');

  return {
    person: {
      name: person.name,
      gender: person.gender === 'male' ? '男' : '女',
      solarDate: a.solarDate,
      lunarDate: a.lunarDate,
      time: a.time,
      age,
      isMinor: age < MINOR_AGE,
    },
    core: {
      命主: a.soul,
      身主: a.body,
      五行局: a.fiveElementsClass,
      命宮地支: mingPalace ? mingPalace.earthlyBranch : '',
      身宮位置: bodyPalace ? bodyPalace.name : '',
    },
    keyPalaces,
    四化,
    煞星分布,
  };
}

/** 某一年的大限＋流年 */
export function buildHoroscopePayload(person, year) {
  const a = rawAstrolabe(person);
  // 取年中，避開農曆年頭年尾的邊界
  const h = a.horoscope(`${year}-07-01`);

  const ymIdx = h.yearly.palaceNames.indexOf('命宮');
  const yp = a.palaces[ymIdx];
  const dp = a.palaces[h.decadal.index];

  return {
    year,
    大限: {
      範圍: ((dp && dp.decadal && dp.decadal.range) || []).join('-'),
      走到本命的宮位: dp ? dp.name : '',
      四化: labelMutagen(h.decadal.mutagen),
    },
    流年: {
      干支: `${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}`,
      命宮落於: yp ? `本命的${yp.name}` : '',
      四化: labelMutagen(h.yearly.mutagen),
      該宮星曜: yp ? palaceStars(yp) : [],
    },
  };
}

/** 逐月（僅供參考） */
export function buildMonthlyPayload(person, year) {
  const a = rawAstrolabe(person);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    try {
      const h = a.horoscope(`${year}-${String(m).padStart(2, '0')}-15`);
      const p = a.palaces[h.monthly.palaceNames.indexOf('命宮')];
      months.push({
        月份: m,
        命宮落於: p ? `本命的${p.name}` : '',
        四化: labelMutagen(h.monthly.mutagen),
      });
    } catch (e) {
      /* 該月取不到就跳過，不編造 */
    }
  }
  return months;
}
