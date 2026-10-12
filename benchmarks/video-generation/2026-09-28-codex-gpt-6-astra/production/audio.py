import math,wave,struct,random
sr=44100; duration=45; random.seed(4)
notes=[(130.8128,164.8138,195.9977),(110,130.8128,164.8138),(87.3071,110,130.8128),(97.9989,123.4708,146.8324)]
with wave.open("production/score.wav","wb") as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr)
 data=bytearray()
 for i in range(sr*duration):
  t=i/sr; beat=t/(60/112); phase=beat%1; chord=notes[int(beat/8)%4]
  fade=min(1,t/1.5,max(0,(45-t)/2.3)); kick=math.sin(2*math.pi*(48*phase+2.8*(1-math.exp(-phase*28))))*math.exp(-phase*16)*0.27
  hat=(random.random()*2-1)*math.exp(-(beat*2%1)*50)*0.045
  pad=sum(math.sin(2*math.pi*f*t)+0.25*math.sin(2*math.pi*f*2*t) for f in chord)*0.037
  step=beat*2%1; freq=chord[int(beat*2)%3]*4
  pluck=(math.sin(2*math.pi*freq*t)+0.2*math.sin(2*math.pi*freq*2*t))*math.exp(-step*6)*0.082
  pulse=0.06*math.sin(2*math.pi*chord[0]/2*t)*(0.7+0.3*math.cos(phase*math.pi*2))
  fx=0
  for cut in [4,8,15,22,28,34,39]:
   d=t-cut
   if -0.25<d<0.25: fx+=(random.random()*2-1)*0.12*(1-abs(d)/0.25)
  v=(kick+hat+pad+pluck+pulse+fx)*fade
  l=math.tanh(v)*0.85;r=math.tanh(v+0.013*math.sin(2*math.pi*chord[1]*t))*0.85*fade
  data.extend(struct.pack("<hh",int(l*32767),int(r*32767)))
  if len(data)>262144:w.writeframes(data);data.clear()
 w.writeframes(data)
