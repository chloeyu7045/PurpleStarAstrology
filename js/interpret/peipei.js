/**
 * 「珮珮」語氣。
 *
 * 這一種跟其他三種本質不同：其他三種是「告訴你答案」，這一種是「陪你找答案」。
 * 結構取自老師本人的實際回覆：
 *   1. 先正常化，把羞恥感拿掉
 *   2. 明講「我不問／我不誇」什麼，以及為什麼
 *   3. 不需要細節就給出同理
 *   4. 把焦點翻到對方的內在
 *   5. 用開放式問句收尾，不下指令
 * 節奏是短句斷行、句尾不加標點。
 */
import { coreReading } from './core.js';
import { detectPatterns } from './patterns.js';
import { PALACE, areaFor, lifeStage } from './lexicon.js';
import { rawAstrolabe, calcAge } from '../ziwei.js';

/** 十四主星：講「難處」時的三段式 */
const SHADOW = {
  紫微: ['你習慣扛', '我不問你為什麼總是接下來\n因為會扛的人\n通常是沒有人可以靠', '你撐著的那些\n有多少是真的非你不可'],
  天機: ['你想很多', '我不問你為什麼要想那麼多\n因為會想的人\n通常都是被什麼傷過', '那個「再確認一次」的念頭\n到底是在保護你\n還是在讓你不用做決定'],
  太陽: ['你一直在給', '我不問你累不累\n因為我知道你會說還好', '你上一次讓別人照顧你\n是什麼時候'],
  武曲: ['你做得比說得多', '我不問你為什麼不講\n因為講出口對你來說很難', '你希望對方怎麼知道\n你其實很在乎'],
  天同: ['你不喜歡吵', '我不問你為什麼要忍\n因為忍下來比較快', '那些你沒說出口的\n後來都去哪裡了'],
  廉貞: ['你標準很高', '我不問你為什麼不放過自己\n因為你會說這樣才對', '那個標準\n是你要的\n還是你以為別人要的'],
  天府: ['你需要安全感', '我不問你為什麼不冒險\n因為你已經算過很多次了', '你在守的東西\n有沒有大到把你自己也關在裡面'],
  太陰: ['你把話放在心裡', '我不問你在想什麼\n因為你不會說', '你希望有人\n用什麼方式發現你不好'],
  貪狼: ['你什麼都想試', '我不問你為什麼定不下來\n因為新的東西真的比較有趣', '有沒有哪一件事\n你其實想做久一點'],
  巨門: ['你看得很準', '我不問你為什麼要講出來\n因為你講的通常是對的', '你希望別人聽見的\n是那個道理\n還是你'],
  天相: ['你很會替人著想', '我不問你為什麼不拒絕\n因為拒絕會讓你不舒服', '你有沒有算過\n你這樣讓了多久'],
  天梁: ['你習慣照顧人', '我不問你為什麼要管\n因為你確實看得比別人遠', '有沒有可能\n對方只是想被聽\n不是想被教'],
  七殺: ['你很快', '我不問你為什麼不等\n因為等對你來說很痛苦', '你衝過去的時候\n有沒有回頭看誰跟不上'],
  破軍: ['你敢重來', '我不問你為什麼要推翻\n因為你受不了將就', '這一次\n是真的不行\n還是你只是累了'],
};

/** 十四主星：講「本錢」時的三段式 */
const LIGHT = {
  紫微: ['你扛得住', '我不誇你有責任感\n因為那對你來說是本能', '你有沒有把這份重量\n用在你真正在乎的事情上'],
  天機: ['你腦子很快', '我不誇你聰明\n因為聰明的人很多', '你那些想法\n有多少真的走到最後'],
  太陽: ['你給得起', '我不誇你善良\n因為你不是為了被誇才給', '你給出去的那些\n有沒有留一份給自己'],
  武曲: ['你做得到', '我不誇你能幹\n因為你只是不會停', '你想證明的\n到底是給誰看'],
  天同: ['你讓人放鬆', '我不誇你好相處\n因為那不是本事\n那是天份', '你安撫過身邊那麼多人\n你被誰安撫過'],
  廉貞: ['你講究', '我不誇你有品味\n因為那是你的底線\n不是你的加分', '你的講究\n有沒有換到你要的東西'],
  天府: ['你守得住', '我不誇你穩\n因為穩對你來說不費力', '你守下來的那些\n有沒有讓你更自由'],
  太陰: ['你懂人', '我不誇你細心\n因為那是你的直覺', '你這麼懂別人\n有沒有人這麼懂你'],
  貪狼: ['你有魅力', '我不誇你會做人\n因為那太表面了', '你讓那麼多人喜歡你\n你自己喜歡你嗎'],
  巨門: ['你的話有份量', '我不誇你會講\n因為會講的人到處都是', '你講的話別人聽得進去\n你有拿它去換到你要的生活嗎'],
  天相: ['你讓人信任', '我不誇你可靠\n因為你從來沒讓人失望過', '這份信任\n有沒有變成你放不下的責任'],
  天梁: ['你讓人安心', '我不誇你有智慧\n因為那是你活出來的', '你照顧了那麼多人\n誰在照顧你'],
  七殺: ['你敢', '我不誇你有魄力\n因為你只是不怕', '你的勇氣\n有沒有用在對的地方'],
  破軍: ['你不怕從頭來過', '我不誇你勇敢\n因為你別無選擇', '你重來了幾次\n這一次想留下什麼'],
};

