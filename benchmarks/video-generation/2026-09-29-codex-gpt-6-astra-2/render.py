from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, math, subprocess, wave, os, sys
from functools import lru_cache
W,H,FPS=1920,1080,30
INK='#08090A'; PANEL='#0D0E10'; WHITE='#F7F8F8'; GRAY='#8A8F98'; LINE='#303338'; SILVER='#C9CCD1'
@lru_cache(None)
def font(s,b=False,m=False):return ImageFont.truetype('assets/GeistMono-Regular.otf' if m else 'assets/Geist-SemiBold.otf' if b else 'assets/Geist-Regular.otf',max(1,int(s)))
def clamp(x):return max(0,min(1,x))
def ease(x):return 1-(1-clamp(x))**4
def smooth(x):x=clamp(x);return x*x*(3-2*x)
def mix(a,b,t):return a+(b-a)*t
def text(im,s,x,y,size=50,c=WHITE,b=False,align='left',m=False):
 d=ImageDraw.Draw(im);f=font(size,b,m); box=d.textbbox((0,0),s,font=f);tw=d.textlength(s,font=f)
 if align=='center':x-=tw/2
 if align=='right':x-=tw
 d.text((int(x),int(y-box[1])),s,font=f,fill=c)
def line(im,pts,c=LINE,w=2):ImageDraw.Draw(im).line(pts,fill=c,width=w,joint='curve')
def rr(im,x,y,w,h,r=24,fill=PANEL,outline=LINE,stroke=2):
 if w<=0 or h<=0:return
 ImageDraw.Draw(im).rounded_rectangle((int(x),int(y),int(x+w),int(y+h)),radius=r,fill=fill,outline=outline,width=stroke)
def dot(im,x,y,r=4,c=WHITE):ImageDraw.Draw(im).ellipse((x-r,y-r,x+r,y+r),fill=c)
def envelope(im,x,y,s=1,c=WHITE,filled=False):
 w,h=90*s,62*s
 rr(im,x-w/2,y-h/2,w,h,10*s,PANEL if not filled else WHITE,c,max(1,int(s*2)))
 line(im,[(x-w/2+7*s,y-h/2+9*s),(x,y+5*s),(x+w/2-7*s,y-h/2+9*s)],INK if filled else c,max(1,int(s*2)))
def arrow(im,x,y,c=WHITE,s=1):line(im,[(x-18*s,y),(x+18*s,y)],c,max(2,int(3*s)));line(im,[(x+4*s,y-14*s),(x+18*s,y),(x+4*s,y+14*s)],c,max(2,int(3*s)))
def check(im,x,y,c=WHITE,s=1):line(im,[(x-10*s,y),(x-2*s,y+8*s),(x+14*s,y-10*s)],c,max(2,int(3*s)))
def label(im,s,x=108,y=212,c=GRAY):text(im,s,x,y,22,c,m=True)
def wordmark(im,x=108,y=76,size=34,c=WHITE):text(im,'Lumail',x,y,size,c,b=True)
def header(im,n,dark=True):
 c=WHITE if dark else INK;wordmark(im,c=c);text(im,'EMAIL, REIMAGINED',1812,85,19,GRAY,align='right',m=True)
 line(im,[(108,139),(1812,139)],LINE if dark else '#D6D8DA',1)
 text(im,f'{n:02d} / 09',108,989,18,GRAY,m=True);text(im,'lumail.io',1812,989,20,c,align='right')
def arrive(layer,t,start=0,dx=0,dy=70,scale=1):
 e=ease((t-start)/.65)
 if e<=0:return None
 if scale!=1:
  ss=mix(scale,1,e);layer=layer.resize((int(W*ss),int(H*ss)),Image.Resampling.BICUBIC)
  bg=Image.new('RGBA',(W,H));bg.alpha_composite(layer,(int((W-layer.width)/2),int((H-layer.height)/2)));layer=bg
 alpha=layer.getchannel('A').point(lambda v:int(v*e));layer.putalpha(alpha)
 bg=Image.new('RGBA',(W,H));bg.alpha_composite(layer,(int(dx*(1-e)),int(dy*(1-e))));return bg
def add(im,fn,t,start=0,dx=0,dy=60,scale=1):
 la=Image.new('RGBA',(W,H));fn(la);la=arrive(la,t,start,dx,dy,scale)
 if la:im.alpha_composite(la)
def base(t,light=False):
 im=Image.new('RGBA',(W,H),WHITE if light else INK)
 if not light:
  # Fine stationary field with slow traveling particles.
  d=ImageDraw.Draw(im)
  for y in range(180,951,48):
   for x in range(108,1813,48):d.point((x,y),fill='#202225')
  for j in range(12):
   x=(j*173+t*13)%W;y=220+(j*97)%670;dot(im,x,y,1.4,'#44484E')
 return im

