/**
 * 把「命宮組合」+「格局」組成三份解讀：個性、優勢與時機、盲點與課題。
 *
 * 這一層讓每個人（包含使用者自己新增的人）都有內容，
 * 不再只有我手寫的那 12 位。
 */
import { coreReading, warmWatch } from './core.js';
import { detectPatterns, groupPatterns } from './patterns.js';
import { PALACE, areaFor, shortFor, lifeStage } from './lexicon.js';
import { rawAstrolabe, calcAge } from '../ziwei.js';
import { heading, cushion, closing, proBlock } from './tone.js';
import { peipeiPersonality, peipeiStrengths, peipeiBlindspots } from './peipei.js';

const MUT_ORDER = ['祿', '權', '科', '忌'];
const SHA = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];

function palaceOfStar(palaces, name) {
  const p = palaces.find((x) =>
    [...x.majorStars, ...x.minorStars].some((s) => s.name === name));
  return p ? p.name : null;
}
function natalMutagens(palaces) {
  const out = [];
  palaces.forEach((p) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      if (s.mutagen) out.push({ type: s.mutagen, star: s.name, palace: p.name });
    });
  });
  return out;
}

/** 個性剖析 */
export function personalityReading(person, tone = 'blunt') {
  if (tone === 'peipei') return peipeiPersonality(person);
  const a = rawAstrolabe(person);
  const core = coreReading(a);
  const pats = groupPatterns(detectPatterns(a));
  const age = calcAge(person);
  const minor = age < 16;
  const out = [];

  out.push(`## ${heading('本性', tone)}`);
  if (core) {
    out.push(`**${core.title}**`);
    out.push(core.text);
    core.extras.forEach((e) => out.push(e));
  } else {
    out.push('這張盤的核心資訊有限，以下就其他面向來看。');
  }

  const flavour = [...pats.great, ...pats.good];
  if (flavour.length) {
    out.push(`## ${heading('特別', tone)}`);
    flavour.forEach((p) => out.push(`**${p.title}**\n\n${p.text}`));
  }

  if (core) {
    out.push(`## ${heading('天賦', tone)}`);
    out.push(core.strength);
  }

  if (minor) {
    out.push('> 這位還未成年，上面講的是天生的傾向，還在成形中。父母看的重點是「怎麼順著這個天性帶」，而不是把它當定論。');
  }
  const pro = proBlock(tone, a, detectPatterns(a));
  if (pro) out.push(pro);
  return out.join('\n\n');
}

/** 優勢與時機 —— 給人看了有方向、心情好一點的那一份 */
export function strengthsReading(person, tone = 'blunt') {
  if (tone === 'peipei') return peipeiStrengths(person);
  const a = rawAstrolabe(person);
  const P = a.palaces;
  const core = coreReading(a);
  const pats = groupPatterns(detectPatterns(a));
  const muts = natalMutagens(P);
  const age = calcAge(person);
  const stage = lifeStage(age);
  const minor = age < 16;
  const you = minor ? '他' : '你';
  const out = [];

  out.push(`## ${heading('本錢', tone)}`);
  if (core) out.push(core.strength);
  pats.great.forEach((p) => out.push(`**${p.title}**\n\n${p.text}\n\n👉 ${p.advice}`));
  pats.good.forEach((p) => out.push(`**${p.title}**\n\n${p.text}\n\n👉 ${p.advice}`));
  if (!pats.great.length && !pats.good.length && core) {
    out.push(`把${you}放在對的位置，這股特質就是優勢；放錯地方才會變成負擔。`);
  }

  // 三個吉化落宮 → 明確指出「往哪裡使力」
  const good = muts.filter((m) => ['祿', '權', '科'].includes(m.type));
  if (good.length) {
    out.push(`## ${heading('使力', tone)}`);
    const label = { 祿: '最順、最容易有收穫', 權: '最能拿到主導權', 科: '最容易累積名聲和貴人' };
    // 同一宮位可能同時有兩個吉化，合併成一句才不會重複講
    const byPalace = new Map();
    good.forEach((m) => {
      if (!byPalace.has(m.palace)) byPalace.set(m.palace, []);
      byPalace.get(m.palace).push(m.type);
    });
    byPalace.forEach((types, palace) => {
      const info = PALACE[palace];
      const what = types.map((t) => label[t]).join('、也');
      const extra = types.length > 1 ? '這一塊在你身上疊了好幾層好處，是最值得投入的地方。' : '';
      out.push(`- **${areaFor(palace, stage.key)}**是${you}${what}的地方。${info ? info.good : ''}。${extra}`);
    });
  }

  // 大限：哪幾個十年是機會窗口
  const windows = decadeWindows(a, person);
  if (windows.length) {
    out.push(`## ${heading('窗口', tone)}`);
    out.push(`每十年${you}的重心會換一次。以下是比較值得把握的幾段：`);
    windows.forEach((w) => {
      out.push(`- **${w.range} 歲**（${w.years}）：重心在**${shortFor(w.palace, stage.key)}**。${w.note}`);
    });
    out.push(`${minor ? '父母可以' : '你可以'}把大的計畫排在這幾段，會比硬推順很多。`);
  }

  if (minor) {
    out.push('> 這位還未成年，上面的優勢是天生的底子，需要被看見和培養才會長出來。');
  }
  return out.join('\n\n');
}

/**
 * 找出值得把握的幾個大限。
 * 已經過去的十年對使用者沒有意義，所以一律以「現在或未來」為準；
 * 真的挑不出好的，就退而求其次挑未來裡阻力最小的。
 */
