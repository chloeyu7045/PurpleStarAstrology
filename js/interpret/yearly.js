import { rawAstrolabe, calcAge } from '../ziwei.js';
import { PALACE, MUTAGEN, STAR, LU_COSTS, lifeStage, areaFor, shortFor } from './lexicon.js';

const MUT_ORDER = ['祿', '權', '科', '忌'];

/**
 * 流年星曜分類。
 * 這些 iztro 本來就算好了，是流年吉凶最具體的線索：
 * 流祿在哪一宮，錢的活水就從那個領域來；流羊在哪，那裡就容易起衝突。
 */
const YEAR_STARS = {
  流祿: { kind: 'good', what: '錢和資源的活水' },
  流馬: { kind: 'good', what: '走動、變化的機會' },
  流昌: { kind: 'good', what: '文書、考試、簽約、寫東西的順利' },
  流曲: { kind: 'good', what: '表達與才藝上的表現' },
  流魁: { kind: 'good', what: '貴人' },
  流鉞: { kind: 'good', what: '貴人' },
  流鸞: { kind: 'love', what: '感情或喜事' },
  流喜: { kind: 'love', what: '感情或喜事' },
  流羊: { kind: 'bad', what: '衝突、意外、開刀這類來得又快又急的事' },
  流陀: { kind: 'bad', what: '拖磨、卡住、反覆處理不完的事' },
};

function palaceOfStar(palaces, starName) {
  const p = palaces.find((x) =>
    [...x.majorStars, ...x.minorStars].some((s) => s.name === starName));
  return p ? p.name : null;
}

function mapMutagens(palaces, list) {
  if (!list) return [];
  return list.map((star, i) => ({
    type: MUT_ORDER[i], star, palace: palaceOfStar(palaces, star),
  })).filter((m) => m.palace);
}

/** 流年星曜落在本命的哪一宮 */
function yearStarPlacements(astrolabe, horo) {
  const out = [];
  const grid = (horo.yearly && horo.yearly.stars) || [];
  grid.forEach((cell, idx) => {
    const natal = astrolabe.palaces[idx];
    if (!natal) return;
    (cell || []).forEach((s) => {
      const info = YEAR_STARS[s.name];
      if (info) out.push({ name: s.name, palace: natal.name, ...info });
    });
  });
  return out;
}

function paletteOf(palaces, palaceName) {
  const p = palaces.find((x) => x.name === palaceName);
  if (!p) return null;
  const t = p.majorStars.map((s) => STAR[s.name]).filter(Boolean);
  return t.length ? t.join('、') : null;
}

/**
 * 給這一年打個分。
 *
 * 注意：流年吉星本來就有八顆、煞星只有兩顆，所以「數量」永遠是正的，
 * 拿數量打分會變成每一年都是好年，等於沒有評級。
 * 真正的差別在「落在哪一宮」——落在命財官疾才算數，落在其他宮影響有限。
 */
const KEY_PALACES = ['命宮', '財帛', '官祿', '疾厄'];
const LU_PALACES = ['命宮', '財帛', '官祿', '田宅'];

function yearScore(placements, yMut, dMut) {
  let score = 0;
  const reasons = [];

  const yLu = yMut.find((m) => m.type === '祿');
  const yJi = yMut.find((m) => m.type === '忌');
  if (yLu && LU_PALACES.includes(yLu.palace)) { score += 2; reasons.push('好處落在要緊的地方'); }
  if (yJi && KEY_PALACES.includes(yJi.palace)) { score -= 3; reasons.push('卡的地方剛好是要緊的地方'); }

  placements.forEach((p) => {
    if (p.name === '流祿' && KEY_PALACES.includes(p.palace)) score += 2;
    if (p.name === '流羊' && KEY_PALACES.includes(p.palace)) score -= 2;
    if (p.name === '流陀' && KEY_PALACES.includes(p.palace)) score -= 1;
    if ((p.name === '流魁' || p.name === '流鉞') && KEY_PALACES.includes(p.palace)) score += 1;
  });

  // 大限和流年卡在同一宮 = 雙重疊加，這種年份特別難
  const dJi = dMut.find((m) => m.type === '忌');
  if (dJi && yJi && dJi.palace === yJi.palace) {
    score -= 2;
    reasons.push('這十年的難題和今年的難題撞在一起');
  }

  if (score >= 3) return { label: '這是一個可以往前推的年', mark: '順', reasons };
  if (score >= 1) return { label: '這是一個小有進展、但要挑重點做的年', mark: '偏順', reasons };
  if (score >= -1) return { label: '這是一個平穩的年，適合把基礎打好', mark: '平', reasons };
  if (score >= -3) return { label: '這一年阻力偏多，穩住比往前衝重要', mark: '偏難', reasons };
  return { label: '這是一個要守、不適合冒進的年', mark: '守', reasons };
}

