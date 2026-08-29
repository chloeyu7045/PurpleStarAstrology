/**
 * 格局辨識層。
 *
 * 這是解讀「準不準」的關鍵：同樣命宮坐紫微，有「紫府同宮」和有「殺破狼」
 * 是完全不同的人生。少了這一層，所有人講起來都很像。
 *
 * 規則依據classical古籍（紫微斗數全書／全集、骨髓賦）的通行判法，
 * 結構參考 MIT 授權的 Renhuai123/ziwei-doushu 之 patterns.ts。
 *
 * ⚠️ 鐵律：格局名稱本身是術語，只准出現在程式與註解裡。
 *    對外輸出一律使用 title / text / advice 這幾個白話欄位。
 */

// iztro 的 palace.index 0 起算對應地支「寅」
const BRANCH_BY_INDEX = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

const SHA_HARD = ['擎羊', '陀羅', '火星', '鈴星'];
const SHA_KONG = ['地空', '地劫'];
const BRIGHT = ['廟', '旺', '得'];

// ── 取用盤面的小工具 ──────────────────────────────

const allStars = (p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];
const starNames = (p) => allStars(p).map((s) => s.name);
const majorNames = (p) => p.majorStars.map((s) => s.name);
const has = (p, name) => starNames(p).includes(name);
const hasAll = (p, names) => names.every((n) => has(p, n));
const hasAny = (p, names) => names.some((n) => has(p, n));

function at(palaces, idx) {
  return palaces[((idx % 12) + 12) % 12];
}
/** 三方四正：本宮 + 對宮 + 兩個三合宮 */
function trine(palaces, idx) {
  return [at(palaces, idx), at(palaces, idx + 4), at(palaces, idx + 6), at(palaces, idx + 8)];
}
/** 夾宮：前後兩宮 */
function sandwich(palaces, idx) {
  return [at(palaces, idx - 1), at(palaces, idx + 1)];
}
const inGroup = (group, name) => group.some((p) => has(p, name));
const groupHasAll = (group, names) => names.every((n) => inGroup(group, n));
const brightnessOf = (p, name) => {
  const s = allStars(p).find((x) => x.name === name);
  return s ? s.brightness : '';
};
function mutagenPalace(palaces, type) {
  return palaces.find((p) =>
    [...p.majorStars, ...p.minorStars].some((s) => s.mutagen === type));
}

/**
 * 回傳這張盤成立的格局。
 * level: 'great' 大好 | 'good' 有利 | 'caution' 要留意
 */
