export const BPM = 128;
export const BEAT = 60 / BPM;
export const DURATION = 45;
export const b = (n) => n * BEAT;

export const S = {
  s1: 0,
  s2: b(10),
  s3: b(20),
  s4: b(34),
  s5: b(50),
  s6: b(64),
  s7: b(74),
  s8a: b(84),
  s8b: b(89),
};

export const T = {
  flood1: [b(10) - 0.55, b(10), b(10) + 0.5],
  slide2: [S.s3 - 0.6, S.s3],
  slide3: [S.s4 - 0.6, S.s4],
  fade4: [S.s5 - 0.55, S.s5],
  slide5: [S.s6 - 0.6, S.s6],
  flood6: [S.s7 - 0.55, S.s7, S.s7 + 0.5],
  zoom7: [S.s8a - 0.55, S.s8a],
  iris8: [S.s8b - 0.6, S.s8b],
};
