"""Original 120 BPM electronic score. Standard library only; no samples."""
import math, wave, array, random
SR=48000; DUR=45; TAU=math.tau
random.seed(8)
notes=[(220,261.6256,329.6276),(174.6141,220,261.6256),(130.8128,164.8138,195.9977),(195.9977,246.9417,293.6648)]
raw=array.array('f'); peak=0
for i in range(SR*DUR):
    t=i/SR; beat=t%0.5; step=int(t/0.25); chord=notes[int(t/4)%4]
    fade=min(1,t/1.2,(DUR-t)/2.8); fade=max(0,fade)
    # punchy kick, bass and smooth stereo pad
    kick=0.42*math.sin(TAU*(46*beat+6*(1-math.exp(-beat*40))))*math.exp(-beat*17)
    bassFreq=chord[0]/2; bass=0.105*math.sin(TAU*bassFreq*t)*(0.38+0.62*math.exp(-beat*8))
    pad=sum(math.sin(TAU*f*t+0.3*math.sin(t*0.5)) for f in chord)*0.032
    arpFreq=chord[step%3]*(2 if step%4==0 else 1); u=t%0.25
    arp=0.10*(math.sin(TAU*arpFreq*u)+0.28*math.sin(TAU*arpFreq*2*u))*math.exp(-u*15)*min(1,u*250)
    noise=random.uniform(-1,1); hat=noise*0.065*math.exp(-u*95)
    snare=0.0
    if int(t/0.5)%2==1: snare=noise*0.13*math.exp(-beat*30)
    # rising air on scene cuts and resonant punctuation after cuts
    cuts=[4,8,15,22,29,34,39]
    sweep=0
    for c in cuts:
        delta=t-c
        if -0.7<delta<0: sweep+=noise*0.06*(1+delta/0.7)**2
        if 0<=delta<1.3: sweep+=0.10*math.sin(TAU*(523.25*delta))*math.exp(-delta*5)
    music=kick+bass+pad+arp+hat+snare+sweep
    pan=0.15*math.sin(t*0.9)
    for side in (-1,1):
        value=(music+side*pad*0.24)*fade*(1+side*pan)
        raw.append(value);peak=max(peak,abs(value))
scale=0.86/max(peak,0.01)
pcm=array.array('h',(int(max(-1,min(1,x*scale))*32767) for x in raw))
with wave.open('assets/soundtrack.wav','wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(SR);out.writeframes(pcm.tobytes())
print('Original stereo score: 45.000s / 48kHz / 120 BPM')