def s0(t):
 im=base(t);header(im,1)
 label(im,'YOUR NEXT CHAPTER')
 # Typographic contrast, whole phrases move together.
 add(im,lambda a:text(a,'Email marketing.',108,320,126,b=True),t,.1,dy=100)
 add(im,lambda a:text(a,'Without the work.',108,476,126,GRAY,b=True),t,.65,dy=95)
 # Rings frame a single moving envelope, dissolve as the premise lands.
 for j in range(3):
  r=75+36*j+12*math.sin(t*.8+j);ImageDraw.Draw(im).ellipse((1620-r,752-r,1620+r,752+r),outline=LINE,width=2)
 envelope(im,1620,752+math.sin(t*2)*9,1.2)
 add(im,lambda a:text(a,'More creating. Less configuring.',114,725,35,SILVER),t,1.5,dy=25)
 return im

def s1(t):
 im=base(t,True);header(im,2,False)
 label(im,'MEET YOUR NEW EMAIL PLATFORM',c='#666B72')
 # Oversized brand reveal with a traveling rule and orbiting envelopes.
 add(im,lambda a:text(a,'Lumail',960,380,260,INK,b=True,align='center'),t,0,dy=50,scale=.82)
 add(im,lambda a:text(a,'A little AI. A lot of momentum.',960,706,42,'#62676F',align='center'),t,.65,dy=35)
 line(im,[(590,674),(590+740*ease(t/.9),674)],INK,3)
 for j in range(6):
  ang=j*math.pi/3+t*.13;x=960+760*math.cos(ang);y=525+310*math.sin(ang)
  envelope(im,x,y,.50,'#9CA0A7')
 return im

def s2(t):
 im=base(t);header(im,3);label(im,'01  /  THE EDITOR')
 add(im,lambda a:(text(a,'Your words.',108,322,100,b=True),text(a,'Your voice.',108,438,100,GRAY,b=True)),t,0,dx=-70)
 add(im,lambda a:text(a,'From idea to ready-to-send.',113,624,31,SILVER),t,.6)
 p=ease(t/.8);x=int(mix(2020,932,p));y=218+int(math.sin(t)*3)
 rr(im,x,y,880,681,24,'#F7F8F8','#F7F8F8');text(im,'New campaign',x+42,y+31,24,INK,b=True)
 rr(im,x+636,y+22,198,48,24,INK,INK);text(im,'Preview',x+735,y+36,19,WHITE,align='center')
 line(im,[(x,y+97),(x+880,y+97)],'#DADDE0',1)
 text(im,'SUBJECT',x+45,y+132,16,'#747980',m=True);text(im,'Something good is on its way.',x+45,y+168,32,INK,b=True)
 line(im,[(x+45,y+226),(x+835,y+226)],'#DADDE0',1)
 copy=['Hey {{first_name}},','A fresh idea. A new beginning.','I made something for you.']
 for i,s in enumerate(copy):
  chars=int(max(0,t-.8-i*.65)*28);text(im,s[:chars],x+45,y+280+i*65,29,'#42474E')
 if t>2.5:
  rr(im,x+44,y+514,258,62,14,INK,INK);text(im,'Take a look',x+173,y+534,23,WHITE,align='center')
 if t>3:
  z=ease((t-3)/.6);rr(im,x-80,y+575,500*z,88,18,'#1D2025','#50565E')
  if z>.8:text(im,'✦  Polish it. Keep my tone.',x-50,y+606,24,WHITE)
 return im

def s3(t):
 im=base(t);header(im,4);label(im,'02  /  YOUR AI, CONNECTED')
 add(im,lambda a:(text(a,'One prompt.',108,311,100,b=True),text(a,'Real momentum.',108,431,100,GRAY,b=True)),t)
 for j,name in enumerate(['Draft','Segment','Schedule']):
  z=ease((t-.8-j*.5)/.6);x=114+j*251
  if z>0:
   rr(im,x,690+(1-z)*30,222,69,34,'#17191D','#42464E');text(im,name,x+111,713+(1-z)*30,25,WHITE,align='center')
 x=1030;y=250;rr(im,x,y,782,598,24,'#121417','#3A3E45')
 text(im,'Lumail  /  Agent',x+38,y+30,22,SILVER,m=True)
 line(im,[(x,y+82),(x+782,y+82)],LINE)
 text(im,'> Prepare my next launch.',x+38,y+133,29,WHITE,m=True)
 statuses=['Campaign drafted','Audience selected','Schedule prepared']
 for j,s in enumerate(statuses):
  q=ease((t-1.2-j*.65)/.45)
  if q>0:
   yy=y+226+j*71;dot(im,x+52,yy+13,16,'#2B3036');check(im,x+52,yy+13,s=.7);text(im,s,x+88,yy,26,SILVER)
 if t>3.5:
  rr(im,x+35,y+474,710,78,16,WHITE,WHITE);text(im,'You approve. Then it goes.',x+390,y+500,26,INK,b=True,align='center')
 return im

