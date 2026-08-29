/**
 * 十二宮逐宮分析：每一宮一句，短但要一針見血。
 *
 * 同一顆星在不同宮位意思差很多（貪狼在命是慾望強，在夫妻是桃花多），
 * 所以按宮位性質分成四類來查，而不是所有宮位共用一句。
 */
import { PALACE } from './lexicon.js';

/** 宮位分成四類：自身、關係、財物、行動 */
const CATEGORY = {
  命宮: 'self', 福德: 'self', 疾厄: 'self',
  兄弟: 'bond', 夫妻: 'bond', 子女: 'bond', 僕役: 'bond', 父母: 'bond',
  財帛: 'money', 田宅: 'money',
  官祿: 'work', 遷移: 'work',
};

/** 十四主星 × 四類宮位 */
const S = {
  紫微: { self: '自我要求高、想主導', bond: '對方強勢或有份量', money: '手筆大，花得也大', work: '適合扛責任、能拍板的位置' },
  天機: { self: '腦子停不下來、想很多', bond: '關係多變，聚少離多', money: '財來財去，靠腦子賺', work: '適合企劃與應變的工作' },
  太陽: { self: '熱情外放，也因此勞碌', bond: '對方付出多，但也愛面子', money: '賺得到，也散得快', work: '適合需要曝光與帶人的位置' },
  武曲: { self: '剛硬、務實，不擅表達感情', bond: '對方直接，不會說軟話', money: '金錢觀念強，守得住', work: '適合實務與跟錢有關的事' },
  天同: { self: '想放鬆、怕麻煩', bond: '相處和氣，少有衝突', money: '財來得順，但不夠積極', work: '適合穩定、不用拚殺的環境' },
  廉貞: { self: '壓抑而講究，心裡有把嚴尺', bond: '感情濃烈，也比較複雜', money: '錢和人情容易糾纏在一起', work: '適合需要交際與講究細節的事' },
  天府: { self: '穩重保守，不愛冒險', bond: '對方可靠，能給安全感', money: '守得住，慢慢累積得起來', work: '適合守成與管理' },
  太陰: { self: '細膩內斂，心事不說', bond: '重感情，也容易委屈', money: '積少成多，跟房子有緣', work: '適合細活與幕後的角色' },
  貪狼: { self: '慾望強、多才多藝', bond: '緣分多，應酬也多', money: '財路多元，開銷同樣大', work: '適合交際與開拓新局' },
  巨門: { self: '多疑、愛鑽研', bond: '容易有口舌摩擦', money: '靠口才和專業賺錢', work: '適合表達、研究、談判' },
  天相: { self: '重體面、愛居中協調', bond: '關係和諧，願意配合', money: '財務平穩，不會冒進', work: '適合輔佐與協調的位置' },
  天梁: { self: '老成、講原則', bond: '有長輩緣，也愛照顧人', money: '有蔭庇，不缺但也不豐', work: '適合監督、教學、把關' },
  七殺: { self: '剛烈、獨立', bond: '關係較疏離，或聚少離多', money: '起伏大，敢衝也敢賭', work: '適合開創與打硬仗' },
  破軍: { self: '不安於現狀', bond: '關係變動大，容易重來', money: '大進大出，先破後立', work: '適合打掉重練的任務' },
};

const SHA = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
const LUCKY = ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲', '祿存', '天馬'];

const MUTAGEN_NOTE = {
  祿: '這一塊是順的，容易有實質收穫',
  權: '這一塊你掌控慾強，也真的拿得到話語權',
  科: '這一塊有名聲，也容易遇到貴人',
  忌: '這一塊是最容易糾結、也最耗你的地方',
};

function brightnessNote(list) {
  const b = list.map((s) => s.brightness).filter(Boolean);
  if (!b.length) return '';
  if (b.some((x) => ['廟', '旺'].includes(x))) return '這股力量發揮得好';
  if (b.every((x) => ['陷', '不'].includes(x))) return '但這股力量使不太出來，容易只剩下缺點那一面';
  return '';
}

/**
 * 產生某一宮的一句分析。
 * tone === 'pro' 時會帶出星曜名稱，其餘一律白話。
 */
export function palaceInsight(palace, astrolabe, tone = 'blunt') {
  const cat = CATEGORY[palace.name];
  const info = PALACE[palace.name];
  if (!cat || !info) return '';

  const majors = palace.majorStars;
  const minors = palace.minorStars;
  const all = [...majors, ...minors];
  const parts = [];

  // 主星性質；無主星則借對宮
  let source = majors;
  let borrowed = false;
  if (!majors.length) {
    const opp = astrolabe.palaces[((palace.index + 6) % 12 + 12) % 12];
    source = opp ? opp.majorStars : [];
    borrowed = true;
  }
  const traits = source.map((s) => (S[s.name] ? S[s.name][cat] : null)).filter(Boolean);
  if (traits.length) {
    parts.push(traits.join('；'));
  } else {
    parts.push('這一塊沒有特別強的傾向，通常隨環境走');
  }
  if (borrowed) parts.push('這一塊本身沒有定性，會受對面那一塊牽動');

  const bn = brightnessNote(source);
  if (bn && !borrowed) parts.push(bn);

  // 四化
  all.forEach((s) => {
    if (s.mutagen && MUTAGEN_NOTE[s.mutagen]) parts.push(MUTAGEN_NOTE[s.mutagen]);
  });

  // 煞吉
  const shaHere = [...minors, ...palace.adjectiveStars].filter((s) => SHA.includes(s.name));
  const luckyHere = minors.filter((s) => LUCKY.includes(s.name));
  if (shaHere.length >= 2) parts.push('這裡阻力偏多，要多花心力');
  else if (shaHere.length === 1) parts.push('這裡有一點波折');
  if (luckyHere.length >= 2) parts.push('但也有不少助力');

  let text = parts.join('，') + '。';
  if (tone === 'pro') {
    const label = (s) => s.name + (s.brightness ? `(${s.brightness})` : '') + (s.mutagen ? `化${s.mutagen}` : '');
    const starList = majors.length ? majors.map(label).join('、')
      : `無正曜，借${source.map((s) => s.name).join('、') || '對宮'}`;
    text = `〔${starList}〕${text}`;
  }
  return text;
}

/** 全部十二宮，依看盤習慣從命宮起 */
export function allPalaceInsights(astrolabe, tone = 'blunt') {
  const ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄',
    '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
  return ORDER.map((name) => {
    const p = astrolabe.palaces.find((x) => x.name === name);
    if (!p) return null;
    return {
      name,
      area: PALACE[name] ? PALACE[name].area : name,
      text: palaceInsight(p, astrolabe, tone),
    };
  }).filter(Boolean);
}
