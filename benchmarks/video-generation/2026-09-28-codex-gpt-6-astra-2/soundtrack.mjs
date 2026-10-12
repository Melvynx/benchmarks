import fs from 'node:fs';

// Original 24-bar electronic instrumental. 128 BPM * 45 s = 96 beats.
const sr = 48000;
const duration = 45;
const samples = sr * duration;
const left = new Float32Array(samples);
const right = new Float32Array(samples);
const beat = 60 / 128;
const tau = Math.PI * 2;
let seed = 83651;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };
function add(time, length, fn, volume = 1, pan = 0) {
  const start = Math.floor(time * sr), count = Math.floor(length * sr);
  const l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < count && start + i < samples; i++) {
    if (start + i < 0) continue;
    const val = fn(i / sr, i) * volume;
    left[start+i] += val * l;
    right[start+i] += val * r;
  }
}
const hz = midi => 440 * 2 ** ((midi-69)/12);
const chords = [[50,57,60,64],[46,53,57,60],[53,60,64,67],[48,55,58,62]];
for (let bar = 0; bar < 24; bar++) {
  const chord = chords[Math.floor(bar/2)%4];
  const start = bar * 4 * beat;
  // Airy wide sustained harmony with gentle attack.
  chord.forEach((m, j) => add(start, 4*beat+0.35, t => {
    const env = Math.min(t/0.32,1) * Math.min((4*beat+0.35-t)/0.6,1);
    return (Math.sin(tau*hz(m)*t) + 0.35*Math.sin(tau*hz(m)*1.003*t)) * env;
  }, .032, (j-1.5)/2));
  for(let b=0;b<4;b++) {
    const when = start+b*beat;
    const active = bar >= 3 && bar < 22;
    if (active || b===0) add(when, .28, t => {
      const phase=tau*(46*t+75*.024*(1-Math.exp(-t/.024)));
      return Math.sin(phase)*Math.exp(-t*18) + noise()*.05*Math.exp(-t*120);
    }, active?.55:.32);
    if(active && b%2===1) add(when,.18,t => noise()*Math.exp(-t*28) * (.7+.3*Math.sin(tau*1700*t)),.16);
    if(active) {
      add(when,.32,t => (Math.sin(tau*hz(chord[0]-12)*t)+.2*Math.sin(tau*hz(chord[0])*t))*Math.min(t/.01,1)*Math.exp(-t*8),.24);
      for(let half=0;half<2;half++)add(when+half*beat/2,.055,t=>noise()*Math.exp(-t*75),half?.065:.042,half?.35:-.35);
    }
  }
  if(bar>=2 && bar<23) for(let n=0;n<8;n++) {
    const m=chord[[0,2,1,3,2,1,3,2][n]]+12;
    const startNote=start+n*beat/2;
    const synth=t=>(Math.sin(tau*hz(m)*t)+.2*Math.sin(tau*hz(m)*2*t))*Math.min(t/.006,1)*Math.exp(-t*8);
    add(startNote,.7,synth,.074,Math.sin(n*2)*.5);
    add(startNote+beat*.75,.7,synth,.024,-Math.sin(n*2)*.5);
  }
}
// Transition sweeps and tactile clicks for the animation's edit points.
for(const cut of [5.625,9.375,16.875,22.5,30,37.5,41.25]) {
  add(cut-.38,.58,t=>noise()*Math.sin(Math.PI*t/.58)**2 * (.3+.7*t/.58),.07);
  add(cut,.24,t=>Math.sin(tau*(850*t-650*t*t))*Math.exp(-t*26),.12);
}
add(41.25,3.75,t => (Math.sin(tau*hz(74)*t)+.4*Math.sin(tau*hz(81)*t))*Math.min(t/.015,1)*Math.exp(-t*1.5),.17);
const out = Buffer.alloc(44+samples*4);
out.write('RIFF'); out.writeUInt32LE(out.length-8,4); out.write('WAVEfmt ',8); out.writeUInt32LE(16,16);
out.writeUInt16LE(1,20); out.writeUInt16LE(2,22); out.writeUInt32LE(sr,24); out.writeUInt32LE(sr*4,28);
out.writeUInt16LE(4,32); out.writeUInt16LE(16,34); out.write('data',36); out.writeUInt32LE(samples*4,40);
for(let i=0;i<samples;i++) {
  const t=i/sr;
  const fade=Math.min(t/.1,1)*Math.min((duration-t)/1.8,1);
  out.writeInt16LE(Math.round(Math.tanh(left[i]*1.55)*fade*29000),44+i*4);
  out.writeInt16LE(Math.round(Math.tanh(right[i]*1.55)*fade*29000),46+i*4);
}
fs.writeFileSync('soundtrack.wav',out);
console.log('Original stereo soundtrack: 45.000 s, 48 kHz');
