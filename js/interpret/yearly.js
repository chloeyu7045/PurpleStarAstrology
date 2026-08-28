import { rawAstrolabe, calcAge } from '../ziwei.js';
import { PALACE, MUTAGEN, STAR, lifeStage, areaFor, shortFor } from './lexicon.js';

const MUT_ORDER = ['祿', '權', '科', '忌'];

/** 找出某顆星坐落在本命的哪一宮 */
function palaceOfStar(palaces, starName) {
  const p = palaces.find((x) =>
    [...x.majorStars, ...x.minorStars].some((s) => s.name === starName));
  return p ? p.name : null;
}

/** 把 iztro 的無標籤 mutagen 陣列，轉成 [{類, 星, 宮}] */
function mapMutagens(palaces, list) {
  if (!list) return [];
  return list.map((star, i) => ({
    type: MUT_ORDER[i],
    star,
    palace: palaceOfStar(palaces, star),
  })).filter((m) => m.palace);
}

/** 某一宮的主星底色 */
function paletteOf(palaces, palaceName) {
  const p = palaces.find((x) => x.name === palaceName);
  if (!p) return null;
  const traits = p.majorStars.map((s) => STAR[s.name]).filter(Boolean);
  return traits.length ? traits.join('、') : null;
}

/**
 * 產生某一年的流年解讀。
 * 所有素材都來自 iztro 實際算出來的盤，這裡只負責翻成白話、組成文章。
 */
export function yearlyReading(person, year) {
  const a = rawAstrolabe(person);
  const palaces = a.palaces;
  const age = year - person.birth_year;
  const stage = lifeStage(age);
  const isChild = stage.voice === 'child';
  const you = isChild ? '他' : '你';
  const YOU = isChild ? '這孩子' : '你';

  const h = a.horoscope(`${year}-07-01`);

  // 大限：這十年落在本命哪一宮
  const dp = palaces[h.decadal.index];
  const dRange = (dp && dp.decadal && dp.decadal.range) || [];
  const dMut = mapMutagens(palaces, h.decadal.mutagen);

  // 流年：這一年的命宮落在本命哪一宮
  const yIdx = h.yearly.palaceNames.indexOf('命宮');
  const yp = palaces[yIdx];
  const yMut = mapMutagens(palaces, h.yearly.mutagen);

  const find = (t) => yMut.find((m) => m.type === t);
  const lu = find('祿'); const quan = find('權');
  const ke = find('科'); const ji = find('忌');

  const out = [];

  // ── 這十年 ──
  if (dp) {
    const dArea = areaFor(dp.name, stage.key);
    const dTone = paletteOf(palaces, dp.name);
    const dJi = dMut.find((m) => m.type === '忌');
    const dLu = dMut.find((m) => m.type === '祿');
    out.push(`## 這十年（${dRange.join('–')} 歲）`);
    let s = `${YOU}這十年的重心會放在**${dArea}**上`;
    if (dTone) s += `，整體的調性是${dTone}`;
    s += '。';
    if (dLu && dLu.palace) {
      s += `這段期間，**${areaFor(dLu.palace, stage.key)}**是最容易開花結果的地方。`;
    }
    if (dJi && dJi.palace) {
      s += `而**${areaFor(dJi.palace, stage.key)}**會是這十年反覆要面對的難題——它不會只出現一次，會一再回來，直到${you}處理好為止。`;
    }
    out.push(s);
  }

  // ── 今年主軸 ──
  out.push(`## ${year} 年主軸（${age} 歲）`);
  if (yp) {
    const area = areaFor(yp.name, stage.key);
    const info = PALACE[yp.name];
    const tone = paletteOf(palaces, yp.name);
    let s = `今年${you}的注意力會被拉到**${area}**上——${info ? info.long : area}，這一年會特別有感。`;
    if (tone) s += `這個領域對${you}來說本來就帶著「${tone}」的味道，今年會被放大。`;
    out.push(s);
  } else {
    out.push('今年的重心資訊有限，以下就四個面向分別來看。');
  }

  // ── 機會 ──
  const good = [];
  if (lu) {
    const info = PALACE[lu.palace];
    good.push(`**${areaFor(lu.palace, stage.key)}會順起來。**${info ? info.good : ''}。${MUTAGEN.祿.desc}。`);
  }
  if (quan) {
    const info = PALACE[quan.palace];
    good.push(`**${areaFor(quan.palace, stage.key)}會拿到更多主導權。**${info ? info.good : ''}，${MUTAGEN.權.desc}。`);
  }
  if (ke) {
    const info = PALACE[ke.palace];
    good.push(`**${areaFor(ke.palace, stage.key)}會被看見。**${MUTAGEN.科.desc}。${info ? info.good : ''}。`);
  }
  if (good.length) {
    out.push('## 機會在哪');
    good.forEach((g) => out.push(`- ${g}`));
  }

  // ── 要當心 ──
  if (ji) {
    const info = PALACE[ji.palace];
    out.push('## 要當心什麼');
    out.push(`**今年最需要留神的是${areaFor(ji.palace, stage.key)}。**${info ? info.bad : ''}。${MUTAGEN.忌.desc}。`);
    out.push(advice(ji.palace, isChild));
  }

  // ── 一句話 ──
  out.push('## 一句話總結');
  out.push(summary(year, yp, lu, ji, stage, isChild));

  if (isChild) {
    out.push(`> 這一年${YOU}還小，上面講的多半會透過家裡的氣氛、學校的狀況、或大人的情緒反映出來。父母看這段時，重點放在「今年要多留意他哪一塊」，而不是把它當成預言。`);
  }

  return out.join('\n\n');
}

/** 針對卡關的領域，給具體可做的事 */
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

/** 一句話定調。這裡一律用短標籤，否則句子會長到讀不動。 */
function summary(year, yp, lu, ji, stage, isChild) {
  const who = isChild ? '這孩子' : '你';
  const him = isChild ? '他' : '你';
  const focus = yp ? shortFor(yp.name, stage.key) : '整體狀態';
  const g = lu ? shortFor(lu.palace, stage.key) : null;
  const b = ji ? shortFor(ji.palace, stage.key) : null;
  if (g && b && g !== b) {
    return `**${year} 年對${who}來說是「${focus}」的一年。${g}是順的，往那裡使力；${b}是卡的，往那裡放心思。**`;
  }
  if (g && b && g === b) {
    return `**${year} 年對${who}來說是「${focus}」的一年，而${g}這一塊同時有順也有卡——機會和麻煩會一起來，別只看到一面。**`;
  }
  if (g) return `**${year} 年重心在「${focus}」，${g}會是${him}最好使的那張牌。**`;
  if (b) return `**${year} 年重心在「${focus}」，${b}會是最耗${him}的地方。穩住它，這一年就穩了。**`;
  return `**${year} 年的重心在「${focus}」，是相對平穩的一年，適合把基礎打好。**`;
}

/** 這個人一輩子可以看的年份範圍 */
export function lifeSpanYears(person) {
  const start = person.birth_year;
  const years = [];
  for (let y = start; y <= start + 100; y++) years.push(y);
  return years;
}

/** 大限分段，給 UI 當導覽用 */
export function decades(person) {
  const a = rawAstrolabe(person);
  return a.palaces
    .filter((p) => p.decadal && p.decadal.range && p.decadal.range.length)
    .map((p) => ({ name: p.name, range: p.decadal.range }))
    .sort((x, y) => x.range[0] - y.range[0]);
}

export { calcAge };