function decadeWindows(a, person) {
  const P = a.palaces;
  const age = calcAge(person);
  const sorted = P.filter((p) => p.decadal && p.decadal.range && p.decadal.range.length)
    .sort((x, y) => x.decadal.range[0] - y.decadal.range[0]);

  // 只考慮還沒過完、而且不會太遙遠的十年
  const future = sorted.filter((p) => {
    const [s, e] = p.decadal.range;
    return e >= age && s <= 85;
  });
  if (!future.length) return [];

  const scored = future.map((p) => {
    const [s, e] = p.decadal.range;
    const mut = p.decadal.mutagen || [];
    const luPalace = mut[0] ? palaceOfStar(P, mut[0]) : null;
    const jiPalace = mut[3] ? palaceOfStar(P, mut[3]) : null;
    const stars = [...p.majorStars, ...p.minorStars];
    const names = stars.map((x) => x.name);
    const hasLu = names.includes('祿存') || stars.some((x) => x.mutagen === '祿');
    const shaCount = names.filter((n) => SHA.includes(n)).length;

    let score = 0;
    if (hasLu) score += 2;
    if (luPalace && ['命宮', '財帛', '官祿', '田宅'].includes(luPalace)) score += 2;
    if (jiPalace && ['命宮', '財帛', '官祿', '疾厄'].includes(jiPalace)) score -= 2;
    score -= shaCount;

    const isNow = age >= s && age <= e;
    const notes = [];
    if (isNow) notes.push('**你現在就在這一段**');
    if (hasLu) notes.push('這段時間資源會比較到位');
    if (luPalace) {
      const short = PALACE[luPalace] ? PALACE[luPalace].short : luPalace;
      notes.push(`好處主要落在**${short}**上`);
    }
    if (!notes.length) notes.push('這段時間阻力相對小，適合把想做的事推進去');

    return {
      range: `${s}–${e}`,
      from: s,
      to: e,
      years: `${person.birth_year + s - 1}–${person.birth_year + e - 1} 年`,
      palace: p.name,
      note: `${notes.join('，')}。`,
      score: score + (isNow ? 3 : 0),
    };
  });

  const good = scored.filter((w) => w.score >= 1);
  const pool = good.length ? good : scored;
  return pool.sort((x, y) => y.score - x.score).slice(0, 4).sort((x, y) => x.from - y.from);
}

/** 盲點與課題 —— 每一條都要給「可以怎麼做」 */
export function blindspotsReading(person, tone = 'blunt') {
  if (tone === 'peipei') return peipeiBlindspots(person);
  const a = rawAstrolabe(person);
  const P = a.palaces;
  const core = coreReading(a);
  const pats = groupPatterns(detectPatterns(a));
  const muts = natalMutagens(P);
  const age = calcAge(person);
  const stage = lifeStage(age);
  const minor = age < 16;
  const out = [];

  const cu = cushion(tone);
  if (cu) out.push(cu);

  if (minor) {
    out.push(`## ${heading('引導', tone)}`);
    const warmKid = tone === 'warm' ? warmWatch(a) : null;
    if (warmKid) out.push(`${warmKid}\n\n👉 父母可以順著他的天性帶，而不是硬扭。`);
    else if (core) out.push(`${core.watch}\n\n👉 父母可以順著他的天性帶，而不是硬扭。`);
    pats.caution.forEach((p) => out.push(`**${p.title}**\n\n${p.text}\n\n👉 ${p.advice}`));
  } else {
    out.push(`## ${heading('弱點', tone)}`);
    const warm = tone === 'warm' ? warmWatch(a) : null;
    if (warm) out.push(warm);
    else if (core) out.push(core.watch);
    if (pats.caution.length) {
      out.push(`## ${heading('留意', tone)}`);
      pats.caution.forEach((p) => out.push(`**${p.title}**\n\n${p.text}\n\n👉 ${p.advice}`));
    }
  }

  const ji = muts.find((m) => m.type === '忌');
  if (ji) {
    const info = PALACE[ji.palace];
    out.push(`## ${heading('課題', tone)}`);
    out.push(`${minor ? '他' : '你'}最容易糾結、也最需要學會處理的，是**${areaFor(ji.palace, stage.key)}**。${info ? info.bad : ''}。這不會只出現一次，會一再回來。`);
    out.push(`👉 ${adviceForJi(ji.palace, minor)}`);
  }

  out.push('---');
  out.push(closing(tone, minor));
  const pro2 = proBlock(tone, a, detectPatterns(a));
  if (pro2) out.push(pro2);
  return out.join('\n\n');
}

function adviceForJi(palace, minor) {
  const m = {
    命宮: '少對自己下重話。你對自己的批評，多半比事實嚴重得多。',
    兄弟: '跟手足和好友之間，錢的事一律講在前面。借出去的就當送出去。',
    夫妻: '在關係裡練習「先講，不要先忍」。你的委屈不說，對方是真的不知道。',
    子女: '對小孩或晚輩少一點期待、多一點陪伴。你越用力，反彈越大。',
    財帛: '不碰不熟的投資，該記帳就記帳。你的問題通常不是賺不到，是留不住。',
    疾厄: '把健康檢查排進行事曆，累了就休息。你的身體訊號都是真的。',
    遷移: '出遠門和重大轉換都多留一手，行程別排太滿。',
    僕役: '不合夥、不擔保、不借錢。這三條守住，你人生會少掉一大半麻煩。',
    官祿: '別急著跳槽。你的不滿常常是階段性的，做穩比換來換去有用。',
    田宅: '跟房子、家人有關的大決定要放慢。小問題別擱著，擱著會變大。',
    福德: '你的痛苦多半是想出來的，不是遇到的。運動、睡覺、找人講話，都比硬想有用。',
    父母: '多關心長輩的身體。跟上司有話早點講開，不要積。',
  };
  const base = m[palace] || '這一塊多留一分心，別硬碰。';
  return minor ? `父母可以這樣做：${base}` : base;
}
