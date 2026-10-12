"""Dependency-free Lumail motion film. Native CoreGraphics + CoreText, FFmpeg.

Render: python3 render.py
Still:  python3 render.py --stills
All animation is deterministic and authored on a 1920 × 1080 canvas.
"""
import ctypes as C
import math
import os
import random
import subprocess
import sys
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parent
W, H, FPS, DURATION = 1920, 1080, 60, 45
NAVY = '#152538'
CREAM = '#F8F5ED'
ORANGE = '#ED7438'
INK = '#172638'
MUTED = '#7B8490'
LINE = '#E2E1DA'
WHITE = '#FFFFFF'
PEACH = '#F6DCC9'
GREEN = '#477C60'

class Point(C.Structure):
    _fields_ = [('x', C.c_double), ('y', C.c_double)]
class Size(C.Structure):
    _fields_ = [('w', C.c_double), ('h', C.c_double)]
class Rect(C.Structure):
    _fields_ = [('origin', Point), ('size', Size)]

cg = C.CDLL('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
cf = C.CDLL('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
ct = C.CDLL('/System/Library/Frameworks/CoreText.framework/CoreText')
io = C.CDLL('/System/Library/Frameworks/ImageIO.framework/ImageIO')
ptr, dbl, lng = C.c_void_p, C.c_double, C.c_long

def bind(lib, name, result, *args):
    f = getattr(lib, name)
    f.restype, f.argtypes = result, list(args)
    return f

space = bind(cg, 'CGColorSpaceCreateDeviceRGB', ptr)()
bitmap = bind(cg, 'CGBitmapContextCreate', ptr, ptr, C.c_size_t, C.c_size_t, C.c_size_t, C.c_size_t, ptr, C.c_uint)
buffer = (C.c_ubyte * (W * H * 4))()
ctx = bitmap(buffer, W, H, 8, W*4, space, 0x4001)
if not ctx:
    raise RuntimeError('Could not create CoreGraphics bitmap')
save = bind(cg, 'CGContextSaveGState', None, ptr)
restore = bind(cg, 'CGContextRestoreGState', None, ptr)
translate = bind(cg, 'CGContextTranslateCTM', None, ptr, dbl, dbl)
scale = bind(cg, 'CGContextScaleCTM', None, ptr, dbl, dbl)
rotate = bind(cg, 'CGContextRotateCTM', None, ptr, dbl)
alpha = bind(cg, 'CGContextSetAlpha', None, ptr, dbl)
fillrgb = bind(cg, 'CGContextSetRGBFillColor', None, ptr, dbl, dbl, dbl, dbl)
strokergb = bind(cg, 'CGContextSetRGBStrokeColor', None, ptr, dbl, dbl, dbl, dbl)
fillrect = bind(cg, 'CGContextFillRect', None, ptr, Rect)
ellipse = bind(cg, 'CGContextFillEllipseInRect', None, ptr, Rect)
begin = bind(cg, 'CGContextBeginPath', None, ptr)
move = bind(cg, 'CGContextMoveToPoint', None, ptr, dbl, dbl)
lineto = bind(cg, 'CGContextAddLineToPoint', None, ptr, dbl, dbl)
curve = bind(cg, 'CGContextAddCurveToPoint', None, ptr, dbl, dbl, dbl, dbl, dbl, dbl)
close = bind(cg, 'CGContextClosePath', None, ptr)
fillpath = bind(cg, 'CGContextFillPath', None, ptr)
strokepath = bind(cg, 'CGContextStrokePath', None, ptr)
linewidth = bind(cg, 'CGContextSetLineWidth', None, ptr, dbl)
linecap = bind(cg, 'CGContextSetLineCap', None, ptr, C.c_int)
cliprect = bind(cg, 'CGContextClipToRect', None, ptr, Rect)
roundedpath = bind(cg, 'CGPathCreateWithRoundedRect', ptr, Rect, dbl, dbl, ptr)
addpath = bind(cg, 'CGContextAddPath', None, ptr, ptr)
releasepath = bind(cg, 'CGPathRelease', None, ptr)
shadowset = bind(cg, 'CGContextSetShadowWithColor', None, ptr, Size, dbl, ptr)
colorcreate = bind(cg, 'CGColorCreateGenericRGB', ptr, dbl, dbl, dbl, dbl)
colorrelease = bind(cg, 'CGColorRelease', None, ptr)
imagecreate = bind(cg, 'CGBitmapContextCreateImage', ptr, ptr)
drawimage = bind(cg, 'CGContextDrawImage', None, ptr, Rect, ptr)
releaseimage = bind(cg, 'CGImageRelease', None, ptr)
flush = bind(cg, 'CGContextFlush', None, ptr)
stringcreate = bind(cf, 'CFStringCreateWithCString', ptr, ptr, C.c_char_p, C.c_uint)
dictionarycreate = bind(cf, 'CFDictionaryCreate', ptr, ptr, C.POINTER(ptr), C.POINTER(ptr), lng, ptr, ptr)
numbercreate = bind(cf, 'CFNumberCreate', ptr, ptr, C.c_int, ptr)
release = bind(cf, 'CFRelease', None, ptr)
fontcreate = bind(ct, 'CTFontCreateWithName', ptr, ptr, dbl, ptr)
attrcreate = bind(cf, 'CFAttributedStringCreate', ptr, ptr, ptr, ptr)
linecreate = bind(ct, 'CTLineCreateWithAttributedString', ptr, ptr)
linedraw = bind(ct, 'CTLineDraw', None, ptr, ptr)
linewidthget = bind(ct, 'CTLineGetTypographicBounds', dbl, ptr, ptr, ptr, ptr)
textpos = bind(cg, 'CGContextSetTextPosition', None, ptr, dbl, dbl)
fontkey = ptr.in_dll(ct, 'kCTFontAttributeName')
colorkey = ptr.in_dll(ct, 'kCTForegroundColorAttributeName')
kernkey = ptr.in_dll(ct, 'kCTKernAttributeName')
translate(ctx, 0, H)
scale(ctx, 1, -1)
linecap(ctx, 1)

def rect(x, y, w, h):
    return Rect(Point(x,y), Size(w,h))
def rgb(hexcolor):
    return tuple(int(hexcolor[i:i+2],16)/255 for i in (1,3,5))
def color(c, a=1, stroke=False):
    (strokergb if stroke else fillrgb)(ctx, *rgb(c), a)
def box(x,y,w,h,c,r=0,a=1):
    color(c,a)
    if r:
        p = roundedpath(rect(x,y,w,h),r,r,None)
        begin(ctx); addpath(ctx,p); fillpath(ctx); releasepath(p)
    else:
        fillrect(ctx,rect(x,y,w,h))
def circle(x,y,r,c,a=1):
    color(c,a); ellipse(ctx,rect(x-r,y-r,2*r,2*r))
def stroke(points,c=INK,width=3,a=1):
    begin(ctx); move(ctx,*points[0])
    for p in points[1:]: lineto(ctx,*p)
    color(c,a,True); linewidth(ctx,width); strokepath(ctx)
def bezier(p0,p1,p2,p3,c=ORANGE,width=4,a=1):
    begin(ctx); move(ctx,*p0); curve(ctx,*p1,*p2,*p3)
    color(c,a,True); linewidth(ctx,width); strokepath(ctx)
def poly(points,c,a=1):
    begin(ctx); move(ctx,*points[0])
    for p in points[1:]: lineto(ctx,*p)
    close(ctx); color(c,a); fillpath(ctx)

fonts, lines = {}, {}
def text(s,x,y,size=40,c=INK,font='sans',align='left',kern=0):
    key=(s,size,c,font,kern)
    if key not in lines:
        family={'sans':'HelveticaNeue','bold':'HelveticaNeue-Bold','serif':'TimesNewRomanPS-ItalicMT','mono':'Menlo-Regular'}[font]
        fk=(family,size)
        if fk not in fonts:
            name=stringcreate(None,family.encode(),0x08000100)
            fonts[fk]=fontcreate(name,size,None); release(name)
        cgcolor=colorcreate(*rgb(c),1)
        kv=C.c_double(kern); kn=numbercreate(None,13,C.byref(kv))
        ks=(ptr*3)(fontkey,colorkey,kernkey)
        vs=(ptr*3)(fonts[fk],cgcolor,kn)
        attrs=dictionarycreate(None,ks,vs,3,None,None)
        ss=stringcreate(None,s.encode(),0x08000100)
        attributed=attrcreate(None,ss,attrs)
        ll=linecreate(attributed)
        lines[key]=(ll,linewidthget(ll,None,None,None))
        for obj in (attributed,ss,attrs,kn,cgcolor): release(obj)
    ll,tw=lines[key]
    if align=='center': x-=tw/2
    if align=='right': x-=tw
    save(ctx); translate(ctx,x,y+size*.84); scale(ctx,1,-1); textpos(ctx,0,0); linedraw(ll,ctx); restore(ctx)
    return tw

def clamp(x): return max(0,min(1,x))
def ease(x): return 1-(1-clamp(x))**4
def smooth(x): x=clamp(x); return x*x*(3-2*x)
def mix(a,b,p): return a+(b-a)*p
def group(x,y,s=1,a=1,angle=0):
    save(ctx); alpha(ctx,clamp(a)); translate(ctx,x,y); scale(ctx,s,s)
    if angle: rotate(ctx,angle)
def end(): restore(ctx)
def enter(t,delay=0,d=.7): return ease((t-delay)/d)
def shadow():
    cc=colorcreate(0.03,.06,.10,.13)
    shadowset(ctx,Size(0,18),44,cc); colorrelease(cc)
def unshadow(): shadowset(ctx,Size(0,0),0,None)
def card(x,y,w,h,r=22,fill=WHITE,border=True):
    save(ctx); shadow(); box(x,y,w,h,fill,r); restore(ctx)
    if border:
        p=roundedpath(rect(x+.5,y+.5,w-1,h-1),r,r,None)
        begin(ctx); addpath(ctx,p); color(LINE,.65,True); linewidth(ctx,1); strokepath(ctx); releasepath(p)
def pill(s,x,y,fill=WHITE,c=INK,size=22,pad=22):
    w=text_width(s,size)
    box(x,y,w+pad*2,size+28,fill,(size+28)/2)
    text(s,x+pad,y+13,size,c)
    return w+pad*2
def text_width(s,size=22):
    return len(s)*size*.50

def envelope(x,y,s=1,c=ORANGE,angle=0,fill=True):
    group(x,y,s,angle=angle)
    if fill:
        box(-56,-39,112,78,c,17)
        stroke([(-45,-26),(0,9),(45,-26)],CREAM,6)
    else:
        p=roundedpath(rect(-56,-39,112,78),14,14,None)
        begin(ctx); addpath(ctx,p); color(c,1,True); linewidth(ctx,5); strokepath(ctx); releasepath(p)
        stroke([(-45,-26),(0,9),(45,-26)],c,5)
    end()
def logo(x,y,size=38,c=INK):
    envelope(x+size*.48,y+size*.49,size/115)
    text('Lumail',x+size*1.25,y,size,c,'bold',kern=-size*.04)
def check(x,y,size=20,c=GREEN): stroke([(x,y+size*.5),(x+size*.35,y+size*.85),(x+size,y)],c,3)
def spark(x,y,s=18,c=ORANGE):
    poly([(x,y-s),(x+s*.28,y-s*.28),(x+s,y),(x+s*.28,y+s*.28),(x,y+s),(x-s*.28,y+s*.28),(x-s,y),(x-s*.28,y-s*.28)],c)
def arrow(x,y,s=25,c=INK):
    stroke([(x-s,y),(x+s,y)],c,3)
    stroke([(x+s*.5,y-s*.5),(x+s,y),(x+s*.5,y+s*.5)],c,3)
def label(s,x=110,y=150,c=MUTED): text(s.upper(),x,y,20,c,'mono',kern=2)
def dots(c=INK,a=.055,step=38):
    for y in range(28,H,step):
        for x in range(28,W,step): circle(x,y,1.1,c,a)
def frame_logo(dark=False):
    logo(105,66,37,CREAM if dark else INK)
    text('EMAIL, IN A BETTER LIGHT.',1810,78,16,'#A6B2BE' if dark else MUTED,'mono','right',1.2)
def baseline(s,dark=False):
    text(s,110,1000,18,'#A8B2BE' if dark else MUTED,'mono',kern=.8)
    text('lumail.io',1810,1000,19,CREAM if dark else INK,'mono','right')

def scene_hook(t):
    box(0,0,W,H,CREAM); dots()
    frame_logo(); baseline('A LITTLE LESS WORK. A LOT MORE POSSIBILITY.')
    p=enter(t,.1,.9)
    group(960,540,mix(.94,1,p),p)
    text('Email marketing.',0,-244,133,INK,'bold','center',-5)
    text('With a little more',0,-82,113,INK,'bold','center',-4)
    text('magic.',0,58,178,ORANGE,'serif','center',-4)
    end()
    q=enter(t,.45)
    envelope(165+math.sin(t)*18,568+math.cos(t*1.3)*22,1.4*q,ORANGE,-.19)
    envelope(1750+math.cos(t)*10,375+math.sin(t*1.3)*16,.95*q,NAVY,.16)
    spark(1568,734,26*max(.7,q),ORANGE)
    spark(367,325,17*q,NAVY)
    bezier((1370,848),(1450,844),(1470,768),(1438,742),ORANGE,3)

def scene_brand(t):
    box(0,0,W,H,NAVY); dots(CREAM,.06)
    p=enter(t,0,.8)
    # Open, architectural rings behind the mark.
    for i in range(6):
        r=245+i*66+t*9
        begin(ctx)
        # Arc-like cubic path feels directional without spinning type.
        move(ctx,960-r,560)
        curve(ctx,960-r,560-r*.8,960+r,560-r*.8,960+r,560)
        color(ORANGE,.08+i*.008,True); linewidth(ctx,2); strokepath(ctx)
    group(960,537,mix(.86,1,p),p)
    envelope(-475,-4,2.65,ORANGE)
    text('Lumail',-270,-159,290,CREAM,'bold',kern=-13)
    end()
    q=enter(t,.45)
    group(960,765,1,q)
    text('Meet your unfair advantage.',0,0,42,CREAM,'sans','center',-.6)
    end()
    text('AI-POWERED EMAIL MARKETING',960,200,21,'#C6CDD4','mono','center',3)
    text('WRITE  /  AUTOMATE  /  GROW',960,931,20,'#C6CDD4','mono','center',2)

def editor_card(t):
    card(0,0,920,640)
    box(0,0,920,66,'#FCFCF9',22)
    box(0,40,920,26,'#FCFCF9')
    circle(27,34,5,'#D4D9DC');circle(45,34,5,'#D4D9DC');circle(63,34,5,'#D4D9DC')
    text('Campaign editor',95,23,22,INK,'bold')
    pill('Draft',796,13,'#F1F2EE',MUTED,18,16)
    stroke([(0,66),(920,66)],LINE,1)
    text('Subject',42,99,19,MUTED)
    text('Something good is landing.',42,132,36,INK,'bold',kern=-1)
    stroke([(40,192),(880,192)],LINE,1)
    text('Hey',48,226,28,INK)
    box(112,215,185,43,'#F8E7DA',8)
    text('{{first_name}}',125,224,23,'#B55427','mono')
    text(',',304,226,28,INK)
    q=enter(t,1.7,.6)
    old='We have some news to share with you.'
    new='Your next big thing starts here.'
    if q<.5:
        box(40,293,810*q*2,50,'#FFE5CB',7)
        text(old,48,302,29,INK)
    else:
        box(40,293,810*(2-2*q),50,'#FFE5CB',7)
        text(new,48,302,31,INK,'bold')
    text('Built for people who write, ship and sell.',48,370,26,INK)
    text('A fresh idea. A simple email. A real connection.',48,410,26,INK)
    box(48,486,202,58,ORANGE,12)
    text('Take a look',76,500,23,WHITE,'bold');arrow(216,514,11,WHITE)
    text('Preview before you send',48,590,18,MUTED)
    check(866,596,16)
    a=enter(t,.8)
    group(435,558+mix(50,0,a),1,a)
    card(0,0,505,91,17,NAVY,False)
    spark(40,46,16)
    text('Make it punchier. Keep my voice.',72,29,23,CREAM)
    end()

def scene_editor(t):
    box(0,0,W,H,CREAM); frame_logo(); baseline('YOUR VOICE, WITH A LITTLE HELP.')
    label('01 / WRITE')
    p=enter(t,0,.8)
    group(110,325+mix(65,0,p),1,p)
    text('Your words.',0,0,104,INK,'bold',kern=-4)
    text('Your voice.',0,126,104,INK,'bold',kern=-4)
    text('AI on your side.',0,254,86,ORANGE,'serif',kern=-2)
    text('Write naturally. Polish in a prompt.',0,424,27,MUTED)
    end()
    q=enter(t,.1,.9)
    group(910+mix(420,0,q),235,mix(.94,1,q),q)
    editor_card(t);end()

def agent_card(t):
    card(0,0,1060,600,24,'#203246',False)
    circle(36,36,7,ORANGE)
    text('Lumail × your AI agent',62,24,22,CREAM,'bold')
    stroke([(0,78),(1060,78)],'#37485A',1)
    label('YOU',42,114,'#AAB5C0')
    text('Draft a launch email for my',42,159,39,CREAM,'sans',kern=-.6)
    text('early-access list.',42,207,39,CREAM,'sans',kern=-.6)
    steps=[('Audience selected','early-access'),('Launch email drafted','Your voice, preserved'),('Ready for your review','You keep the last click')]
    for i,(s,sub) in enumerate(steps):
        p=enter(t,.7+i*.52,.42)
        yy=305+i*84
        group(42,yy+mix(18,0,p),1,p)
        circle(16,23,16,'#426C56')
        check(8,17,16,'#DDE8D9')
        text(s,48,0,26,CREAM,'bold')
        text(sub,48,37,20,'#A6B4C2')
        end()
    p=enter(t,2.4,.6)
    group(690,493,mix(.94,1,p),p)
    box(0,0,314,67,ORANGE,12)
    text('Review draft',35,19,26,WHITE,'bold');arrow(272,34,12,WHITE)
    end()

def scene_agent(t):
    box(0,0,W,H,NAVY); dots(CREAM,.035); frame_logo(True);baseline('ASK FOR THE WORK. KEEP THE FINAL SAY.',True)
    label('02 / CONNECT',110,160,'#AAB5C0')
    p=enter(t,0,.8)
    group(110,328+mix(55,0,p),1,p)
    text('One prompt.',0,0,101,CREAM,'bold',kern=-4)
    text('A whole',0,123,101,CREAM,'bold',kern=-4)
    text('campaign.',0,242,114,ORANGE,'serif',kern=-2)
    text('The agent you already work with.',0,416,26,'#AFBDC9')
    end()
    q=enter(t,.1,.9)
    group(770+mix(380,0,q),245,mix(.95,1,q),q)
    agent_card(t);end()

def flow_node(x,y,w,title,subtitle,kind='email',active=False):
    card(x,y,w,103,16,WHITE)
    box(x+17,y+21,59,59,ORANGE if active else '#F4E9DF',13)
    if kind=='email': envelope(x+47,y+51,.33,WHITE if active else ORANGE)
    elif kind=='clock':
        cc=WHITE if active else ORANGE
        circle(x+47,y+51,17,cc)
        stroke([(x+47,y+40),(x+47,y+51),(x+55,y+56)],ORANGE if active else WHITE,3)
    else: spark(x+47,y+51,16,WHITE if active else ORANGE)
    text(title,x+94,y+23,23,INK,'bold')
    text(subtitle,x+94,y+59,19,MUTED)

def scene_flow(t):
    box(0,0,W,H,CREAM); dots(INK,.045);frame_logo();baseline('WELCOME. LAUNCH. FOLLOW UP. REPEAT.')
    label('03 / AUTOMATE')
    p=enter(t,0,.8)
    group(110,327+mix(65,0,p),1,p)
    text('Set it',0,0,125,INK,'bold',kern=-5)
    text('in motion.',0,141,125,INK,'bold',kern=-5)
    text('Let it run.',0,292,114,ORANGE,'serif',kern=-2)
    text('Sequences that keep working for you.',0,465,26,MUTED)
    end()
    q=enter(t,.1,.8)
    group(960+mix(400,0,q),191,1,q)
    text('Welcome sequence',70,0,27,INK,'bold')
    pill('Live',571,-2,'#E3ECDF',GREEN,19,17)
    paths=[[(362,151),(362,200)],[(362,303),(362,352)],[(362,455),(362,492)],[(362,595),(362,638),(145,638),(145,678)],[(362,595),(362,638),(580,638),(580,678)]]
    for pts in paths: stroke(pts,'#D9DAD2',4)
    flow_node(145,48,435,'Tag added','newsletter','trigger',t<1.4)
    flow_node(145,200,435,'Send email','Welcome, start here','email',1.4<=t<2.7)
    flow_node(145,352,435,'Wait','2 days','clock',2.7<=t<3.9)
    card(211,492,303,103,16,WHITE)
    spark(245,544,14,ORANGE)
    text('Opened the email?',273,533,22,INK,'bold')
    pill('Yes',58,683,'#E3ECDF',GREEN,21,28)
    pill('No',545,683,'#F2E5DA','#A35A34',21,28)
    e=clamp((t-.4)/4.5)*600
    if e<450:
        circle(362,151+e,8,ORANGE);circle(362,151+e,18,ORANGE,.1)
    else:
        a=clamp((e-450)/150)
        circle(mix(362,145,a),638,8,ORANGE)
    end()

def email_mini(x,y,title,sub,s=1,c=ORANGE):
    group(x,y,s)
    card(-215,-60,430,120,18,WHITE)
    envelope(-164,0,.47,c)
    text(title,-115,-28,25,INK,'bold')
    text(sub,-115,10,20,MUTED)
    end()

def scene_unified(t):
    box(0,0,W,H,CREAM);frame_logo();baseline('ONE DOMAIN. ONE DASHBOARD. ONE BILL.')
    label('04 / SEND')
    p=enter(t,0,.8)
    group(110,328+mix(55,0,p),1,p)
    text('Newsletters.',0,0,108,INK,'bold',kern=-4)
    text('Login codes.',0,130,108,INK,'bold',kern=-4)
    text('One home.',0,272,112,ORANGE,'serif',kern=-2)
    text('Marketing + transactional email.',0,453,27,MUTED)
    end()
    q=enter(t,.1,.85)
    group(1325,555,mix(.85,1,q),q)
    for i in range(4):
        r=140+i*62
        # Rings are static framing; signal travels along the routes.
        ring=roundedpath(rect(-r,-r,2*r,2*r),r,r,None)
        begin(ctx); addpath(ctx,ring)
        color(ORANGE,.10-i*.012,True);linewidth(ctx,2);strokepath(ctx)
        releasepath(ring)
    bezier((-370,-206),(-335,-206),(-320,-25),(-98,0),ORANGE,4,.6)
    bezier((-98,0),(130,22),(189,204),(319,204),ORANGE,4,.6)
    circle(0,0,97,NAVY);envelope(0,0,1.1,ORANGE)
    email_mini(-169,-224,'Your next launch','Newsletter',.95)
    email_mini(152,234,'Your login code','482 019',.95,NAVY)
    # Two lanes, independent timing.
    for j in range(2):
        a=(t*.45+j*.5)%1
        xx=mix(-230,230,a); yy=205*math.sin((a-.5)*math.pi)
        circle(xx,yy,7,ORANGE)
    pill('Priority lane',5,123,NAVY,CREAM,20,20)
    end()

def infinity(x,y,size,c,width=18,phase=1):
    points=[]
    for i in range(int(360*phase)+1):
        a=i/360*2*math.pi
        points.append((x+size*math.cos(a)/(1+math.sin(a)**2),y+size*.72*math.sin(a)*math.cos(a)/(1+math.sin(a)**2)))
    if len(points)>1: stroke(points,c,width)

def scene_price(t):
    box(0,0,W,H,ORANGE);dots(NAVY,.055);frame_logo();baseline('PRICING THAT GROWS WITH WHAT YOU SEND.')
    label('05 / GROW',110,165,INK)
    p=enter(t,0,.85)
    group(110,339+mix(60,0,p),1,p)
    text('Grow your list.',0,0,130,INK,'bold',kern=-5)
    text('Not your bill.',0,159,136,CREAM,'serif',kern=-3)
    text('Unlimited subscribers.',0,379,36,INK,'bold',kern=-.5)
    text('Pay for emails sent.',0,433,36,INK,'sans',kern=-.5)
    end()
    q=enter(t,.15,1.3)
    group(1442,508,mix(.85,1,q),q)
    infinity(0,0,280,CREAM,25,q)
    text('UNLIMITED',0,172,20,INK,'mono','center',4)
    # Contact tiles in a quiet expanding orbit.
    for i in range(9):
        a=i/9*math.pi*2-.8
        r=345+math.sin(t*.6+i)*8
        xx=math.cos(a)*r;yy=math.sin(a)*r*.77
        save(ctx);alpha(ctx,.35+q*.55)
        box(xx-32,yy-32,64,64,CREAM,19)
        circle(xx,yy-7,10,ORANGE)
        box(xx-15,yy+7,30,13,ORANGE,6)
        restore(ctx)
    end()

def scene_free(t):
    box(0,0,W,H,NAVY);dots(CREAM,.045);frame_logo(True)
    p=enter(t,0,.85)
    group(960,533,mix(.91,1,p),p)
    text('3,000',0,-190,288,ORANGE,'bold','center',-13)
    text('free emails every month.',0,124,66,CREAM,'sans','center',-2)
    pill('No card required.',-122,251,'#28384A',CREAM,24,28)
    end()
    spark(365,410,36,ORANGE);spark(1560,693,27,ORANGE)
    text('YOUR NEXT CHAPTER STARTS FREE.',960,920,20,'#ADB7C2','mono','center',2)

def scene_end(t):
    box(0,0,W,H,CREAM);dots();frame_logo();baseline('FOR PEOPLE WHO WRITE, SHIP AND SELL.')
    p=enter(t,0,.9)
    group(110,294+mix(70,0,p),1,p)
    text('Love email.',0,0,154,INK,'bold',kern=-6)
    text('Launch with',0,170,139,INK,'bold',kern=-5)
    text('Lumail.',0,326,161,ORANGE,'serif',kern=-3)
    end()
    q=enter(t,.4,.9)
    group(1250,382,mix(.88,1,q),q)
    circle(165,141,202,PEACH)
    circle(165,141,162,NAVY)
    envelope(165,141,1.93,ORANGE,-.1+math.sin(t*.75)*.015)
    spark(363,-52,22,ORANGE);spark(-67,280,30,NAVY)
    bezier((-30,-35),(-80,-38),(-96,58),(-65,85),ORANGE,4)
    end()
    a=enter(t,.9,.8)
    group(1110,836+mix(45,0,a),1,a)
    box(0,0,690,94,ORANGE,17)
    text('Start free',34,26,37,WHITE,'bold')
    text('lumail.io',420,29,33,WHITE,'sans')
    arrow(642,47,17,WHITE)
    end()

SCENES=[(0,scene_hook),(4.5,scene_brand),(8,scene_editor),(14,scene_agent),(20,scene_flow),(26,scene_unified),(31.5,scene_price),(37,scene_free),(40.5,scene_end)]
def draw(t):
    save(ctx)
    alpha(ctx,1)
    start,func=SCENES[0]
    for b,f in SCENES:
        if t>=b: start,func=b,f
    func(t-start)
    # A single angled panel crosses each edit; the cut happens under full cover.
    for b,_ in SCENES[1:]:
        if abs(t-b)<.28:
            p=smooth((t-b+.28)/.56)
            xx=mix(-2600,2600,p)
            poly([(xx-180,0),(xx+2200,0),(xx+2380,H),(xx,H)],ORANGE)
    restore(ctx)
    flush(ctx)

def png(path):
    urlcreate=bind(cf,'CFURLCreateFromFileSystemRepresentation',ptr,ptr,C.c_char_p,lng,C.c_bool)
    destination=bind(io,'CGImageDestinationCreateWithURL',ptr,ptr,ptr,C.c_size_t,ptr)
    add=bind(io,'CGImageDestinationAddImage',None,ptr,ptr,ptr)
    finalize=bind(io,'CGImageDestinationFinalize',C.c_bool,ptr)
    target=str(path).encode()
    url=urlcreate(None,target,len(target),False)
    kind=stringcreate(None,b'public.png',0x08000100)
    dest=destination(url,kind,1,None)
    im=imagecreate(ctx);add(dest,im,None)
    if not finalize(dest): raise RuntimeError('PNG export failed')
    for obj in (dest,kind,url,im): release(obj)

def soundtrack(path):
    """Original 120 BPM score: warm pads, glass plucks, soft drums and edit foley."""
    sr=48000; n=sr*DURATION
    l=array('f',[0])*n; r=array('f',[0])*n
    rng=random.Random(83)
    def hz(note): return 440*2**((note-69)/12)
    def add(start,duration,synth,gain=1,pan=0):
        pos=int(start*sr); length=min(int(duration*sr),n-pos)
        gl=math.sqrt((1-pan)/2)*gain;gr=math.sqrt((1+pan)/2)*gain
        for j in range(length):
            tt=j/sr;v=synth(tt,duration)
            l[pos+j]+=v*gl;r[pos+j]+=v*gr
    chords=[[52,55,59,62],[48,52,55,59],[43,47,50,57],[50,54,57,64]]
    for k,start in enumerate(range(0,44,4)):
        for j,note in enumerate(chords[k%4]):
            f=hz(note)
            def pad(t,d,f=f):
                env=min(1,t/.65)*min(1,(d-t)/1.1)
                return env*(math.sin(2*math.pi*f*t)+.26*math.sin(2*math.pi*f*2.002*t))*.10
            add(start,5.2,pad,1,(j-1.5)*.38)
    for beat in range(16,83):
        start=beat*.5
        if beat%2==0:
            def kick(t,d):
                return math.sin(2*math.pi*(48*t+20*.04*(1-math.exp(-t/.04))))*math.exp(-t*19)*.30
            add(start,.30,kick)
        if beat%4==2:
            def clap(t,d): return rng.uniform(-1,1)*math.exp(-t*34)*.13
            add(start,.18,clap,1,.12)
        for half in (0,.25):
            def hat(t,d): return rng.uniform(-1,1)*math.exp(-t*110)*.045
            add(start+half,.055,hat,.7,-.2 if half==0 else .3)
        note=chords[int(start/4)%4][0]-12; f=hz(note)
        def bass(t,d,f=f):
            return (math.sin(2*math.pi*f*t)+.18*math.sin(4*math.pi*f*t))*min(1,t/.012)*math.exp(-t*6)*.18
        add(start,.42,bass)
    for k in range(0,170):
        start=k*.25
        if start<4.5 or (k%8 in (3,7)): continue
        note=chords[int(start/4)%4][[0,2,1,3,2,1,3,2][k%8]]+12
        f=hz(note)
        def pluck(t,d,f=f):
            e=min(1,t/.004)*math.exp(-t*8)
            return e*(math.sin(2*math.pi*f*t+.45*math.sin(2*math.pi*f*2*t)))*.105
        pan=math.sin(k)*.55
        add(start,.8,pluck,.75,pan)
        add(start+.1875,.8,pluck,.20,-pan)
        add(start+.375,.8,pluck,.09,pan)
    for start,_ in SCENES[1:]:
        def whoosh(t,d):
            e=math.sin(math.pi*t/d)**2
            return rng.uniform(-1,1)*e*.05
        add(start-.28,.6,whoosh)
    for start in (1,5,41.5):
        for j,note in enumerate((76,83,88)):
            f=hz(note)
            def chime(t,d,f=f): return math.sin(2*math.pi*f*t)*math.exp(-t*3)*.065
            add(start+j*.08,1.5,chime,1,(j-1)*.35)
    out=array('h')
    for i in range(n):
        tt=i/sr
        fade=min(1,tt/.4)*min(1,(DURATION-tt)/1.5)
        out.append(int(max(-.95,min(.95,math.tanh(l[i]*1.7)*fade))*32767))
        out.append(int(max(-.95,min(.95,math.tanh(r[i]*1.7)*fade))*32767))
    with wave.open(str(path),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes(out.tobytes())

def render():
    soundtrack(ROOT/'soundtrack.wav')
    print('Original soundtrack complete.',flush=True)
    cmd=['ffmpeg','-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgba','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','pipe:0','-i',str(ROOT/'soundtrack.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-af','loudnorm=I=-16:TP=-2:LRA=8','-ar','48000','-t',str(DURATION),'-movflags','+faststart','-metadata','title=Lumail — Email in a better light','-metadata','comment=Original Lumail launch motion film',str(ROOT/'video.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,cwd=ROOT)
    try:
        for frame in range(FPS*DURATION):
            draw(frame/FPS)
            proc.stdin.write(buffer)
            if frame%300==0: print(f'Frame {frame}/{FPS*DURATION}',flush=True)
        proc.stdin.close()
        if proc.wait()!=0: raise RuntimeError('FFmpeg export failed')
    finally:
        if proc.poll() is None: proc.terminate()
    print('Finished video.mp4',flush=True)

if __name__=='__main__':
    if '--stills' in sys.argv:
        (ROOT/'stills').mkdir(exist_ok=True)
        for t in (2.5,6,11.5,17.5,23.5,29,34.5,38.7,43.5):
            draw(t);png(ROOT/'stills'/f'{t:04.1f}.png')
        print('Nine scene stills exported.')
    else:
        render()