/** 主體：某一年的流年解讀 */
export function yearlyReading(person, year, tone = 'blunt') {
  const a = rawAstrolabe(person);
  const palaces = a.palaces;
  const age = year - person.birth_year;
  const stage = lifeStage(age);
  const isChild = stage.voice === 'child';
  const you = isChild ? '他' : '你';
  const YOU = isChild ? '這孩子' : '你';

  const h = a.horoscope(`${year}-07-01`);
  const yMut = mapMutagens(palaces, h.yearly.mutagen);
  const placements = yearStarPlacements(a, h);

  const yIdx = h.yearly.palaceNames.indexOf('命宮');
  const yp = palaces[yIdx];

  const dp = palaces[h.decadal.index];
  const dRange = (dp && dp.decadal && dp.decadal.range) || [];
  const dMut = mapMutagens(palaces, h.decadal.mutagen);

  const score = yearScore(placements, yMut, dMut);

  const find = (t) => yMut.find((m) => m.type === t);
  const lu = find('祿'); const quan = find('權'); const ke = find('科'); const ji = find('忌');
  const out = [];

  // ── 定調 ──
  out.push(`# ${year} 年 · ${age} 歲　「${score.mark}」`);
  out.push(`**${score.label}。**${score.reasons.length ? `（${score.reasons.join('、')}）` : ''}`);

  // ── 今年會發生什麼（具體事件層級）──
  out.push('## 今年會發生什麼');
  if (yp) {
    const info = PALACE[yp.name];
    let s = `今年的重心落在**${areaFor(yp.name, stage.key)}**。`;
    if (info && info.events) s += `具體會冒出來的多半是這類事：${info.events}。`;
    const tone2 = paletteOf(palaces, yp.name);
    if (tone2) s += `這一塊對${you}本來就帶著「${tone2}」的性質，今年會被放大。`;
    out.push(s);
  }
  if (lu) {
    const info = PALACE[lu.palace];
    const cost = LU_COSTS[lu.palace];
    out.push(`**今年被啟動最明顯的是${areaFor(lu.palace, stage.key)}。**這一塊事情會變多、資源會往這裡流。`
      + `${info && info.events ? `常見的形式：${info.events}。` : ''}`
      + `${cost ? `\n\n⚠️ ${cost}——所以「變熱鬧」不等於「變順」，要看是進來還是出去。` : ''}`);
  }
  if (quan) out.push(`**${areaFor(quan.palace, stage.key)}**今年${you}說話會更有份量，能做的決定變多，責任也跟著變大。`);
  if (ke) out.push(`**${areaFor(ke.palace, stage.key)}**容易遇到願意幫${you}的人，出了事也有人接。`);

  // ── 流年星曜：最具體的線索 ──
  const good = placements.filter((p) => p.kind === 'good');
  const love = placements.filter((p) => p.kind === 'love');
  const bad = placements.filter((p) => p.kind === 'bad');

  if (good.length || love.length) {
    out.push('## 今年哪些地方會變熱鬧');
    // 同一種好處（例如流魁與流鉞都是貴人）要合併，否則同一句會重複出現
    const byWhat = new Map();
    [...good, ...love].forEach((p) => {
      if (!byWhat.has(p.what)) byWhat.set(p.what, new Set());
      byWhat.get(p.what).add(areaFor(p.palace, stage.key));
    });
    // 條列超過四項就變雜訊，只留最集中的幾項
    [...byWhat.entries()]
      .sort((x, y) => y[1].size - x[1].size)
      .slice(0, 4)
      .forEach(([what, areas]) => {
        out.push(`- **${what}**會從**${[...areas].join('**、**')}**來。`);
      });
  }

  // ── 要當心 ──
  if (ji || bad.length) {
    out.push('## 今年要當心什麼');
    if (ji) {
      const info = PALACE[ji.palace];
      // 這裡不要帶入 events：那份清單是中性的，含好事，放在警告段落會讀起來矛盾
      out.push(`**最需要留神的是${areaFor(ji.palace, stage.key)}。**${info ? info.bad : ''}。`);
      out.push(advice(ji.palace, isChild));
    }
    bad.forEach((p) => {
      out.push(`- **${areaFor(p.palace, stage.key)}**這一塊今年容易有${p.what}。`);
    });
  }

  // ── 逐月 ──
  const months = monthlyLines(a, year, stage, isChild, ji ? ji.palace : null);
  if (months.length) {
    out.push('## 一年十二個月怎麼走');
    months.forEach((m) => out.push(m));
    out.push('> ⚠️ 標記的月份是「兩個訊號疊在一起」，參考性較高。沒有標記的月份代表沒有明顯訊號，不是保證平安。越細的推算參考性越低，月份只當提醒。');
  }

  // ── 這十年 ──
  if (dp) {
    out.push(`## 順帶看這十年（${dRange.join('–')} 歲）`);
    const dJi = dMut.find((m) => m.type === '忌');
    const dLu = dMut.find((m) => m.type === '祿');
    let s = `${YOU}這十年的重心在**${areaFor(dp.name, stage.key)}**。`;
    if (dLu && dLu.palace) s += `**${shortFor(dLu.palace, stage.key)}**是最容易開花結果的地方。`;
    if (dJi && dJi.palace) s += `而**${shortFor(dJi.palace, stage.key)}**會一再回來考${you}，直到處理好為止。`;
    out.push(s);
  }

  if (isChild) {
    out.push(`> ${YOU}還小，上面講的多半會透過家裡的氣氛、學校的狀況、或大人的情緒反映出來。父母看的重點是「今年要多留意他哪一塊」。`);
  }
  return out.join('\n\n');
}

