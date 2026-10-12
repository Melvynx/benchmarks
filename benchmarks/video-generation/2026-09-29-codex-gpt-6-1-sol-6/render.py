"""Deterministic Lumail film renderer. Uses installed Pillow/numpy and FFmpeg.
Run python3.13 render.py. All output stays alongside this source.
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import math, subprocess, wave, os, json
from functools import lru_cache

W,H,FPS,DURATION=1920,1080,30,45
INK='#08090A'; PANEL='#0D0E10'; WHITE='#F7F8F8'; GRAY='#8A8F98'; SILVER='#C9CCD1'
@lru_cache(None)
def font(size,bold=False,mono=False):
    return ImageFont.truetype('/System/Library/Fonts/SFNSMono.ttf' if mono else '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Helvetica.ttc',size)
def clamp(v):return max(0,min(1,v))
def ease(v):return 1-(1-clamp(v))**4
def smooth(v):v=clamp(v);return v*v*(3-2*v)
def mix(a,b,v):return a+(b-a)*v
def text(im,s,x,y,size=50,color=WHITE,bold=False,center=False,mono=False):
    d=ImageDraw.Draw(im);f=font(size,bold,mono)
    if '→' in s:
        f=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',size)
    if center:x-=d.textlength(s,font=f)/2
    d.text((int(x),int(y)),s,font=f,fill=color,stroke_width=0)
def rect(im,box,fill=PANEL,outline='#303236',radius=24,width=2):
    ImageDraw.Draw(im).rounded_rectangle(tuple(int(v) for v in box),radius,fill=fill,outline=outline,width=width)
def line(im,pts,fill=SILVER,width=3):ImageDraw.Draw(im).line([(int(x),int(y)) for x,y in pts],fill=fill,width=width,joint='curve')
def envelope(im,x,y,s=100,color=WHITE):
    rect(im,(x,y,x+s,y+s*.69),fill=None,outline=color,radius=int(s*.12),width=max(2,int(s*.045)))
    line(im,[(x+4,y+8),(x+s*.5,y+s*.37),(x+s-4,y+8)],color,max(2,int(s*.04)))
def pill(im,s,x,y,w=None,light=False,size=24):
    w=w or ImageDraw.Draw(im).textlength(s,font=font(size))+44
    rect(im,(x,y,x+w,y+54),WHITE if light else '#191B1E', '#44464A',27)
    f=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',size) if '→' in s else font(size)
    bb=f.getbbox(s)
    text(im,s,x+w/2,y+(54-(bb[3]-bb[1]))/2-bb[1],size,INK if light else SILVER,center=True)
def check(im,x,y,s=20,color=WHITE):line(im,[(x,y+s*.5),(x+s*.4,y+s*.9),(x+s,y)],color,3)
def layer(im,layer,x=0,y=0,alpha=1,scale=1):
    if scale!=1:layer=layer.resize((max(1,int(layer.width*scale)),max(1,int(layer.height*scale))),Image.Resampling.LANCZOS)
    if alpha<1:layer=layer.copy();layer.putalpha(layer.getchannel('A').point(lambda p:int(p*clamp(alpha))))
    im.alpha_composite(layer,(int(x),int(y)))
def reveal(im,s,x,y,u,size=100,color=WHITE,bold=True,center=False):
    # One phrase enters as a single composition, never letter-by-letter.
    a=ease(u/.65);l=Image.new('RGBA',(W,260));text(l,s,x,10,size,color,bold,center)
    layer(im,l,0,y-10+(1-a)*55,a)
def base(t,light=False):
    im=Image.new('RGBA',(W,H),WHITE if light else INK);d=ImageDraw.Draw(im)
    # Very quiet technical grid, keeping a large field around the hero text.
    c='#E7E9E9' if light else '#151719'
    off=int(t*10)%120
    for x in range(-120,W+120,120):d.line((x+off,0,x+off,H),fill=c,width=1)
    for y in range(0,H,120):d.line((0,y,W,y),fill=c,width=1)
    return im
def furniture(im,t,section,light=False):
    c=INK if light else WHITE;mut='#686E77' if light else GRAY
    text(im,'Lumail',85,55,36,c,True)
    d=ImageDraw.Draw(im);label=section.upper();text(im,label,W-85-d.textlength(label,font=font(20,mono=True)),65,20,mut,mono=True)
    line(im,[(85,1000),(1835,1000)],'#D9DDDE' if light else '#25282D',2)
    line(im,[(85,1000),(85+1750*t/45,1000)],c,3)
    text(im,'EMAIL, WITH MOMENTUM.',85,1021,17,mut,mono=True)
    text(im,f'{int(t):02d} / 45',1710,1021,17,mut,mono=True)
def editor_card():
    im=Image.new('RGBA',(1020,620));rect(im,(0,0,1018,618),'#F7F8F8','#5B6066',30)
    text(im,'New campaign',42,30,25,INK,True);pill(im,'Draft',835,20,135,size=20)
    line(im,[(0,86),(1020,86)],'#DEE1E3',2)
    text(im,'To',44,116,22,'#6A7078');text(im,'Your audience',160,114,24,INK)
    text(im,'Subject',44,175,22,'#6A7078');text(im,'Something worth opening.',160,173,28,INK,True)
    line(im,[(40,228),(975,228)],'#DEE1E3',2)
    text(im,'Hey {{ first_name }},',55,268,28,INK)
    text(im,'Your next big thing starts here.',55,327,39,INK,True)
    text(im,'A new idea. A thoughtful email. A real connection.',55,399,26,'#5E6670')
    rect(im,(55,477,370,548),INK,INK,14);text(im,'Take a look  →',212,496,26,WHITE,True,True)
    text(im,'Your words. Your voice.',680,557,21,'#6A7078')
    return im
EDITOR=editor_card()
def frame(t):
    if t<5:
        u=t;im=base(t)
        # Inbox fragments stream by and collapse into the hero line.
        for j,s in enumerate(['ANOTHER TEMPLATE','ANOTHER SETTING','ANOTHER TAB']):
            a=1-smooth((u-2.3)/.65);x=145+j*555;yy=185+math.sin(u*1.4+j)*18
            l=Image.new('RGBA',(510,126));rect(l,(0,0,505,120),'#141619','#32363B',18)
            envelope(l,24,31,65,GRAY);text(l,s,117,48,22,GRAY,mono=True)
            layer(im,l,x+(1-a)*(x-960),yy,a)
        reveal(im,'Your next email.',960,407,u-.2,118,center=True)
        reveal(im,'Without the busywork.',960,554,u-.8,112,center=True)
        text(im,'Less friction. More connection.',960,745,32,GRAY,center=True)
        furniture(im,t,'A better way to email')
    elif t<9:
        u=t-5;im=base(t);d=ImageDraw.Draw(im)
        for j in range(3):
            r=155+j*96+ease(u/1.2)*90
            d.ellipse((960-r,410-r,960+r,410+r),outline='#34383E',width=2)
        # Mail packets travel around the brand as one concentric system.
        for j in range(10):
            a=j*math.tau/10+u*.4;r=235+(j%2)*100
            x=960+math.cos(a)*r;y=410+math.sin(a)*r*.6
            rect(im,(x-10,y-10,x+10,y+10),SILVER,SILVER,5)
        reveal(im,'Lumail',960,316,u,170,center=True)
        reveal(im,'Fall in love with email again.',960,694,u-.5,55,center=True)
        pill(im,'AI-POWERED EMAIL MARKETING',705,806,510,size=22)
        furniture(im,t,'Meet Lumail')
    elif t<16:
        u=t-9;im=base(t)
        reveal(im,'Write the email.',100,210,u,86)
        reveal(im,'Keep your voice.',100,316,u-.35,78,GRAY)
        text(im,'A document-like editor.',105,485,30,SILVER)
        text(im,'AI help when you want it.',105,535,30,SILVER)
        pill(im,'YOUR IDEAS, READY TO SEND',103,645,535,size=21)
        a=ease(u/.9);sc=mix(.91,1,a)+math.sin(u*.5)*.005
        layer(im,EDITOR,815+(1-a)*340,255+(1-a)*80,1,sc)
        if u>1.2:
            tip=Image.new('RGBA',(470,90));rect(tip,(0,0,468,88),'#24282C','#666C75',18)
            text(tip,'✦' if False else '+',27,21,32,WHITE);text(tip,'Polish this paragraph',83,29,25,WHITE)
            layer(im,tip,1210,741+(1-ease((u-1.2)/.5))*50,ease((u-1.2)/.5))
        furniture(im,t,'01 / Create')
    elif t<23:
        u=t-16;im=base(t)
        reveal(im,'Your AI.',105,195,u,105)
        reveal(im,'Your email team.',105,320,u-.25,92)
        text(im,'Draft. Segment. Schedule.',108,525,32,SILVER)
        pill(im,'ChatGPT',105,639,200);pill(im,'Claude',324,639,180);pill(im,'Codex',523,639,180)
        terminal=Image.new('RGBA',(970,650));rect(terminal,(0,0,968,648),'#111316','#454A52',24)
        text(terminal,'lumail / agent',35,30,23,GRAY,mono=True)
        line(terminal,[(30,83),(937,83)],'#35393E',2)
        text(terminal,'Launch my next campaign.',40,128,39,WHITE,True)
        steps=[('Campaign drafted','Your voice, preserved'),('Audience selected','The right people'),('Schedule prepared','Ready for your review')]
        for j,(a,b) in enumerate(steps):
            prog=ease((u-.8-j*.8)/.5);yy=235+j*98
            if prog>0:
                check(terminal,42,yy+12,22);text(terminal,a,95,yy,28,WHITE,True);text(terminal,b,95,yy+40,22,GRAY)
        if u>3.2:
            pill(terminal,'You keep the final click.  →',38,555,894,True,24)
        layer(im,terminal,858+(1-ease(u/.7))*350,203, ease(u/.6))
        furniture(im,t,'02 / Connect')
    elif t<30:
        u=t-23;im=base(t)
        reveal(im,'One welcome.',960,170,u,87,center=True)
        reveal(im,'A thousand next steps.',960,275,u-.3,83,GRAY,center=True)
        # A real animated route: new subscriber → email → delay → branch.
        xs=[180,650,1120];yy=525
        for j in range(2):
            p=clamp((u-.6-j*.7)/.7);line(im,[(xs[j]+350,yy+90),(xs[j]+350+(120*p),yy+90)],SILVER,3)
        for j,(a,b) in enumerate([('Subscriber joins','Newsletter list'),('Send welcome','Hello, first_name'),('Wait 2 days','Then follow up')]):
            l=Image.new('RGBA',(352,182));rect(l,(0,0,350,180),'#17191C','#545A64',24)
            text(l,f'0{j+1}',25,25,23,GRAY,mono=True);text(l,a,25,75,29,WHITE,True);text(l,b,25,123,22,GRAY)
            layer(im,l,xs[j],yy+(1-ease((u-j*.25)/.6))*55,ease((u-j*.25)/.6))
        p=clamp((u-2)/1);line(im,[(1470,615),(1570,615),(1570,455),(1700,455)],'#505762',3)
        line(im,[(1570,615),(1570,805),(1700,805)],'#505762',3)
        pill(im,'Opened',1620,428,210);pill(im,'Follow-up',1620,778,230)
        # Animated packets visibly traverse the route.
        for j in range(3):
            x=530+((u*150+j*470)%1080);y=615
            if x>1570:y=615-(x-1570)*.6
            ImageDraw.Draw(im).ellipse((x-8,y-8,x+8,y+8),fill=WHITE)
        text(im,'Publish once. Let the sequence run.',960,857,34,SILVER,center=True)
        furniture(im,t,'03 / Automate')
    elif t<36:
        u=t-30;im=base(t,True)
        reveal(im,'Grow your list.',105,210,u,100,INK)
        reveal(im,'Keep your freedom.',105,329,u-.3,91,INK)
        text(im,'Pay for emails sent.',110,530,42,INK,True)
        text(im,'Unlimited subscribers.',110,598,38,'#68717B')
        # Subscriber dots stream into a growing list; the billing line stays fixed.
        rect(im,(1160,204,1815,800),'#EBEDEE','#BBC1C7',28)
        text(im,'YOUR AUDIENCE',1200,247,23,'#626B76',mono=True)
        count=int(50000*ease(u/3));text(im,f'{count:,}',1488,325,106,INK,True,True)
        text(im,'Room to grow.',1488,474,29,'#68717B',center=True)
        for j in range(32):
            col=j%8;row=j//8;x=1210+col*76;y=575+row*45
            ImageDraw.Draw(im).ellipse((x,y,x+16,y+16),fill='#A6AFBA' if j>int(u*9) else INK)
        text(im,'No per-contact charge.',1488,745,24,INK,center=True)
        text(im,'Illustrative audience',1488,836,18,'#787E86',center=True)
        furniture(im,t,'04 / Scale',True)
    elif t<40:
        u=t-36;im=base(t)
        reveal(im,'One domain.',960,183,u,105,center=True)
        reveal(im,'Every kind of email.',960,303,u-.2,90,GRAY,center=True)
        for j,(a,b) in enumerate([('Marketing','Newsletters & launches'),('Transactional','Receipts & login codes')]):
            x=355+j*625;y=550;rect(im,(x,y,x+580,y+235),'#171A1D','#4D535D',24)
            envelope(im,x+34,y+45,90);text(im,a,x+163,y+45,40,WHITE,True);text(im,b,x+35,y+160,29,SILVER)
        p=ease(u/.8);line(im,[(960,447),(960,505)],WHITE,3)
        line(im,[(645,505),(1270,505)],WHITE,3)
        text(im,'Campaigns. Sequences. Transactional.',960,869,31,SILVER,center=True)
        furniture(im,t,'One platform')
    else:
        u=t-40;im=base(t);d=ImageDraw.Draw(im)
        for j in range(3):
            r=240+j*70+u*8;d.ellipse((960-r,440-r,960+r,440+r),outline='#252A30',width=2)
        reveal(im,'Lumail',960,216,u,154,center=True)
        reveal(im,'Make your next send count.',960,425,u-.2,77,center=True)
        pill(im,'Start free  →  lumail.io',643,633,634,True,35)
        text(im,'3,000 emails / month. No card required.',960,764,30,SILVER,center=True)
        furniture(im,t,'Your next chapter')
    # Short directional wipes bridge scenes, with readable holds between transitions.
    for cut in [5,9,16,23,30,36,40]:
        dt=t-cut
        if -.16<dt<.25:
            p=(dt+.16)/.41;x=int(mix(-W,W,ease(p)))
            ImageDraw.Draw(im).polygon([(x,0),(x+W*.7,0),(x+W*.55,H),(x-W*.15,H)],fill=WHITE if cut!=36 else INK)
    return im.convert('RGB')

def soundtrack():
    sr=48000;tt=np.arange(sr*45)/sr;audio=np.zeros((len(tt),2),np.float64);rng=np.random.default_rng(7)
    # Soft wide pads, in A minor; original composition.
    chords=[(110,164.81,220,261.63),(87.31,130.81,174.61,220),(130.81,196,261.63,329.63),(98,146.83,196,246.94)]
    for k,start in enumerate(np.arange(0,45,4.285714)):
        dur=min(5.2,45-start);idx=int(start*sr);n=int(dur*sr);a=np.arange(n)/sr
        env=np.minimum(a/.5,1)*np.minimum((dur-a)/.8,1)
        for j,f in enumerate(chords[k%4]):
            for c in range(2):audio[idx:idx+n,c]+=.034*env*(np.sin(2*np.pi*(f+(c-.5)*.32)*a)+.25*np.sin(2*np.pi*f*2*a))
    beat=60/112
    for k,start in enumerate(np.arange(0,44,beat)):
        idx=int(start*sr);n=min(int(sr*.35),len(tt)-idx);a=np.arange(n)/sr
        strength=.105 if k%4==0 else .068
        kick=strength*np.sin(2*np.pi*(48*a+5*(1-np.exp(-a*35))))*np.exp(-a*20)
        audio[idx:idx+n,:]+=kick[:,None]
        if k%2:
            noise=rng.normal(0,1,n);sn=.037*noise*np.exp(-a*38)
            audio[idx:idx+n,:]+=sn[:,None]
        n=min(int(sr*.08),len(tt)-idx);a=np.arange(n)/sr
        hats=np.diff(rng.normal(0,1,n+1))*.008*np.exp(-a*75)
        audio[idx:idx+n,k%2]+=hats
    # A small plucked melody, syncopated and wide.
    notes=[440,523.25,659.25,783.99,659.25,523.25,392,329.63]
    for k,start in enumerate(np.arange(5,40,beat/2)):
        idx=int(start*sr);n=min(int(sr*.5),len(tt)-idx);a=np.arange(n)/sr;f=notes[k%8]
        pluck=.027*(np.sin(2*np.pi*f*a)+.25*np.sin(2*np.pi*f*2*a))*np.exp(-a*10)
        audio[idx:idx+n,k%2]+=pluck
        delay=int(.16*sr)
        if idx+delay+n<len(tt):audio[idx+delay:idx+delay+n,1-k%2]+=pluck*.3
    for cut in [5,9,16,23,30,36,40]:
        start=cut-.22;idx=int(start*sr);n=int(.5*sr);a=np.linspace(0,1,n)
        woosh=np.diff(rng.normal(0,1,n+1))*.02*np.sin(np.pi*a)**2
        audio[idx:idx+n,0]+=woosh*(1-a);audio[idx:idx+n,1]+=woosh*a
    audio*=np.minimum(tt/1.2,1)[:,None]*np.minimum((45-tt)/1.3,1)[:,None]
    audio=np.tanh(audio*1.5)*.8
    with wave.open('soundtrack.wav','wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((audio*32767).astype('<i2').tobytes())

if __name__=='__main__':
    soundtrack()
    frame(42).save('poster.jpg',quality=95)
    samples=[frame(t).resize((640,360)) for t in [2,7,12,19,26,33,38,43]]
    sheet=Image.new('RGB',(2560,720))
    for j,img in enumerate(samples):sheet.paste(img,((j%4)*640,(j//4)*360))
    sheet.save('storyboard.jpg',quality=95)
    cmd=['ffmpeg','-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','pipe:0','-i','soundtrack.wav','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-af','loudnorm=I=-16:TP=-1.5:LRA=8','-t','45','-movflags','+faststart','video.mp4']
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for i in range(FPS*DURATION):
            p.stdin.write(frame(i/FPS).tobytes())
            if i%150==0:print(f'Rendered {i}/{FPS*DURATION} frames',flush=True)
        p.stdin.close();code=p.wait()
        if code:raise RuntimeError(f'Encoder exited {code}')
    except Exception:
        p.kill();raise
    print('video.mp4 complete',flush=True)
