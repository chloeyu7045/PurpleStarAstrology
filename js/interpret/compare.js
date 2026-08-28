import { rawAstrolabe, calcAge } from '../ziwei.js';
import { PALACE, STAR, lifeStage, areaFor } from './lexicon.js';

const MUT_ORDER = ['祿', '權', '科', '忌'];

/** 主星組合 → 這個人的核心性情（給比對用的短描述） */
const TEMPER = {
  紫微: { tag: '主導型', want: '被尊重、能作主', give: '扛責任', friction: '不肯低頭' },
  天機: { tag: '腦子型', want: '有變化、能想事情', give: '出主意', friction: '想太多、善變' },
  太陽: { tag: '付出型', want: '被看見、被感謝', give: '照顧和熱情', friction: '累了會委屈' },
  武曲: { tag: '實幹型', want: '踏實、有結果', give: '硬碰硬的行動力', friction: '不會說軟話' },
  天同: { tag: '和氣型', want: '輕鬆、不要吵', give: '溫和與包容', friction: '逃避問題' },
  廉貞: { tag: '講究型', want: '有原則、有品味', give: '認真和分寸', friction: '龜毛、愛計較' },
  天府: { tag: '穩重型', want: '安全感、可預期', give: '穩定和資源', friction: '不肯冒險' },
  太陰: { tag: '細膩型', want: '被溫柔對待', give: '體貼和照顧', friction: '心事不說' },
  貪狼: { tag: '慾望型', want: '精彩、多采多姿', give: '活力和魅力', friction: '定不下來' },
  巨門: { tag: '言語型', want: '被聽懂', give: '洞察和口才', friction: '話多、愛質疑' },
  天相: { tag: '協調型', want: '和諧、體面', give: '幫忙和圓場', friction: '沒主見、會忍' },
  天梁: { tag: '長輩型', want: '被需要、被敬重', give: '照顧和原則', friction: '愛說教' },
  七殺: { tag: '衝鋒型', want: '痛快、有戰場', give: '魄力和執行力', friction: '太衝、不留餘地' },
  破軍: { tag: '破立型', want: '改變、重來', give: '不怕打掉重練', friction: '不穩定、破壞力強' },
};

function digest(person) {
  const a = rawAstrolabe(person);
  const age = calcAge(person);
  const stage = lifeStage(age);
  const ming = a.palaces.find((p) => p.name === '命宮');
  const body = a.palaces.find((p) => p.isBodyPalace);

  // 命宮無主星就借對宮
  let core = ming.majorStars;
  let borrowed = false;
  if (!core.length) {
    const opp = a.palaces[(ming.index + 6) % 12];
    core = opp ? opp.majorStars : [];
    borrowed = true;
  }

  const tempers = core.map((s) => TEMPER[s.name]).filter(Boolean);
  const mutagens = (() => {
    const list = [];
    a.palaces.forEach((p) => {
      [...p.majorStars, ...p.minorStars].forEach((s) => {
        if (s.mutagen) list.push({ type: s.mutagen, star: s.name, palace: p.name });
      });
    });
    return list;
  })();

  return {
    name: person.name,
    age,
    stage,
    isMinor: age < 16,
    tempers,
    borrowed,
    bodyPalace: body ? body.name : '',
    ji: mutagens.find((m) => m.type === '忌'),
    lu: mutagens.find((m) => m.type === '祿'),
    quan: mutagens.find((m) => m.type === '權'),
  };
}

function tagLine(d) {
  if (!d.tempers.length) return '很難被定義、會隨環境變';
  return d.tempers.map((t) => t.tag).join('＋');
}