/**
 * 逐月。
 *
 * 兩個重點：
 * 1. 流月是「農曆月」。一個國曆月可能橫跨兩個農曆月，之前只取每月 15 號
 *    一個切片，等於漏掉半個月的盤。改成掃過整年、依農曆月去重。
 * 2. 月層級的變數太少，不適合斷言好壞。只說「這一塊被啟動」和「這一塊要
 *    留神」，不再寫「某某順」——那是之前把化祿當成好事造成的誤導。
 */
function monthlyLines(a, year, stage, isChild, yearJiPalace) {
  // 本命本來就弱的地方：帶煞的宮位、以及生年化忌所在的宮位
  const NATAL_SHA = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
  const natalShaPalaces = new Set();
  let natalJiPalace = null;
  a.palaces.forEach((p) => {
    const names = [...p.minorStars, ...p.adjectiveStars].map((x) => x.name);
    if (names.filter((nm) => NATAL_SHA.includes(nm)).length >= 2) natalShaPalaces.add(p.name);
    [...p.majorStars, ...p.minorStars].forEach((st) => {
      if (st.mutagen === '忌') natalJiPalace = p.name;
    });
  });

  const seen = new Set();
  const warnedPalaces = new Set();
  const lines = [];

  // 每 5 天取一個點，確保每個農曆月至少被抓到一次
  for (let d = new Date(`${year}-01-03T00:00:00`); d.getFullYear() <= year; d.setDate(d.getDate() + 5)) {
    if (d.getFullYear() !== year) break;
    const iso = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let h;
    try { h = a.horoscope(iso); } catch (e) { continue; }

    // 用農曆月當唯一鍵，同一個農曆月只講一次
    const lunar = h.lunarDate || '';
    const mMatch = lunar.match(/年(.+?)[初廿十一二三四五六七八九]/);
    const lunarMonth = mMatch ? mMatch[1] : lunar.slice(0, 8);
    if (!lunarMonth || seen.has(lunarMonth)) continue;
    seen.add(lunarMonth);

    const idx = h.monthly.palaceNames.indexOf('命宮');
    const focus = a.palaces[idx];
    if (!focus) continue;
    const mut = mapMutagens(a.palaces, h.monthly.mutagen);
    const mLu = mut.find((x) => x.type === '祿');
    const mJi = mut.find((x) => x.type === '忌');

    // 流月煞星落在本命哪一宮
    const sha = [];
    ((h.monthly && h.monthly.stars) || []).forEach((cell, i) => {
      (cell || []).forEach((st) => {
        if (['月羊', '月陀', '月鈴', '月火'].includes(st.name) && a.palaces[i]) {
          sha.push(a.palaces[i].name);
        }
      });
    });

    // 講少、講重。
    // 列四件事必然有幾件不中，那就是「一半一半」的來源。
    // 只保留「重心」+「訊號真的疊起來的那一個警示」，單一弱訊號寧可不講。
    const shaSet = new Set(sha);
    const KEY = ['命宮', '財帛', '官祿', '疾厄'];

    // ⚠️ 月祿、月羊、月陀 是綁在一起移動的（月祿=月陀+1、月羊=月陀+2，
    //    即古法「祿前羊後陀」）。它們只帶一個資訊，不能當三個獨立訊號用，
    //    而且偏移常常連續數月相同 —— 直接拿來警示會變成連續四個月講同一句話。
    //    所以流月煞星只在「疊到本命本來就弱的地方」時才算訊號。
    let warn = null;
    const shaOnWeakSpot = [...shaSet].find(
      (pn) => natalShaPalaces.has(pn) || pn === natalJiPalace,
    );
    if (mJi && yearJiPalace && mJi.palace === yearJiPalace) {
      warn = { palace: mJi.palace, text: `**${shortFor(mJi.palace, stage.key)}**——這個月的難處撞上全年最卡的地方，是全年最該小心的一段`, strong: true };
    } else if (mJi && mJi.palace === natalJiPalace) {
      warn = { palace: mJi.palace, text: `**${shortFor(mJi.palace, stage.key)}**——這個月的難處剛好踩在你本來就最糾結的那一塊`, strong: true };
    } else if (shaOnWeakSpot) {
      warn = { palace: shaOnWeakSpot, text: `**${shortFor(shaOnWeakSpot, stage.key)}**——這個月的阻力落在你本來就比較弱的地方`, strong: true };
    } else if (mJi && KEY.includes(mJi.palace)) {
      warn = { palace: mJi.palace, text: `**${shortFor(mJi.palace, stage.key)}**要留神`, strong: false };
    }

    const head = `- **${lunarMonth}**（約${iso.slice(5).replace('-', '/')}起）　重心在**${shortFor(focus.name, stage.key)}**`;
    const luPart = mLu ? `，${shortFor(mLu.palace, stage.key)}的事會變多` : '';

    // 同一塊在一年內反覆被點到，是真的（多半就是本命的課題所在）。
    // 但逐字重複同一句話會讀起來像壞掉，所以第二次之後改成承認這個規律。
    let warnPart = '';
    if (warn) {
      const at = warn.palace;
      if (at && warnedPalaces.has(at)) {
        warnPart = `\n  　${warn.strong ? '⚠️ ' : '· '}又是**${shortFor(at, stage.key)}**——這一塊今年會反覆回來`;
      } else {
        warnPart = `\n  　${warn.strong ? '⚠️ ' : '· '}${warn.text}`;
        if (at) warnedPalaces.add(at);
      }
    }
    lines.push(head + luPart + warnPart);
  }
  return lines;
}