def s4(t):
 im=base(t);header(im,5);label(im,'03  /  AUTOMATION')
 add(im,lambda a:text(a,'Make every next step happen.',960,280,86,b=True,align='center'),t)
 xs=[190,605,1020,1435];ys=[505,505,505,505];names=['Joins your list','Welcome email','Wait 2 days','Follow up']
 for j in range(3):
  line(im,[(xs[j]+295,585),(xs[j+1],585)],'#434850',3)
  v=((t*.7-j*.3)%1);dot(im,xs[j]+295+(xs[j+1]-xs[j]-295)*v,585,6,WHITE)
 for j,name in enumerate(names):
  q=ease((t-.45-j*.22)/.6);yy=ys[j]+(1-q)*70
  if q<=0:continue
  rr(im,xs[j],yy,295,162,20,'#15171A','#454A52')
  if j in [1,3]:envelope(im,xs[j]+43,yy+43,.44)
  elif j==0:
   dot(im,xs[j]+43,yy+37,12,WHITE);rr(im,xs[j]+25,yy+52,36,10,4,WHITE,WHITE)
  else:
   ImageDraw.Draw(im).ellipse((xs[j]+28,yy+25,xs[j]+59,yy+56),outline=WHITE,width=2);line(im,[(xs[j]+43,yy+30),(xs[j]+43,yy+42),(xs[j]+51,yy+46)],WHITE,2)
  text(im,name,xs[j]+26,yy+98,27,WHITE)
 add(im,lambda a:text(a,'Welcome. Launch. Follow up. Repeat.',960,787,36,SILVER,align='center'),t,1.75,dy=25)
 return im

def s5(t):
 im=base(t);header(im,6);label(im,'04  /  ONE HOME FOR EVERY EMAIL')
 add(im,lambda a:(text(a,'Big launches.',108,298,96,b=True),text(a,'Tiny login codes.',108,410,96,GRAY,b=True)),t)
 line(im,[(110,696),(1810,696)],'#515660',3);line(im,[(110,842),(1810,842)],'#515660',3)
 text(im,'MARKETING',115,617,20,SILVER,m=True);text(im,'TRANSACTIONAL  ·  PRIORITY LANE',115,909,20,SILVER,m=True)
 for j in range(8):envelope(im,((j*300+t*170)%2200)-140,696,.72)
 for j in range(4):
  x=((j*600+t*490)%2500)-250;envelope(im,x,842,.72,filled=True)
  line(im,[(x-135,842),(x-65,842)],GRAY,2)
 add(im,lambda a:text(a,'One domain. One dashboard.',1810,543,32,SILVER,align='right'),t,1,dy=30)
 return im

def s6(t):
 im=base(t,True);header(im,7,False);label(im,'ROOM TO GROW',c='#666B72')
 # Subscribers become an elegant expanding dot field.
 for j in range(140):
  row=j//20;col=j%20;x=114+col*88;y=668+row*34
  q=ease((t-j*.003)/1.3)
  dot(im,x,y,3+q*5,'#BFC3C8' if j%4 else '#525861')
 add(im,lambda a:(text(a,'Unlimited subscribers.',108,305,109,INK,b=True),text(a,'Pay for what you send.',108,433,94,'#777D86',b=True)),t)
 return im

def s7(t):
 im=base(t);header(im,8);label(im,'START WITH SOMETHING GOOD')
 val=int(3000*ease(t/1.8));txt=f'{val:,}'
 add(im,lambda a:text(a,txt,960,298,250,b=True,align='center'),t,0,dy=65)
 add(im,lambda a:text(a,'free emails. Every month.',960,598,65,SILVER,align='center'),t,.6)
 add(im,lambda a:text(a,'No credit card required.',960,756,30,GRAY,align='center'),t,1.2,dy=25)
 # A dimensional outline field contracts into the offer.
 for j in range(5):
  x=145-j*26+math.sin(t+j)*5;y=350-j*27
  line(im,[(x,700),(x,y),(x+70,y)],'#3F444C',2)
  line(im,[(W-x,700),(W-x,y),(W-x-70,y)],'#3F444C',2)
 return im

def s8(t):
 im=base(t,True);header(im,9,False)
 add(im,lambda a:text(a,'Love sending again.',960,261,120,INK,b=True,align='center'),t,0,dy=70)
 add(im,lambda a:text(a,'Lumail',960,439,167,INK,b=True,align='center'),t,.3,dy=40)
 q=ease((t-.8)/.65)
 if q>0:
  x=690;y=688+(1-q)*40;rr(im,x,y,540,106,53,INK,INK);text(im,'Start free at lumail.io',x+243,y+38,31,WHITE,align='center');arrow(im,x+483,y+53)
 add(im,lambda a:text(a,'Your next great email starts here.',960,849,29,'#747A82',align='center'),t,1.2,dy=24)
 return im
