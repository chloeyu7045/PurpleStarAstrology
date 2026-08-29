/**
 * 語氣層。同一份分析，三種說法。
 *
 * warm  溫暖鼓勵：一樣講缺點，但用「要練習的地方」而不是「致命盲點」
 * blunt 直白犀利：講到痛點，不美化
 * pro   紫微專業：解除術語封印，額外附上技術面（星曜、宮位、四化、格局）
 */
export const TONES = [
  { id: 'warm', label: '溫暖', hint: '用鼓勵的方式講，看完不會受傷' },
  { id: 'blunt', label: '犀利', hint: '講到痛點，不美化' },
  { id: 'pro', label: '專業', hint: '顯示星曜、宮位、四化等專有名詞' },
  { id: 'peipei', label: '珮珮', hint: '像老師本人在跟你說話：用問的，不是用講的' },
];

export const isTone = (id) => TONES.some((t) => t.id === id);

/** 各段落的標題，依語氣換句話說 */
const HEADINGS = {
  本性: { warm: '你是這樣的人', blunt: '本性', pro: '命宮主星與本質' },
  特別: { warm: '你身上的亮點', blunt: '你身上比較特別的地方', pro: '成格與破格' },
  天賦: { warm: '你的天賦', blunt: '天賦優勢', pro: '可用之處' },
  本錢: { warm: '你最珍貴的地方', blunt: '你最大的本錢', pro: '格局優勢' },
  使力: { warm: '這些地方會回報你的努力', blunt: '往哪裡使力最划算', pro: '祿權科三吉化落宮' },
  窗口: { warm: '未來值得期待的幾段時間', blunt: '人生的機會窗口', pro: '大限吉凶' },
  弱點: { warm: '你可以練習的地方', blunt: '你的性格弱點', pro: '主星陷弱與煞忌影響' },
  留意: { warm: '這幾件事值得放在心上', blunt: '你要留意的幾件事', pro: '破格與煞星組合' },
  課題: { warm: '你這輩子的主題', blunt: '這輩子的功課', pro: '生年化忌所在宮位' },
  引導: { warm: '這孩子需要的陪伴', blunt: '需要被好好引導的地方', pro: '幼年盤要留意之處' },
};

export function heading(key, tone) {
  const h = HEADINGS[key];
  if (!h) return key;
  return h[tone] || h.blunt;
}

/** 溫暖模式在講缺點之前，先給一句緩衝 */
export function cushion(tone) {
  if (tone !== 'warm') return '';
  return '每個人都有比較卡的地方，這不是缺陷，是還沒被好好照顧到的部分。以下這些，看看哪一項你有共鳴就好。';
}

/** 收尾。溫暖模式多給一句鼓勵，犀利模式維持原本的導流 */
export function closing(tone, isMinor) {
  const who = isMinor ? '他' : '你';
  if (tone === 'warm') {
    return `**最後想說：**上面提到的每一項，都是可以練習、可以變好的。${who}已經走到這裡了，代表${who}身上有的東西比這些難處多得多——記得去看「優勢與時機」那一頁。`;
  }
  if (tone === 'pro') {
    return `**備註：**以上以生年四化與煞忌所在宮位為主軸推斷，未納入自化與飛星互涉，僅供參考。`;
  }
  return `**最後一句：**上面講的是${who}比較弱的那幾塊，不是${who}的全部。記得也去看「優勢與時機」那一頁——那裡才是${who}真正的本錢。`;
}

/** 專業模式：附上技術面。其他模式回空字串。 */
export function proBlock(tone, astrolabe, patterns) {
  if (tone !== 'pro') return '';
  const P = astrolabe.palaces;
  const ming = P.find((p) => p.name === '命宮');
  const body = P.find((p) => p.isBodyPalace);
  const lines = [];

  const star = (s) => s.name + (s.brightness ? `(${s.brightness})` : '') + (s.mutagen ? `化${s.mutagen}` : '');
  lines.push('### 技術面');
  lines.push(`- **命宮**：${ming.heavenlyStem}${ming.earthlyBranch}　${ming.majorStars.map(star).join('、') || '無正曜（借對宮）'}`);
  if (ming.minorStars.length) lines.push(`- **命宮輔煞**：${ming.minorStars.map(star).join('、')}`);
  lines.push(`- **身宮**：${body ? body.name : '—'}　**命主**：${astrolabe.soul}　**身主**：${astrolabe.body}　**${astrolabe.fiveElementsClass}**`);

  const muts = [];
  P.forEach((p) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      if (s.mutagen) muts.push(`${s.name}化${s.mutagen}在${p.name}`);
    });
  });
  if (muts.length) lines.push(`- **生年四化**：${muts.join('、')}`);

  if (patterns && patterns.length) {
    lines.push(`- **格局**：${patterns.map((p) => p.id).join('、')}`);
  }
  return lines.join('\n');
}