export function detectPatterns(astrolabe) {
  const P = astrolabe.palaces;
  const ming = P.find((p) => p.name === '命宮');
  if (!ming) return [];
  const i = ming.index;
  const T = trine(P, i);
  const S = sandwich(P, i);
  const branch = BRANCH_BY_INDEX[i];
  const out = [];
  const add = (o) => out.push(o);

  // ── 大好格局 ────────────────────────────────

  // 紫府同宮：紫微天府同坐命
  if (hasAll(ming, ['紫微', '天府'])) {
    add({ id: '紫府同宮', level: 'great',
      title: '你天生就被當成「可以託付的人」',
      text: '你身上同時有兩種很少並存的特質：想扛事的企圖心，和讓人安心的穩重感。所以你不需要爭，位置會自己來找你——別人會直覺覺得「這件事交給你比較放心」。',
      advice: '不要浪費在小事上。你適合的是需要有人拍板、又需要有人守得住的位置，太小的舞台會讓你悶。' });
  }

  // 君臣慶會：紫微會照左輔右弼或文昌文曲
  if (has(ming, '紫微') && (groupHasAll(T, ['左輔', '右弼']) || groupHasAll(T, ['文昌', '文曲']))) {
    add({ id: '君臣慶會', level: 'great',
      title: '你身邊會有一群幫得上忙的人',
      text: '你不是單打獨鬥的命。你有本事把人聚起來，也真的會有能力好的人願意站在你這邊幫你做事。你的成就會是「一群人一起做出來的」，不是你一個人硬拚。',
      advice: '不要什麼都自己來。你最大的槓桿是把對的人放到對的位置，那比你自己加班有用十倍。' });
  }

  // 府相朝垣：三方四正見天府天相
  if (groupHasAll(T, ['天府', '天相'])) {
    add({ id: '府相朝垣', level: 'great',
      title: '你的人生底盤很穩',
      text: '你這輩子不太會真的摔到谷底。就算遇到亂流，總會有東西接住你——可能是存款、可能是人脈、可能是某個一直在的人。你有一種讓自己不至於失控的本能。',
      advice: '這份穩是你的本錢，但別讓它變成不敢動。你其實比自己以為的更輸得起。' });
  }

  // 陽梁昌祿：太陽天梁文昌祿存會照
  if (groupHasAll(T, ['太陽', '天梁']) && inGroup(T, '文昌') && inGroup(T, '祿存')) {
    add({ id: '陽梁昌祿', level: 'great',
      title: '你靠腦袋和專業就能吃飯',
      text: '你適合走需要考試、證照、學歷、專業資格的路。念書、研究、教學、寫東西——這些對你不只是興趣，是能真的變成收入和地位的東西。',
      advice: '把專業「證明化」。同樣的能力，有一張紙背書跟沒有，在你身上的差別特別大。' });
  }

  // 三奇加會：祿權科三化同會命宮三方四正
  const luP = mutagenPalace(P, '祿');
  const quanP = mutagenPalace(P, '權');
  const keP = mutagenPalace(P, '科');
  const idxIn = (p) => p && T.some((t) => t.index === p.index);
  if (idxIn(luP) && idxIn(quanP) && idxIn(keP)) {
    add({ id: '三奇加會', level: 'great',
      title: '你的好運是「三件事一起來」的那種',
      text: '實質的好處、說話的份量、還有名聲，這三樣在你身上是綁在一起的。一旦某件事成了，往往不是只成一半，是連帶把其他幾塊一起帶起來。',
      advice: '你要等的是「對的那一次」，不是很多次。與其到處試，不如把力氣壓在你最有把握的那件事上。' });
  }

  // ── 有利格局 ────────────────────────────────

  // 武貪格：武曲貪狼同宮
  if (hasAll(ming, ['武曲', '貪狼']) || T.some((p) => hasAll(p, ['武曲', '貪狼']))) {
    add({ id: '武貪格', level: 'good',
      title: '你是大器晚成，而且成得很實在',
      text: '你年輕時多半沒什麼特別順的，該吃的苦都吃過。但你的爆發點在中年之後——那時候你的經驗、人脈、判斷力全部到位，會突然拉開跟同輩的距離。',
      advice: '不要跟年輕時就發的人比。你的曲線本來就長得不一樣，太早放棄才是真的可惜。' });
  }

  // 火貪／鈴貪：火星或鈴星與貪狼同宮
  const huoTan = P.find((p) => has(p, '貪狼') && hasAny(p, ['火星', '鈴星']));
  if (huoTan) {
    add({ id: '火貪鈴貪', level: 'good',
      title: '你的機會來得很突然',
      text: '你不是靠慢慢累積往上走的類型。你的轉機通常是「突然出現、而且必須馬上決定」——一個臨時的邀約、一個沒預期的機會。抓到了就跳一階，錯過就要再等很久。',
      advice: '平常就要準備好，因為機會來的時候不會給你時間準備。' });
  }

  // 石中隱玉：巨門坐命於子或午
  if (has(ming, '巨門') && ['子', '午'].includes(branch)) {
    add({ id: '石中隱玉', level: 'good',
      title: '你的價值需要被人挖出來',
      text: '你不是一眼就會被看見的人。你的本事藏在裡面，要相處久了、或是真的做過一件事，別人才會發現「原來你這麼厲害」。所以你常常被低估，尤其在第一印象。',
      advice: '主動讓人看見你的成果。不是要你自誇，是你太習慣等別人發現，而多數人不會。' });
  }

  // 機月同梁：三方四正見天機太陰天同天梁
  if (groupHasAll(T, ['天機', '太陰', '天同', '天梁'])) {
    add({ id: '機月同梁', level: 'good',
      title: '你適合有制度、能久待的環境',
      text: '你的優勢是細膩、負責、想得遠，而不是衝鋒陷陣。放在有規矩、能累積年資和信任的地方，你會愈做愈好；丟進要每天拚業績、拚輸贏的環境，你會被磨到懷疑人生。',
      advice: '選環境比選職位重要。適合你的地方，你待十年會變成不可取代的人。' });
  }

  // 日月同宮／並明：太陽太陰同宮，或分別在三方且都明亮
  const riYue = P.find((p) => hasAll(p, ['太陽', '太陰']));
  if (riYue) {
    add({ id: '日月同宮', level: 'good',
      title: '你身上有兩個完全相反的自己',
      text: '你有時候很外向、很願意付出、很想被看見；有時候又極度需要獨處、把自己收起來。這兩種都是真的你，不是善變。別人常常覺得你難懂，其實你只是同時裝了兩套系統。',
      advice: '不要逼自己「穩定」。學會辨認自己現在是哪一種狀態，然後照那個狀態安排事情，會省力非常多。' });
  }

  // 雙祿朝垣：祿存與化祿同會命宮三方
  if (inGroup(T, '祿存') && idxIn(luP)) {
    add({ id: '雙祿朝垣', level: 'good',
      title: '你的錢路不只一條',
      text: '你這輩子的收入來源通常不會只有一個，而且斷了一條還會有另一條。你對「怎麼把事情變成錢」有天生的敏感度。',
      advice: '有意識地經營第二條收入。你本來就適合，不做反而浪費。' });
  }

  // 輔弼／昌曲／魁鉞 夾命
  if (hasAny(S[0], ['左輔', '右弼']) && hasAny(S[1], ['左輔', '右弼'])) {
    add({ id: '輔弼夾命', level: 'good',
      title: '你左右都有人幫',
      text: '你遇到事情的時候，通常不會真的沒人可以問。你身邊會出現願意補位、願意跟你一起扛的人——而且往往不只一個。',
      advice: '你的問題從來不是沒人幫，是不好意思開口。' });
  }
  if (hasAny(S[0], ['天魁', '天鉞']) && hasAny(S[1], ['天魁', '天鉞'])) {
    add({ id: '魁鉞夾命', level: 'good',
      title: '關鍵時刻會有貴人出手',
      text: '你人生幾次重要的轉彎，多半有某個人推了你一把——通常是長輩、或是比你有份量的人。這不是運氣好，是你身上有讓人願意提拔的東西。',
      advice: '記得回頭去謝那些人。你的貴人運是靠關係維持的，不是自動續約。' });
  }

  // ── 要留意的格局 ─────────────────────────────

  // 殺破狼：三方四正見七殺破軍貪狼
  if (groupHasAll(T, ['七殺', '破軍', '貪狼'])) {
    add({ id: '殺破狼', level: 'caution',
      title: '你的人生是一段一段「打掉重練」的',
      text: '你不會有那種一條路走到底的人生。每隔一段時間，你的生活就會來一次大翻盤——換工作、換城市、換身邊的人、甚至換整個活法。這不是你不安分，是你的節奏本來就長這樣。\n\n難的地方在於：每次翻盤的當下都很痛，而且旁邊的人會不理解。',
      advice: '與其抗拒，不如把它當成週期來準備：手上永遠留一筆能撐半年的錢，和一兩個不管你怎麼變都還在的人。這兩樣能讓你的每次重來都不至於太狼狽。' });
  }

  // 馬頭帶箭：擎羊坐命於午
  if (has(ming, '擎羊') && branch === '午') {
    add({ id: '馬頭帶箭', level: 'caution',
      title: '你適合待在戰場，不適合待在後方',
      text: '你有一股別人沒有的衝勁和狠勁，在競爭、壓力、要拚輸贏的場合特別能發揮。但同一股勁放在太平順的環境裡，會變成沒事找事、或是把自己逼到極限。',
      advice: '主動去找有難度的事做。你需要一個真的對手，不然你會拿自己當對手。' });
  }

  // 羊陀夾命
  if (hasAny(S[0], ['擎羊', '陀羅']) && hasAny(S[1], ['擎羊', '陀羅'])) {
    add({ id: '羊陀夾命', level: 'caution',
      title: '你常常覺得兩邊都在擠你',
      text: '你的處境經常是「前面有壓力、後面也有壓力」，進退都不太舒服。這種夾擊感會讓你長期緊繃，而且不容易跟人說清楚到底哪裡不對。',
      advice: '這種局面通常不是靠硬撐解開的，是靠「先動一邊」。挑比較容易鬆動的那一側先處理，別想一次解決兩頭。' });
  }

  // 火鈴夾命
  if (hasAny(S[0], ['火星', '鈴星']) && hasAny(S[1], ['火星', '鈴星'])) {
    add({ id: '火鈴夾命', level: 'caution',
      title: '你心裡的火比表面大得多',
      text: '你外面看起來還好，裡面常常在燒——急、躁、忍著、然後某個點突然爆掉。爆完你自己也會後悔，因為那個力道通常超過事情本身。',
      advice: '找一個固定消耗體力的出口，運動最有效。你的躁不是想通就會好，是要「用掉」才會好。' });
  }

  // 空劫夾命
  if (hasAny(S[0], SHA_KONG) && hasAny(S[1], SHA_KONG)) {
    add({ id: '空劫夾命', level: 'caution',
      title: '你的努力容易在最後一步落空',
      text: '你會遇到比別人更多「明明快成了，卻沒成」的狀況。人跑了、時機過了、條件突然變了。久了你會有一種「反正也不會成」的疲憊感。',
      advice: '別把全部押在單一結果上，也別在事情確定前先在心裡慶祝。你需要的是同時推兩三件事，讓其中一件成就好。' });
  }

  // 廉殺羊：廉貞七殺擎羊會照
  if (groupHasAll(T, ['廉貞', '七殺']) && inGroup(T, '擎羊')) {
    add({ id: '廉殺羊', level: 'caution',
      title: '要特別注意意外和衝突',
      text: '你的盤面上有比較明顯的「來得又快又急」的傾向——可能是身體的突發狀況、交通上的意外、或是跟人正面衝撞。這不是說一定會發生，是說你在這方面的風險比一般人高。',
      advice: '該保的保險保一保，開車騎車不要趕。跟人起衝突時，讓自己先離開現場再談。' });
  }

  // 鈴昌陀武
  if (groupHasAll(T, ['鈴星', '文昌', '陀羅', '武曲'])) {
    add({ id: '鈴昌陀武', level: 'caution',
      title: '你容易在鑽牛角尖裡困很久',
      text: '你想事情會愈想愈深、愈想愈往壞處去，而且拉不出來。特別是遇到跟錢、跟文件、跟「是不是我做錯了」有關的事，你可以卡很久。',
      advice: '設一個停損：一件事想超過三輪還沒答案，就強制去做別的事。你需要的是打斷迴圈，不是想通。' });
  }

  // 命無正曜：借對宮
  if (!ming.majorStars.length) {
    add({ id: '命無正曜', level: 'caution',
      title: '你很難被定義，連你自己都說不清',
      text: '你會隨著身邊的人和環境變成不同的樣子，而且每個版本都是真的你。好處是適應力極強，什麼場合都活得下去；壞處是你常常不確定自己到底要什麼。',
      advice: '別急著找「真正的自己」。與其向內找，不如向外選——**你選擇待在什麼環境、跟什麼人在一起，幾乎就決定了你會變成誰。**' });
  }

  return out;
}

/** 依等級分組，方便各分頁取用 */
export function groupPatterns(list) {
  return {
    great: list.filter((p) => p.level === 'great'),
    good: list.filter((p) => p.level === 'good'),
    caution: list.filter((p) => p.level === 'caution'),
  };
}
