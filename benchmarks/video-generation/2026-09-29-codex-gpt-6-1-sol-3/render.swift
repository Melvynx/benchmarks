import AppKit
import CoreGraphics
import CoreText
import Foundation
let W=1920, H=1080, fps=30
let buf=UnsafeMutableRawPointer.allocate(byteCount:W*H*4, alignment:64)
let ctx=CGContext(data:buf,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedFirst.rawValue|CGBitmapInfo.byteOrder32Little.rawValue)!
let white="F7F8F8", muted="8A8F98", ink="0D0E10", line="303338", green="BDDCCD"
func color(_ s:String,_ a:Double=1)->CGColor {let n=UInt32(s,radix:16)!;return CGColor(red:CGFloat((n>>16)&255)/255,green:CGFloat((n>>8)&255)/255,blue:CGFloat(n&255)/255,alpha:a)}
func clamp(_ x:Double)->Double {min(1,max(0,x))}
func ease(_ x:Double)->Double {let x=clamp(x); return 1-pow(1-x,4)}
func smooth(_ x:Double)->Double {let x=clamp(x);return x*x*(3-2*x)}
func mix(_ a:Double,_ b:Double,_ x:Double)->Double {a+(b-a)*x}
func rect(_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ r:Double=0,_ fill:String=white,_ a:Double=1,_ stroke:String?=nil){let p=CGPath(roundedRect:CGRect(x:x,y:y,width:w,height:h),cornerWidth:r,cornerHeight:r,transform:nil);ctx.addPath(p);ctx.setFillColor(color(fill,a));ctx.fillPath();if let s=stroke{ctx.addPath(p);ctx.setStrokeColor(color(s,a));ctx.setLineWidth(1.5);ctx.strokePath()}}
func circle(_ x:Double,_ y:Double,_ r:Double,_ fill:String,_ a:Double=1){ctx.setFillColor(color(fill,a));ctx.fillEllipse(in:CGRect(x:x-r,y:y-r,width:r*2,height:r*2))}
func stroke(_ points:[CGPoint],_ col:String=line,_ width:Double=2,_ a:Double=1){guard points.count>1 else{return};ctx.beginPath();ctx.move(to:points[0]);for p in points.dropFirst(){ctx.addLine(to:p)};ctx.setStrokeColor(color(col,a));ctx.setLineWidth(width);ctx.setLineCap(.round);ctx.setLineJoin(.round);ctx.strokePath()}
var fontCache:[String:CTFont]=[:]
var lineCache:[String:CTLine]=[:]
func text(_ s:String,_ x:Double,_ y:Double,_ size:Double,_ col:String=white,_ weight:String="Medium",_ a:Double=1,_ align:String="left") {let name=weight=="Mono" ? "Menlo-Regular":"HelveticaNeue-"+weight;let fontKey=name+String(size);let font=fontCache[fontKey] ?? CTFontCreateWithName(name as CFString,CGFloat(size),nil);fontCache[fontKey]=font;let attrs:[NSAttributedString.Key:Any]=[.font:font,.foregroundColor:color(col,a),.kern:-size*0.035];let lineKey=s+fontKey+col+String(a);let ln=lineCache[lineKey] ?? CTLineCreateWithAttributedString(NSAttributedString(string:s,attributes:attrs));if a==1{lineCache[lineKey]=ln};let width=CTLineGetTypographicBounds(ln,nil,nil,nil);ctx.saveGState();ctx.translateBy(x:x-(align=="center" ? width/2:align=="right" ? width:0),y:y+size*0.83);ctx.scaleBy(x:1,y:-1);ctx.textMatrix = .identity;ctx.textPosition = .zero;CTLineDraw(ln,ctx);ctx.restoreGState()}
func envelope(_ x:Double,_ y:Double,_ s:Double,_ col:String=white,_ a:Double=1){rect(x,y,s,s*0.68,s*0.09,ink,0,col);stroke([CGPoint(x:x+s*0.06,y:y+s*0.09),CGPoint(x:x+s*0.5,y:y+s*0.37),CGPoint(x:x+s*0.94,y:y+s*0.09)],col,s*0.025,a)}
func check(_ x:Double,_ y:Double,_ s:Double,_ col:String=green){stroke([CGPoint(x:x,y:y+s*0.45),CGPoint(x:x+s*0.3,y:y+s*0.75),CGPoint(x:x+s,y:y)],col,4)}
func arrow(_ x:Double,_ y:Double,_ s:Double,_ col:String=white){stroke([CGPoint(x:x,y:y),CGPoint(x:x+s,y:y)],col,3);stroke([CGPoint(x:x+s*0.7,y:y-s*0.3),CGPoint(x:x+s,y:y),CGPoint(x:x+s*0.7,y:y+s*0.3)],col,3)}
func label(_ s:String,_ x:Double,_ y:Double,_ col:String=muted){text(s,x,y,21,col,"Mono")}
func pill(_ s:String,_ x:Double,_ y:Double,_ w:Double,_ fill:String="1A1C20",_ col:String=white){rect(x,y,w,48,24,fill,1,line);text(s,x+w/2,y+13,21,col,"Medium",1,"center")}
func heading(_ n:String,_ title:String,_ subtitle:String){label(n,110,180);text(title,110,226,94);text(subtitle,114,342,29,muted,"Regular")}
func header(_ n:Int){text("Lumail",110,62,34,white,"Bold");
rect(1430,58,420,55,0,"08090A");text("LAUNCH / 2026",1810,71,19,muted,"Mono",1,"right")
for i in 0..<8{rect(110+Double(i)*214,1007,194,3,1,i<=n ? white:line)};text(String(format:"%02d / 08",n+1),1810,956,18,muted,"Mono",1,"right")}
let dotsCtx=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedFirst.rawValue)!
dotsCtx.setFillColor(color("C9CCD1",0.055))
for row in 0..<21{for col in 0..<38{dotsCtx.fillEllipse(in:CGRect(x:Double(col)*52+10,y:Double(row)*52+12,width:1.6,height:1.6))}}
let dotsImage=dotsCtx.makeImage()!
func background(_ t:Double){rect(0,0,1920,1080,0,"08090A");let space=CGColorSpaceCreateDeviceRGB();let grad=CGGradient(colorsSpace:space,colors:[color("23262B",0.42),color("08090A",0)] as CFArray,locations:[0,1])!;ctx.drawRadialGradient(grad,startCenter:CGPoint(x:1180+90*sin(t*0.25),y:470),startRadius:0,endCenter:CGPoint(x:1100,y:540),endRadius:1000,options:[]);ctx.draw(dotsImage,in:CGRect(x:0,y:0,width:1920,height:1080))}
func emailCard(_ x:Double,_ y:Double,_ w:Double,_ name:String,_ subject:String,_ a:Double=1){ctx.saveGState();ctx.setAlpha(a);rect(x,y,w,128,18,"121417",1,line);circle(x+43,y+43,17,"2F333A");text(name,x+74,y+26,22,white,"Medium");text(subject,x+28,y+77,23,muted,"Regular");text("now",x+w-26,y+30,16,muted,"Regular",1,"right");ctx.restoreGState()}
func scene0(_ t:Double){let p=ease(t/1.3);let converge=smooth((t-2.6)/1.1)
for i in 0..<10 {let angle=Double(i)*Double.pi*2/10+t*0.13;let radius=480*(1-converge)+90*converge;let x=960+cos(angle)*radius*1.5;let y=545+sin(angle)*radius*0.65;ctx.saveGState();ctx.translateBy(x:x,y:y);ctx.rotate(by:sin(angle)*0.13);ctx.setAlpha(p*(1-converge)*0.6);envelope(-55,-35,110,muted);ctx.restoreGState()}
ctx.saveGState();ctx.translateBy(x:960,y:480+50*(1-p));ctx.scaleBy(x:0.93+0.07*p,y:0.93+0.07*p);text("Fall in love",0,-80,128,white,"Bold",p,"center");text("with email.",0,56,128,white,"Bold",p,"center");ctx.restoreGState();text("LESS FRICTION. MORE MOMENTUM.",960,727,23,muted,"Mono",p,"center")
if converge>0 {circle(960,540,220*converge,"F7F8F8",converge*0.1)}}
func scene1(_ t:Double){let p=ease(t/1);let k=1+0.025*t;ctx.saveGState();ctx.translateBy(x:960,y:500);ctx.scaleBy(x:k,y:k);text("Lumail",0,-72,190,white,"Bold",p,"center");ctx.restoreGState();text("Your next campaign starts here.",960,654,41,muted,"Regular",p,"center");label("INTRODUCING",861,290)
for i in 0..<3 {let x=Double(i)*460+300;let lift=ease((t-0.6)/0.7);rect(x,797+40*(1-lift),400,74,37,"121417",lift,line);text(["AI-assisted writing","Automated sequences","One place to send"][i],x+200,821+40*(1-lift),26,white,"Medium",lift,"center")}}
func scene2(_ t:Double){heading("01 / CREATE","Your words. Your voice.","Write like a document. Polish with AI.")
let p=ease(t/0.9);ctx.saveGState();ctx.translateBy(x:0,y:80*(1-p));ctx.setAlpha(p)
rect(400,430,1120,500,20,"111316",1,line);rect(400,430,1120,59,20,"1A1C20");circle(431,460,5,muted);circle(451,460,5,muted);circle(471,460,5,muted);text("Campaign editor",960,448,20,muted,"Regular",1,"center")
rect(429,516,700,383,12,white);text("Subject",462,546,19,"8A8F98","Medium");text("Something good is coming.",462,584,36,ink,"Bold");rect(461,645,623,1,0,"C9CCD1");text("Hey {{firstName}},",462,675,25,ink,"Regular");text("We built this for people like you.",462,727,27,ink,"Regular");text("People who write, ship and sell.",462,770,27,ink,"Regular");rect(462,835,252,44,8,ink);text("Take a look  →",588,846,20,white,"Medium",1,"center")
label("AI ASSISTANT",1162,535);text("Keep it sounding",1162,587,26);text("like me.",1162,624,26);rect(1161,687,326,100,12,"202429",1,line);text("Make the intro clearer.",1182,709,22);text("Keep my tone.",1182,743,22,muted,"Regular")
let q=smooth((t-2.2)/0.7);ctx.setAlpha(q);check(1170,823,22);text("Your voice, refined.",1210,820,22,green);ctx.restoreGState()
// cursor and selection sweep
if t>1.1 && t<3.1 {rect(458,723,630*clamp((t-1.1)/0.8),43,5,"ADB7C9",0.16)}
}
func scene3(_ t:Double){heading("02 / CONNECT","Give your AI the tools.","Draft. Segment. Schedule. You keep the last click.")
let p=ease(t/0.8);ctx.saveGState();ctx.translateBy(x:90*(1-p),y:0);ctx.setAlpha(p);rect(110,452,920,470,20,"101215",1,line);label("AGENT / LUMAIL MCP",147,484);rect(147,535,846,90,12,"202329");text("Find readers ready for my launch.",177,565,29)
let q=clamp((t-1)/2);let rows=["query_subscribers", "create_campaign", "schedule_campaign"];let details=["Audience selected", "Draft prepared", "Ready for your review"]
for i in 0..<3 {let alpha=ease((q*3-Double(i))*2);ctx.saveGState();ctx.setAlpha(alpha);circle(166,679+Double(i)*77,5,green);text(rows[i],190,664+Double(i)*77,25,white,"Mono");text(details[i],975,666+Double(i)*77,21,muted,"Regular",1,"right");ctx.restoreGState()}
ctx.restoreGState()
let pull=ease((t-0.5)/1);for i in 0..<5 {let y=480+Double(i)*83;let x=1150+Double(i%2)*190;circle(x+25*sin(t+Double(i)),y,17,"20262B");circle(x+25*sin(t+Double(i)),y,6,muted);stroke([CGPoint(x:1045,y:687),CGPoint(x:x,y:y)],line,1,pull*0.7)}
rect(1210,631,485,155,18,white,pull);text("Ready to launch?",1242,659,30,ink,"Bold",pull);rect(1242,712,420,46,9,ink,pull);text(t>4 ? "Approved  ✓":"Review & approve  →",1452,723,22,white,"Medium",pull,"center")
}
func node(_ x:Double,_ y:Double,_ w:Double,_ title:String,_ sub:String,_ active:Bool=false){rect(x,y,w,105,16,active ? "20262A":"121417",1,active ? "9DA9A4":line);circle(x+36,y+35,9,active ? green:muted);text(title,x+59,y+23,24);text(sub,x+28,y+64,20,muted,"Regular")}
func scene4(_ t:Double){heading("03 / AUTOMATE","One idea. A whole journey.","Welcome. Wait. Follow up. Keep the conversation going.")
let p=ease(t/0.8);ctx.saveGState();ctx.translateBy(x:50*(1-p),y:0);ctx.setAlpha(p)
let points=[CGPoint(x:420,y:650),CGPoint(x:590,y:650),CGPoint(x:850,y:650),CGPoint(x:1080,y:650),CGPoint(x:1210,y:650),CGPoint(x:1330,y:527),CGPoint(x:1610,y:527)]
stroke(points,line,3);stroke([CGPoint(x:1210,y:650),CGPoint(x:1330,y:792),CGPoint(x:1610,y:792)],line,3)
node(110,598,310,"Tag added","newsletter",t>0.7);node(540,598,310,"Send email","Welcome, start here",t>1.6);node(970,598,240,"Wait","2 days",t>2.5);node(1330,475,365,"Opened","Continue the story",t>3.5);node(1330,740,365,"Not opened","Try a follow-up",false)
label("YES",1235,506,green);label("NO",1235,798)
let travel=clamp((t-0.7)/3.5);let seg=travel*Double(points.count-1);let ix=min(points.count-2,Int(seg));let f=seg-Double(ix);let a=points[ix],b=points[ix+1];let x=mix(a.x,b.x,f),y=mix(a.y,b.y,f);circle(x,y,14,green,0.12);circle(x,y,5,green)
ctx.restoreGState();text("Publish once. Let Lumail handle the timing.",960,913,26,muted,"Regular",1,"center")}
func scene5(_ t:Double){heading("04 / SEND","Every email. One home.","Campaigns and transactional email, on the same domain.")
let p=ease(t/0.8);ctx.setAlpha(p);rect(110,459,1590,400,22,"101215",1,line);label("CAMPAIGNS",154,507);label("TRANSACTIONAL / PRIORITY LANE",154,691,green);stroke([CGPoint(x:465,y:550),CGPoint(x:1630,y:550)],line,2);stroke([CGPoint(x:465,y:737),CGPoint(x:1630,y:737)],"64796E",2)
for i in 0..<5 {let phase=(t*0.14+Double(i)*0.2).truncatingRemainder(dividingBy:1);let x=500+phase*1050;rect(x,520,84,59,10,"20252B",1,line);envelope(x+20,536,44,muted)}
let x=520+(t*0.55).truncatingRemainder(dividingBy:1)*1050;rect(x,704,145,67,12,white);text("OTP",x+72,724,27,ink,"Bold",1,"center");text("Receipts · login codes · newsletters",960,916,27,muted,"Regular",1,"center");ctx.setAlpha(1)}
func scene6(_ t:Double){let p=ease(t/0.9);label("05 / GROW",110,181);text("Grow your audience.",110,234,101,white,"Bold",p);text("Not your contact bill.",110,355,101,muted,"Bold",p)
let count=Int(50000*ease((t-0.4)/2));rect(110,546,790,336,21,"121417",1,line);label("SUBSCRIBERS",150,591);text(count.formatted(),150,650,105,white,"Medium");text("Unlimited contacts. Every plan.",150,810,27,muted,"Regular")
rect(940,546,760,336,21,white);label("YOU PAY FOR",984,591,"626970");text("Emails sent.",984,662,82,ink,"Bold");text("A list that grows with you.",984,810,27,"626970","Regular")}
func scene7(_ t:Double){let p=ease(t/0.9);ctx.saveGState();ctx.translateBy(x:960,y:385+30*(1-p));ctx.scaleBy(x:0.96+0.04*p,y:0.96+0.04*p);text("Lumail",0,-74,180,white,"Bold",p,"center");ctx.restoreGState();text("Import your list. Send tonight.",960,539,60,white,"Medium",p,"center");text("3,000 emails / month free. No card.",960,637,32,muted,"Regular",p,"center");let q=ease((t-0.7)/0.7);rect(650,744+20*(1-q),620,105,53,white,q);text("Start free at lumail.io",960,775+20*(1-q),34,ink,"Bold",q,"center");text("EMAIL FOR PEOPLE WHO WRITE, SHIP AND SELL.",960,912,20,muted,"Mono",p,"center")}
let boundaries:[Double]=[0,4,8,15,22,29,34,39,45]
let scenes:[(Double)->Void]=[scene0,scene1,scene2,scene3,scene4,scene5,scene6,scene7]
func render(_ t:Double){ctx.saveGState();ctx.translateBy(x:0,y:Double(H));ctx.scaleBy(x:1,y:-1);background(t);let n=(0..<8).first(where:{t<boundaries[$0+1]}) ?? 7;let local=t-boundaries[n];let duration=boundaries[n+1]-boundaries[n];header(n);rect(110+Double(n)*214,1007,194*clamp(local/duration),3,1,white);ctx.saveGState();let enter=ease(local/0.55);let leave=n==7 ? 0:smooth((local-duration+0.34)/0.34);ctx.translateBy(x:120*(1-enter)-110*leave,y:0);let zoom=1+0.008*local/duration;ctx.translateBy(x:960,y:540);ctx.scaleBy(x:zoom,y:zoom);ctx.translateBy(x:-960,y:-540);ctx.setAlpha(enter*(1-leave));scenes[n](local);ctx.restoreGState(); // beat-sensitive corner ornaments
let pulse=pow(max(0,1-(t*2).truncatingRemainder(dividingBy:1)),4);circle(1810,192,4,white,0.25+0.5*pulse);ctx.restoreGState()}
if CommandLine.arguments.count>2 {let t=Double(CommandLine.arguments[1])!;render(t);let rep=NSBitmapImageRep(cgImage:ctx.makeImage()!);try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[2]));exit(0)}
for f in 0..<(45*fps){autoreleasepool{render(Double(f)/Double(fps));FileHandle.standardOutput.write(Data(bytes:buf,count:W*H*4))};if f%150==0{FileHandle.standardError.write(Data("frame \(f)/1350\n".utf8))}}