/** 兩人比對：任意兩人都能組出來 */
export function compareReading(personA, personB) {
  const A = digest(personA);
  const B = digest(personB);
  const hasMinor = A.isMinor || B.isMinor;
  const out = [];

  // ── 兩個人各是什麼樣的人 ──
  out.push('## 這兩個人各是什麼樣的人');
  out.push(`**${A.name}｜${tagLine(A)}**　${describe(A)}`);
  out.push(`**${B.name}｜${tagLine(B)}**　${describe(B)}`);

  // ── 合不合 ──
  out.push('## 合不合，為什麼');
  out.push(fitAnalysis(A, B, hasMinor));

  // ── 爽點與雷點 ──
  out.push('## 相處的爽點');
  out.push(sweetSpot(A, B, hasMinor));
  out.push('## 相處的雷點');
  out.push(painPoint(A, B, hasMinor));

  // ── 各自的功課 ──
  out.push('## 各自要調整什麼');
  out.push(adviceBlock(A, B));
  out.push(adviceBlock(B, A));

  if (hasMinor) {
    const kid = A.isMinor ? A : B;
    const adult = A.isMinor ? B : A;
    out.push('## 這是一段大人與孩子的關係');
    out.push(`${kid.name}還小（${kid.age} 歲），這段關係的主導權在${adult.name}身上。上面講的「雷點」不是要${kid.name}改，是提醒${adult.name}：孩子的天性改不了，能調整的是大人的方式。${kid.name}天生${kid.tempers.map((t) => t.want).join('、')}，順著這個帶，會比硬扭省力很多。`);
  }

  return out.join('\n\n');
}

function describe(d) {
  if (!d.tempers.length) {
    return `這個人沒有很固定的樣子，會隨著身邊的人和環境變。優點是彈性大、什麼場合都活得下去；缺點是自己也常常搞不清楚要什麼。`;
  }
  const want = d.tempers.map((t) => t.want).join('、');
  const give = d.tempers.map((t) => t.give).join('、');
  const fr = d.tempers.map((t) => t.friction).join('、');
  let s = `要的是${want}；能給的是${give}；卡住的時候會${fr}。`;
  if (d.ji) {
    s += `這輩子最容易糾結的是**${areaFor(d.ji.palace, d.stage.key)}**。`;
  }
  return s;
}

function fitAnalysis(A, B, hasMinor) {
  const aTags = A.tempers.map((t) => t.tag);
  const bTags = B.tempers.map((t) => t.tag);
  const HARD = ['主導型', '衝鋒型', '實幹型', '破立型'];
  const SOFT = ['和氣型', '細膩型', '協調型'];
  const aHard = aTags.some((t) => HARD.includes(t));
  const bHard = bTags.some((t) => HARD.includes(t));
  const aSoft = aTags.some((t) => SOFT.includes(t));
  const bSoft = bTags.some((t) => SOFT.includes(t));

  const lines = [];

  if (aHard && bHard) {
    lines.push(`**這是兩個都不肯讓的人。**${A.name}和${B.name}骨子裡都硬、都有主見、都習慣自己拿主意。合作起來爆發力很強，因為兩個人都會扛、都不推事；但一旦意見不同，就是硬碰硬，而且誰都不覺得自己該退。`);
    lines.push(`這種組合不是不合，是**必須先講好誰在什麼事上說了算**。沒有分工，就會一直在權力上耗。`);
  } else if (aSoft && bSoft) {
    lines.push(`**這是兩個都不想吵架的人。**相處起來很舒服、很少衝突，氣氛通常是柔和的。但問題也在這裡——真正該處理的事，兩個人都會繞過去。`);
    lines.push(`你們的風險不是吵架，是**把話悶著，然後某天突然發現距離很遠了**。`);
  } else if ((aHard && bSoft) || (aSoft && bHard)) {
    const hard = aHard ? A : B;
    const soft = aHard ? B : A;
    lines.push(`**這是一硬一軟的組合，天然互補。**${hard.name}負責衝、負責決定、負責扛；${soft.name}負責緩衝、負責照顧、負責把關係維持住。搭得好的時候非常有效率。`);
    lines.push(`但這個組合有一個固定的陷阱：**${hard.name}會越來越理所當然地做主，${soft.name}會越來越習慣不說話。**表面上很和平，實際上${soft.name}的委屈在累積，而${hard.name}完全不知道。`);
  } else {
    lines.push(`**這兩個人的性質差得比較遠，需要花力氣互相理解。**${A.name}要的是${A.tempers.map((t) => t.want).join('、')}；${B.name}要的是${B.tempers.map((t) => t.want).join('、')}。這不是誰對誰錯，是兩套不同的預設值。`);
    lines.push(`合得來的關鍵在於：**別假設對方跟你想的一樣。**你們很多摩擦不是惡意，是誤譯。`);
  }

  // 忌落在同一領域 → 共同痛點
  if (A.ji && B.ji && A.ji.palace === B.ji.palace && !hasMinor) {
    lines.push(`還有一件很關鍵的事：**你們兩個最糾結的地方剛好是同一塊——${areaFor(A.ji.palace, A.stage.key)}。**這代表你們特別懂彼此的痛，但也代表當這件事出狀況時，**沒有人能當那個穩住的人**，兩個人會一起沉下去。這是你們最需要提前約定好的地方。`);
  } else if (A.ji && B.ji && !hasMinor) {
    lines.push(`一個好消息：${A.name}最卡的是${areaFor(A.ji.palace, A.stage.key)}，${B.name}最卡的是${areaFor(B.ji.palace, B.stage.key)}——**不一樣**。這代表你們可以在對方最弱的地方補位，前提是願意講。`);
  }

  return lines.join('\n\n');
}

