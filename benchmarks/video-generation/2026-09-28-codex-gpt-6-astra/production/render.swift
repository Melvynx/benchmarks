import AppKit
import CoreGraphics
import Foundation
let W=1920, H=1080, fps=30
let black="#08090A", white="#F7F8F8", gray="#8A8F98", line="#303236"
let cs=CGColorSpaceCreateDeviceRGB()
let ctx=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:cs,bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
func color(_ hex:String)->CGColor { let s=hex.replacingOccurrences(of:"#",with:""); let n=UInt32(s,radix:16)!; return CGColor(red:CGFloat((n>>16)&255)/255,green:CGFloat((n>>8)&255)/255,blue:CGFloat(n&255)/255,alpha:1) }
func ease(_ x:Double)->Double { let p=max(0,min(1,x)); return 1-pow(1-p,4) }
func clamp(_ x:Double)->Double { max(0,min(1,x)) }
func box(_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ r:Double=0,_ fill:String=white,_ stroke:String?=nil) { let p=CGPath(roundedRect:CGRect(x:x,y:y,width:w,height:h),cornerWidth:r,cornerHeight:r,transform:nil);ctx.addPath(p);ctx.setFillColor(color(fill));ctx.fillPath(); if let s=stroke {ctx.addPath(p);ctx.setStrokeColor(color(s));ctx.setLineWidth(1.5);ctx.strokePath()} }
func path(_ pts:[(Double,Double)],_ c:String=white,_ width:Double=2) { guard let first=pts.first else{return};ctx.beginPath();ctx.move(to:CGPoint(x:first.0,y:first.1));for p in pts.dropFirst(){ctx.addLine(to:CGPoint(x:p.0,y:p.1))};ctx.setStrokeColor(color(c));ctx.setLineWidth(width);ctx.setLineCap(.round);ctx.setLineJoin(.round);ctx.strokePath() }
func circle(_ x:Double,_ y:Double,_ r:Double,_ c:String){ctx.setFillColor(color(c));ctx.fillEllipse(in:CGRect(x:x-r,y:y-r,width:2*r,height:2*r))}
func text(_ s:String,_ x:Double,_ y:Double,_ size:Double,_ c:String=white,_ bold:Bool=false,_ centered:Bool=false){let font=NSFont(name:bold ? "HelveticaNeue-Bold":"HelveticaNeue",size:size)!;let a=NSAttributedString(string:s,attributes:[.font:font,.foregroundColor:NSColor(cgColor:color(c))!,.kern:-size*0.035]);let sz=a.size();ctx.saveGState();ctx.translateBy(x:x-(centered ? sz.width/2:0),y:y);ctx.scaleBy(x:1,y:-1);NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:false);a.draw(at:CGPoint(x:0,y:-sz.height));NSGraphicsContext.restoreGraphicsState();ctx.restoreGState()}
func envelope(_ x:Double,_ y:Double,_ w:Double,_ c:String=white,_ fill:String=black){box(x,y,w,w*0.68,w*0.065,fill,c);path([(x+3,y+4),(x+w/2,y+w*0.37),(x+w-3,y+4)],c,max(2,w*0.013));path([(x+4,y+w*0.66),(x+w*0.33,y+w*0.36)],c,2);path([(x+w-4,y+w*0.66),(x+w*0.67,y+w*0.36)],c,2)}
func reveal(_ p:Double,_ dy:Double=60,_ body:()->Void){ctx.saveGState();ctx.setAlpha(clamp(p));ctx.translateBy(x:0,y:(1-ease(p))*dy);body();ctx.restoreGState()}
func pill(_ s:String,_ x:Double,_ y:Double,_ w:Double,_ dark:Bool=true){box(x,y,w,52,26,dark ? "#191B1E":"#E9EBED");text(s,x+22,y+11,23,dark ? white:black)}
func chrome(_ t:Double,_ light:Bool=false){let fg=light ? black:white;text("Lumail",90,55,37,fg,true);text("EMAIL, REIMAGINED",1490,66,18,light ? gray:gray);box(90,1009,1740,2,0,light ? "#D9DCDF":"#242629");box(90,1009,1740*t/45,2,0,fg);text(String(format:"%02d",min(45,Int(t))),1780,1029,17,gray)}
func label(_ s:String,_ light:Bool=false){text(s,92,170,21,gray)}
func frame(_ t:Double){ctx.saveGState();ctx.translateBy(x:0,y:Double(H));ctx.scaleBy(x:1,y:-1)
let light=(t>=8 && t<15)||(t>=28 && t<34);box(0,0,1920,1080,0,light ? white:black);chrome(t,light)
if t<4 {let u=t
 for i in 0..<9 {let j=Double(i);ctx.saveGState();ctx.translateBy(x:960+sin(j*2.5+u*0.24)*760,y:520+cos(j*1.8+u*0.3)*330);ctx.rotate(by:sin(j+u*0.3)*0.18);ctx.setAlpha(0.16+0.1*sin(j));box(-180,-90,360,180,15,"#16181B",gray);text(["Templates","Settings","Another draft"][i%3],-145,-55,25);for k in 0..<3 {box(-145,-5+Double(k)*23,250-Double(k)*38,7,3,gray)};ctx.restoreGState()}
 reveal(u/0.65){text("Email marketing.",960,350,108,white,true,true)}
 reveal((u-0.65)/0.7){text("Without the busywork.",960,478,94,white,true,true)}
 reveal((u-1.5)/0.6){text("More creating. Less configuring.",960,660,32,gray,false,true)}
} else if t<8 {let u=t-4;let p=ease(u/0.75)
 for i in 0..<8 {let a=Double(i)*Double.pi/4+u*0.12;let r=330+sin(u)*12;ctx.saveGState();ctx.setAlpha(0.3);envelope(960+cos(a)*r-35,460+sin(a)*r*0.74,70,gray);ctx.restoreGState()}
 ctx.saveGState();ctx.translateBy(x:960,y:350);ctx.scaleBy(x:0.85+0.15*p,y:0.85+0.15*p);envelope(-108,-80,216);ctx.restoreGState()
 reveal(u/0.6){text("Love email",960,495,128,white,true,true)}
 reveal((u-0.25)/0.6){text("again.",960,637,128,white,true,true)}
} else if t<15 {let u=t-8;label("01 / WRITE",true)
 reveal(u/0.6){text("Your ideas.",92,295,89,black,true);text("Your voice.",92,393,89,black,true);text("A little AI magic.",92,540,38,gray)}
 let yy=220+(1-ease(u/0.8))*180;box(840,yy,970,640,24,"#FFFFFF","#D9DCDF");text("New campaign",884,yy+33,25,black,true);pill("Draft",1630,yy+22,124,false);path([(840,yy+98),(1810,yy+98)],"#E9EBED")
 text("Subject",886,yy+135,21,gray);text("Something good is coming",886,yy+174,40,black,true)
 let lines=["Hey {{first_name}},","I have been building something for you.","A simpler way to bring your ideas to life.","And today, it is ready."]
 for (i,s) in lines.enumerated(){let chars=Int(clamp((u-1.1-Double(i)*0.42)/0.55)*Double(s.count));text(String(s.prefix(chars)),886,yy+265+Double(i)*52,28,black)}
 reveal((u-3.3)/0.6){pill("AI assisted. Still you.",883,yy+540,315,false);box(1580,yy+537,180,58,29,black);text("Ready →",1611,yy+551,24,white,true)}
} else if t<22 {let u=t-15;label("02 / AUTOMATE");reveal(u/0.6){text("One flow.",92,280,100,white,true);text("Always moving.",92,390,100,white,true);text("Welcome. Nurture. Follow up.",94,565,32,gray)}
 let x=1210.0;let stages=[("Subscriber joins",235.0),("Send welcome email",395.0),("Wait 2 days",555.0)]
 for (i,v) in stages.enumerated(){reveal((u-0.5-Double(i)*0.5)/0.65){if i>0 {path([(x+150,v.1-68),(x+150,v.1)],gray,2)};box(x,v.1,400,92,18,"#17191C",line);circle(x+37,v.1+46,7,white);text(v.0,x+62,v.1+30,27)}}
 reveal((u-2.1)/0.6){path([(1360,647),(1360,712),(1150,712),(1150,769)],gray);path([(1360,712),(1570,712),(1570,769)],gray);box(980,769,330,100,18,"#17191C",line);box(1405,769,330,100,18,"#17191C",line);text("Opened → Next step",1015,805,25);text("Follow up",1480,805,25)}
 if u>2.8 {let z=(u-2.8).truncatingRemainder(dividingBy:2)/2;circle(1360,320+z*370,6,white)}
} else if t<28 {let u=t-22;label("03 / CONNECT");reveal(u/0.6){text("Your AI.",92,295,108,white,true);text("Now on email duty.",92,415,91,white,true)}
 reveal((u-0.4)/0.6){box(100,635,1715,220,22,"#15171A",line);text("→",140,675,42);let s="Draft a launch. Find my audience. Schedule it.";text(String(s.prefix(Int(clamp((u-0.7)/1.2)*Double(s.count)))),205,683,38);path([(140,750),(1770,750)],line);for(i,s) in ["Draft prepared","Audience selected","Ready for your review"].enumerated(){reveal((u-2-Double(i)*0.5)/0.4){text("✓  "+s,150+Double(i)*540,792,27)}}}
 reveal((u-1.2)/0.5){text("ChatGPT   /   Claude   /   Codex   /   API",95,555,27,gray)}
} else if t<34 {let u=t-28;label("04 / GROW",true)
 for i in 0..<44 {let a=Double(i)*2.399;let r=sqrt(Double(i))*48;let spread=ease(u/2);circle(1390+cos(a+u*0.07)*r*spread,515+sin(a+u*0.07)*r*spread,12+(i%4==0 ? 9:0),i%3==0 ? "#8A8F98":"#C9CCD1")}
 reveal(u/0.6){text("Unlimited",92,300,108,black,true);text("subscribers.",92,420,108,black,true)}
 reveal((u-0.9)/0.7){text("Pay for sends.",95,612,48,black,true);text("Let your audience grow.",95,680,33,gray)}
} else if t<39 {let u=t-34;label("05 / DELIVER");reveal(u/0.6){text("Every email.",960,220,103,white,true,true);text("One home.",960,332,103,white,true,true)}
 for (i,s) in ["Campaigns","Sequences","Transactional"].enumerated(){let y=550+Double(i)*112;reveal((u-0.4-Double(i)*0.16)/0.6){text(s,160,y+20,29,gray);path([(470,y+42),(1460,y+42)],line,2);let z=(u*0.37+Double(i)*0.25).truncatingRemainder(dividingBy:1);envelope(490+z*845,y+19,68,white,black)}}
 reveal((u-0.8)/0.5){box(1490,536,270,355,26,"#17191C",line);text("Lumail",1625,674,51,white,true,true)}
} else {let u=t-39
 for i in 0..<5 {let r=220+Double(i)*115+ease(u/3)*50;ctx.setStrokeColor(color("#1A1C20"));ctx.setLineWidth(1);ctx.strokeEllipse(in:CGRect(x:960-r,y:460-r,width:r*2,height:r*2))}
 reveal(u/0.65){text("Lumail",960,214,72,white,true,true);text("Your next great email",960,372,97,white,true,true);text("starts here.",960,484,97,white,true,true)}
 reveal((u-0.7)/0.6){box(711,658,498,89,45,white);text("Start free at lumail.io  ↗",960,682,33,black,true,true)}
 reveal((u-1.2)/0.6){text("3,000 emails / month free · No card",960,794,29,gray,false,true)}
}
// Short directional wipes preserve continuity between acts.
for cut in [4.0,8,15,22,28,34,39] {let d=t-cut;if d >= -0.16 && d<0.18 {let p=(d+0.16)/0.34;let x = -2100+ease(p)*4200;box(x,0,2100,1080,0,cut==8 || cut==28 ? white:"#C9CCD1")}}
ctx.restoreGState()}
let ff=Process();ff.executableURL=URL(fileURLWithPath:"/opt/homebrew/bin/ffmpeg");ff.arguments=["-y","-f","rawvideo","-pixel_format","rgb0","-video_size","1920x1080","-framerate","30","-i","-","-an","-c:v","libx264","-preset","fast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart","production/silent.mp4"]
let pipe=Pipe();ff.standardInput=pipe;ff.standardOutput=FileHandle.nullDevice;try ff.run()
for n in 0..<1350 {autoreleasepool {frame(Double(n)/30);pipe.fileHandleForWriting.write(Data(bytes:ctx.data!,count:W*H*4))};if n%150==0 {fputs("Rendered \(n)/1350 frames\n",stderr)}}
try pipe.fileHandleForWriting.close();ff.waitUntilExit();if ff.terminationStatus != 0 {exit(1)}