function advice(palaceName, isChild) {
  const map = {
    命宮: '具體做法：今年少對自己下重話。你會比平常更容易否定自己，但那多半是狀態問題，不是事實。',
    兄弟: '具體做法：今年不要跟兄弟姊妹或好朋友有金錢往來。借出去的當送，合夥的把話寫清楚。',
    夫妻: '具體做法：今年吵架時把「贏」放一邊。很多衝突不是關係壞了，是兩個人剛好都在低潮。話講慢一點。',
    子女: '具體做法：對小孩或晚輩少一點期待、多一點陪伴。你越用力，反彈越大。做東西的話，慢工出細活，別趕。',
    財帛: '具體做法：今年不碰不熟的投資、不做財務上的大動作。收入可能沒問題，但錢容易莫名其妙流掉——記帳會救你。',
    疾厄: '具體做法：今年一定要做健康檢查，不要拖。累了就休息，這一年身體給的訊號都是真的。',
    遷移: '具體做法：出遠門前多留一手，行程別排太滿。重大的搬遷或轉換，能緩就緩到明年。',
    僕役: '具體做法：朋友和合作對象是今年最大的變數。不合夥、不擔保、不借錢，這三條守住就沒事。',
    官祿: '具體做法：今年不是換工作的好時機，除非你已經想很久。手上的事做穩比往外跳重要，也要防有人搶功或推責。',
    田宅: '具體做法：跟房子有關的大筆決定要放慢。家裡的事該修就修，別擱著，小問題今年容易變大問題。',
    福德: '具體做法：今年心裡會比較不安、想得比較多。這是最需要主動處理的一塊——運動、睡眠、找人講話，任何一樣都比硬撐有用。',
    父母: '具體做法：多關心長輩的身體，該檢查就檢查。跟上司之間有話早點講開，不要積。',
  };
  const base = map[palaceName] || '具體做法：這一塊今年多留一分心，別硬碰。';
  return isChild ? base.replace(/你/g, '他').replace(/具體做法/, '父母可以這樣做') : base;
}

export function lifeSpanYears(person) {
  const start = person.birth_year;
  const years = [];
  for (let y = start; y <= start + 100; y++) years.push(y);
  return years;
}

export function decades(person) {
  const a = rawAstrolabe(person);
  return a.palaces
    .filter((p) => p.decadal && p.decadal.range && p.decadal.range.length)
    .map((p) => ({ name: p.name, range: p.decadal.range }))
    .sort((x, y) => x.range[0] - y.range[0]);
}

export { calcAge };
