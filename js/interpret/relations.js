/** 兩人的關係類型。不同關係看的重點不一樣，講法也要跟著換。 */
export const RELATIONS = [
  { id: 'friend', label: '朋友',
    focus: ['命宮', '福德', '僕役', '兄弟'],
    intro: '朋友之間最重要的是「相處起來累不累」，以及能不能互相說真話。' },
  { id: 'couple', label: '情侶／夫妻',
    focus: ['夫妻', '福德', '財帛', '田宅'],
    intro: '親密關係看的是三件事：情緒上合不合、錢的觀念差多少、以及誰主導。' },
  { id: 'parentchild', label: '親子（長輩與晚輩）',
    focus: ['子女', '父母', '福德', '疾厄'],
    intro: '親子之間，大人的狀態幾乎決定了關係的溫度。孩子只能反映，不能調節。' },
  { id: 'work', label: '同事／工作夥伴',
    focus: ['官祿', '財帛', '僕役', '命宮'],
    intro: '工作關係看的是能不能把事做成，以及利益怎麼分。感情好不好反而是其次。' },
  { id: 'sibling', label: '兄弟姊妹',
    focus: ['兄弟', '田宅', '父母', '財帛'],
    intro: '手足之間繞不開的是家裡的事：長輩、房子、錢，還有從小累積的比較。' },
];

export const getRelation = (id) =>
  RELATIONS.find((r) => r.id === id) || RELATIONS[0];

/** 依關係別，把飛星的影響轉成「這對你們這種關係代表什麼」 */
export function relationNote(relationId, fly) {
  const inFocus = getRelation(relationId).focus.includes(fly.palace);
  if (!inFocus) return '';
  const byRelation = {
    friend: '這一點在朋友關係裡會特別明顯。',
    couple: '這一點是你們這段感情的關鍵，不處理會反覆出現。',
    parentchild: '這一點在親子相處上影響很大，大人要特別留意。',
    work: '這一點會直接影響你們合作的成果。',
    sibling: '這一點在家裡的事情上會特別容易被引爆。',
  };
  return byRelation[relationId] || '';
}