SCENES=[(0,4,s0),(4,8,s1),(8,14,s2),(14,20,s3),(20,26,s4),(26,31,s5),(31,36,s6),(36,40,s7),(40,45,s8)]
def frame(t):
 for i,(start,end,fn) in enumerate(SCENES):
  if start<=t<end:
   im=fn(t-start)
   # Directional push cuts: 10-frame panel wipes with both compositions visible.
   if i and t-start<.34:
    p=ease((t-start)/.34);prev=SCENES[i-1][2](start-SCENES[i-1][0]-.001);offset=int(W*(1-p));prev.paste(im,(offset,0));im=prev
   return im.convert('RGB')
 return s8(4.9).convert('RGB')

def audio():
 sr=48000;n=45*sr;rng=np.random.default_rng(24);out=np.zeros((n,2),dtype=np.float64)
 def put(a,start,amp=1,pan=0):
  k=int(start*sr);ln=min(len(a),n-k)
  if k<0 or ln<=0:return
  out[k:k+ln,0]+=a[:ln]*amp*math.sqrt((1-pan)/2);out[k:k+ln,1]+=a[:ln]*amp*math.sqrt((1+pan)/2)
 def tone(freq,dur,decay=2):
  x=np.arange(int(sr*dur))/sr;env=(1-np.exp(-x*100))*np.exp(-x*decay)
  return (np.sin(2*np.pi*freq*x)+.27*np.sin(4*np.pi*freq*x)+.10*np.sin(6*np.pi*freq*x))*env
 # Original 120 BPM minimal-electronic score, A minor / F / C / G.
 chords=[[220,261.63,329.63],[174.61,220,261.63],[196,261.63,329.63],[196,246.94,293.66]]
 for bar in range(23):
  start=bar*2;ch=chords[(bar//2)%4]
  for j,f in enumerate(ch):put(tone(f/2,2.8,.65),start,.058,(j-1)*.5)
  for j in range(8):
   f=ch[[0,1,2,1,0,2,1,2][j]]*(2 if j%3==0 else 1);put(tone(f,.7,7),start+j*.25,.13,math.sin(j*1.9)*.6)
   # ping-pong tap delays
   put(tone(f,.5,9),start+j*.25+.1875,.032,-math.sin(j*1.9)*.7)
 for b in np.arange(0,44,.5):
  x=np.arange(int(sr*.32))/sr;phase=2*np.pi*(43*x+7*(1-np.exp(-x*35)))
  kick=np.sin(phase)*np.exp(-x*15);put(kick,b,.34)
  if int(round(b*2))%2:
   x=np.arange(int(sr*.14))/sr;noise=rng.normal(0,1,len(x));sn=(noise-np.roll(noise,1))*.3*np.exp(-x*28);put(sn,b,.16)
  x=np.arange(int(sr*.07))/sr;noise=rng.normal(0,1,len(x));hat=(noise-np.roll(noise,1))*.2*np.exp(-x*65);put(hat,b+.25,.14,.35)
 for start,_,_ in SCENES[1:]:
  dur=.65;x=np.arange(int(sr*dur))/sr;noise=rng.normal(0,1,len(x));sw=(noise-np.roll(noise,1))*.06*np.sin(np.pi*x/dur)**2;put(sw,start-.3,.6,-.2)
 # Final resolving chime; percussion ends ahead of the tail.
 for f in [220,329.63,440,523.25]:put(tone(f,4,1.1),40,.09)
 out*=np.minimum(np.arange(n)/sr/1.0,1)[:,None]
 out*=np.minimum((45-np.arange(n)/sr)/1.7,1)[:,None]
 out=np.tanh(out*1.5)*.8
 with wave.open('assets/score.wav','wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((out*32767).astype('<i2').tobytes())

if __name__=='__main__':
 if '--stills' in sys.argv:
  for t in [2,6,11.5,17.5,23,28.5,33.5,38.5,43]:frame(t).save(f'frames/{t:04.1f}.jpg',quality=91)
  frame(42).save('poster.jpg',quality=94)
 else:
  audio()
  cmd=['ffmpeg','-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','pipe:0','-i','assets/score.wav','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-aspect','16:9','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-t','45','-movflags','+faststart','video.mp4']
  p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
  for i in range(1350):
   p.stdin.write(frame(i/FPS).tobytes())
   if i%150==0:print(f'{i//30}/45 seconds rendered',flush=True)
  p.stdin.close();ret=p.wait()
  if ret:raise RuntimeError(ret)
  frame(42).save('poster.jpg',quality=94)
  print('Finished video.mp4',flush=True)