function sweetSpot(A, B, hasMinor) {
  const kid = A.isMinor ? A : (B.isMinor ? B : null);
  const adult = A.isMinor ? B : A;
  if (hasMinor && kid) {
    return `你們最好的時光，是**一起做一件具體的事**——一起煮飯、一起玩、一起完成一個作品。${kid.name}這個年紀還不太會用聊天表達親近，但會用「一起做」來表達。\n\n${kid.name}天生${kid.tempers[0] ? kid.tempers[0].give : '很願意配合'}，而${adult.name}${adult.tempers[0] ? `能給的是${adult.tempers[0].give}` : '有能力接住他'}——當${adult.name}是放鬆的，${kid.name}會立刻感覺到，也會跟著鬆。這一點比任何教養技巧都有效。`;
  }
  const gives = [...new Set([...A.tempers, ...B.tempers].map((t) => t.give))];
  return `你們最合拍的時候，是**有一件具體的事要一起完成**的時候——不是聊天談心，是做事。兩個人湊在一起可以拿出${gives.join('、')}，這在做事的場合是很強的組合。\n\n另外，${A.name}${A.tempers[0] ? `需要${A.tempers[0].want}` : '需要被理解'}，而${B.name}正好${B.tempers[0] ? `給得出${B.tempers[0].give}` : '有這個餘裕'}——當你們處在這個節奏上，相處是輕鬆的。`;
}

function painPoint(A, B, hasMinor) {
  const aF = A.tempers[0] ? A.tempers[0].friction : '退縮';
  const bF = B.tempers[0] ? B.tempers[0].friction : '退縮';
  const kid = A.isMinor ? A : (B.isMinor ? B : null);
  const adult = A.isMinor ? B : A;
  if (hasMinor && kid) {
    const kF = kid.tempers[0] ? kid.tempers[0].friction : '鬧脾氣';
    const aFr = adult.tempers[0] ? adult.tempers[0].friction : '失去耐性';
    return `雷點永遠在**兩個人同時累的時候**。${kid.name}一累就會${kF}，${adult.name}一累就會${aFr}——大人的情緒會直接放大孩子的反應，然後互相點火。\n\n典型的劇本是：${adult.name}覺得「我都講幾遍了」，${kid.name}其實根本不是不聽，是**當下的情緒已經滿出來，聽不進去**。這個年紀的孩子，先安撫才講得動道理，順序反了就會卡住。\n\n**真正該注意的是：這段關係的溫度由大人決定。**${kid.name}沒有能力調節你們之間的氣氛，他只能反映它。`;
  }
  return `雷點永遠在**兩個人同時累的時候**。${A.name}一累就會${aF}，${B.name}一累就會${bF}——這兩件事會互相點火。\n\n典型的劇本是：一方覺得「我都講這麼清楚了你怎麼還不懂」，另一方覺得「你根本沒在聽我說」。**你們的架幾乎都不是為了那件事本身吵的，是為了「有沒有被當一回事」。**\n\n另一個雷區是金錢與資源的分配。這不是誰小氣，是你們對「值不值得」的標準本來就不同。這件事講開比忍著好。`;
}

/**
 * 未成年的一方不該被當成要「自我調整」的對象——
 * 那一段要改寫成給大人的帶法。
 */
