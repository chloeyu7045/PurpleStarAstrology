// 預先寫好的解讀。點開就看得到，不需要 API Key、不需要複製貼上。
// key 用法跟快取一致：`${種類}:${personId}`
import p01 from './person_01.js';
import p02 from './person_02.js';
import p03 from './person_03.js';
import p04 from './person_04.js';
import p05 from './person_05.js';
import p06 from './person_06.js';
import p07 from './person_07.js';
import p08 from './person_08.js';
import p09 from './person_09.js';
import p10 from './person_10.js';
import p11 from './person_11.js';
import p12 from './person_12.js';

const BY_PERSON = {
  person_01: p01, person_02: p02, person_03: p03, person_04: p04,
  person_05: p05, person_06: p06, person_07: p07, person_08: p08,
  person_09: p09, person_10: p10, person_11: p11, person_12: p12,
};

/** 攤平成 { 'personality:person_01': '...', 'blindspots:person_01': '...' } */
export const READINGS = Object.entries(BY_PERSON).reduce((acc, [id, r]) => {
  if (r.personality) acc[`personality:${id}`] = r.personality;
  if (r.blindspots) acc[`blindspots:${id}`] = r.blindspots;
  return acc;
}, {});

export const getPrewritten = (key) => READINGS[key];