/** 生年化忌落宮 → 最後那一問 */
const ASK_BY_PALACE = {
  命宮: '你對自己那麼嚴\n是誰教你的',
  兄弟: '那些你幫過的人\n有誰在你需要的時候還在',
  夫妻: '你在關係裡\n最怕對方發現你哪一面',
  子女: '你想給他們的\n是不是你自己沒得到的',
  財帛: '錢對你來說\n是安全感\n還是證明',
  疾厄: '你的身體一直在說話\n你有在聽嗎',
  遷移: '你想去的那個地方\n是嚮往\n還是逃',
  僕役: '你對朋友那麼好\n是因為喜歡他們\n還是怕被丟下',
  官祿: '你現在這份工作\n是你選的\n還是你留下來的',
  田宅: '那個家\n讓你放鬆\n還是讓你緊張',
  福德: '你有多久\n沒有真的開心過了',
  父母: '你想從他們身上得到的\n是不是永遠不會來',
};

/** 取命宮主星（無正曜則借對宮） */
function coreStars(a) {
  const ming = a.palaces.find((p) => p.name === '命宮');
  if (!ming) return [];
  if (ming.majorStars.length) return ming.majorStars;
  const opp = a.palaces[((ming.index + 6) % 12 + 12) % 12];
  return opp ? opp.majorStars : [];
}

function firstMutagenPalace(a, type) {
  const p = a.palaces.find((x) =>
    [...x.majorStars, ...x.minorStars].some((s) => s.mutagen === type));
  return p ? p.name : null;
}

/** 用三段式組一段。table 為 SHADOW 或 LIGHT */
function triad(a, table) {
  const stars = coreStars(a);
  for (const s of stars) {
    if (table[s.name]) return table[s.name];
  }
  return null;
}

const asMinor = (t, isMinor) => (isMinor ? t.replace(/你/g, '這孩子') : t);

export function peipeiPersonality(person) {
  const a = rawAstrolabe(person);
  const isMinor = calcAge(person) < 16;
  const t = triad(a, LIGHT);
  const out = [];

  if (t) {
    out.push(`**${asMinor(t[0], isMinor)}**`);
    out.push(isMinor ? '這件事你們大概也看得出來' : '這件事你自己大概也知道');
    out.push(asMinor(t[1], isMinor));
    out.push(isMinor ? '但我更想問你們' : '但我更想問你');
    out.push(asMinor(t[2], isMinor));
  }

  const pats = detectPatterns(a).filter((p) => p.level !== 'caution');
  if (pats.length) {
    out.push('---');
    out.push(`**${pats[0].title}**`);
    out.push(pats[0].text.split('\n')[0]);
    out.push('你有沒有發現\n這件事一直在你身上重複');
  }
  return out.join('\n\n');
}

export function peipeiStrengths(person) {
  const a = rawAstrolabe(person);
  const isMinor = calcAge(person) < 16;
  const stage = lifeStage(calcAge(person));
  const t = triad(a, LIGHT);
  const out = [];

  if (t) {
    out.push(`**${asMinor(t[0], isMinor)}**`);
    out.push(asMinor(t[1], isMinor));
    out.push(asMinor(t[2], isMinor));
  }

  const lu = firstMutagenPalace(a, '祿');
  if (lu) {
    out.push('---');
    out.push(`**${areaFor(lu, stage.key)}，這一塊是站在你這邊的**`);
    out.push('我不跟你說要好好把握\n因為這種話你聽過太多次了');
    out.push(`我只想問\n${isMinor ? '有沒有人陪他往這裡走' : '你有沒有真的往這裡走過一次'}`);
  }
  return out.join('\n\n');
}

export function peipeiBlindspots(person) {
  const a = rawAstrolabe(person);
  const isMinor = calcAge(person) < 16;
  const t = triad(a, SHADOW);
  const out = [];

  out.push(isMinor ? '每個孩子都有比較卡的地方' : '每個人都有卡住的時候');

  if (t) {
    out.push(`**${asMinor(t[0], isMinor)}**`);
    out.push(isMinor ? '這件事你們大概也看得出來' : '這件事你自己知道');
    out.push(asMinor(t[1], isMinor));
    out.push(isMinor ? '但我更想問你們' : '但我更想問你');
    out.push(asMinor(t[2], isMinor));
  }

  const ji = firstMutagenPalace(a, '忌');
  if (ji && ASK_BY_PALACE[ji]) {
    out.push('---');
    out.push('**還有一件事，你可能一直繞過去沒看**');
    out.push(asMinor(ASK_BY_PALACE[ji], isMinor));
  }

  out.push('---');
  out.push(isMinor
    ? '這些問題不用今天回答\n先讓他知道\n有人願意等他想清楚'
    : '這些問題不用現在回答\n但放在心上\n哪天你會知道答案的');
  return out.join('\n\n');
}