function adviceBlock(me, other) {
  if (!me.isMinor) return `**給 ${me.name}：**${adviceFor(me, other)}`;
  const f = me.tempers[0] ? me.tempers[0].friction : null;
  const kidNote = {
    '沒主見、會忍': '他不會主動說自己想要什麼，會一直讓。要常常主動問他「你想怎麼樣？」，而且尊重他的答案。',
    '不肯低頭': '他很硬，硬碰硬只會更僵。用講道理、給選擇的方式，比命令有效得多。',
    '想太多、善變': '他腦子轉很快，也容易改變心意。別急著怪他三分鐘熱度，先幫他把想法講出來。',
    '累了會委屈': '他會撐到最後才哭，別等他崩潰才發現。累了、餓了、受委屈了，要主動幫他說出來。',
    '不會說軟話': '他不太會表達情感，別用「你都不說愛我」逼他，看他做了什麼比聽他說什麼準。',
    '逃避問題': '他遇到難的事會躲。不要追著罵，陪他一小步一小步拆開來做。',
    '龜毛、愛計較': '他對細節和公平很敏感。答應他的事一定要做到，否則信任會扣分。',
    '不肯冒險': '他怕新環境、怕出錯。給他充足的預告和練習時間，別突然把他丟進去。',
    '心事不說': '他有事不會講，只會悶著。從日常小事培養說話的習慣，不要等出事才問。',
    '定不下來': '他坐不住、興趣換得快。與其強迫專注，不如幫他找到真正有興趣的那一件。',
    '話多、愛質疑': '他很愛問、很愛頂嘴，那是在思考不是在挑戰。認真回答他，別用「不要問那麼多」堵他。',
    '愛說教': '他小小年紀就愛講道理、糾正別人。要教他「對」不等於「該說」，也要顧別人的感受。',
    '太衝、不留餘地': '他衝動、動作快，容易闖禍或受傷。重點是教他踩煞車，而不是禁止他行動。',
    '不穩定、破壞力強': '他情緒起伏大、破壞力強。給他固定的作息和明確的界線，他反而會安定下來。',
  };
  const line = f && kidNote[f] ? kidNote[f] : '順著他的天性帶，比硬扭省力。';
  return `**帶 ${me.name} 的大人可以這樣做：**${line}他這個年紀還在長，上面說的不是要他改，是提醒大人怎麼接。`;
}

function adviceFor(me, other) {
  const f = me.tempers[0] ? me.tempers[0].friction : null;
  const otherWant = other.tempers[0] ? other.tempers[0].want : '被理解';
  const base = {
    '不肯低頭': '你不需要每次都是對的。偶爾先道歉不會讓你變小，反而會讓對方卸下防備。',
    '想太多、善變': '把想法講出來，不要在心裡演完整齣戲然後直接跳到結論。對方跟不上你的腦子。',
    '累了會委屈': '在你還沒累爆之前就開口。你不說，沒有人知道你在硬撐——包括最在乎你的人。',
    '不會說軟話': '做得多不等於說得夠。你以為的「行動就是愛」，對方常常收不到訊號。',
    '逃避問題': '有些事拖不掉。你越繞開，它越大。挑一個心情平穩的時候把話講完。',
    '龜毛、愛計較': '把標準放低一格。你在意的很多細節，對方是真的沒感覺，不是故意輕忽。',
    '不肯冒險': '對方想改變的時候，先聽完再說「可是」。你的穩定是資產，但別變成擋路的牆。',
    '心事不說': '你的沉默會被解讀成冷淡。與其等對方猜，不如直接說「我現在不太好」。',
    '定不下來': '給關係一點承諾。你不需要放棄精彩，但對方需要知道自己在你這裡有位置。',
    '話多、愛質疑': '少講三成。你的觀察通常是對的，但對的話講太多次就變成攻擊。',
    '沒主見、會忍': '你的忍讓不會換來體諒，只會換來習慣。想要什麼就說出來，第一次會很難。',
    '愛說教': '對方要的多半不是解方，是有人聽他講完。先問「你想聽建議還是只想說一說」。',
    '太衝、不留餘地': '慢半拍。你的直覺常常是對的，但你的速度會輾過別人的感受。',
    '不穩定、破壞力強': '在你想把一切推翻重來之前，先問自己：是這件事真的不行，還是我只是不耐煩了。',
  };
  const line = f && base[f] ? base[f] : '多留一點空間給對方，也留一點給自己。';
  return `${line}另外記得——${other.name}最在乎的是**${otherWant}**，這是你最省力就能給的東西。`;
}
