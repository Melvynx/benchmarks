import Foundation
import AppKit
import AVFoundation
import CoreText

// All motion is deterministic, rendered natively at 60 fps, and built from vectors.
let W: CGFloat = 1920
let H: CGFloat = 1080
let fps: Int32 = 60
let bg = "08090A", paper = "F7F8F8", gray = "8A8F98", silver = "C9CCD1"
var c: CGContext!
func clamp(_ x: CGFloat) -> CGFloat { min(1,max(0,x)) }
func out(_ x: CGFloat) -> CGFloat { 1-pow(1-clamp(x),3) }
func smooth(_ x: CGFloat) -> CGFloat { let p=clamp(x); return p*p*(3-2*p) }
func mix(_ a: CGFloat,_ b: CGFloat,_ x: CGFloat) -> CGFloat { a+(b-a)*x }
func color(_ hex: String,_ a: CGFloat=1) -> CGColor {
    let n=UInt32(hex,radix:16) ?? 0
    return CGColor(red:CGFloat((n>>16)&255)/255,green:CGFloat((n>>8)&255)/255,blue:CGFloat(n&255)/255,alpha:a)
}
func layer(_ alpha: CGFloat=1,_ body: () -> Void) { c.saveGState();c.setAlpha(clamp(alpha));body();c.restoreGState() }
func move(_ x: CGFloat,_ y: CGFloat,_ scale: CGFloat=1,_ angle: CGFloat=0,_ body: () -> Void) {
    c.saveGState();c.translateBy(x:x,y:y);c.rotate(by:angle);c.scaleBy(x:scale,y:scale);body();c.restoreGState()
}
func rect(_ x: CGFloat,_ y: CGFloat,_ w: CGFloat,_ h: CGFloat,_ fill: String,_ r: CGFloat=0,_ a: CGFloat=1) {
    c.setFillColor(color(fill,a));c.addPath(CGPath(roundedRect:CGRect(x:x,y:y,width:w,height:h),cornerWidth:r,cornerHeight:r,transform:nil));c.fillPath()
}
func outline(_ x: CGFloat,_ y: CGFloat,_ w: CGFloat,_ h: CGFloat,_ stroke: String,_ r: CGFloat=0,_ alpha: CGFloat=1,_ width: CGFloat=1) {
    c.setStrokeColor(color(stroke,alpha));c.setLineWidth(width);c.addPath(CGPath(roundedRect:CGRect(x:x,y:y,width:w,height:h),cornerWidth:r,cornerHeight:r,transform:nil));c.strokePath()
}
func line(_ points:[CGPoint],_ stroke:String,_ width:CGFloat=2,_ alpha:CGFloat=1) {
    guard let first=points.first else{return};c.setStrokeColor(color(stroke,alpha));c.setLineWidth(width);c.setLineCap(.round);c.setLineJoin(.round);c.beginPath();c.move(to:first);for p in points.dropFirst(){c.addLine(to:p)};c.strokePath()
}
func circle(_ x:CGFloat,_ y:CGFloat,_ r:CGFloat,_ fill:String,_ alpha:CGFloat=1) {
    c.setFillColor(color(fill,alpha));c.fillEllipse(in:CGRect(x:x-r,y:y-r,width:r*2,height:r*2))
}
func ring(_ x:CGFloat,_ y:CGFloat,_ rx:CGFloat,_ ry:CGFloat,_ stroke:String,_ alpha:CGFloat=1,_ width:CGFloat=1) {
    c.setStrokeColor(color(stroke,alpha));c.setLineWidth(width);c.strokeEllipse(in:CGRect(x:x-rx,y:y-ry,width:rx*2,height:ry*2))
}
func text(_ value:String,_ x:CGFloat,_ y:CGFloat,_ size:CGFloat,_ fill:String=paper,_ weight:String="medium",_ align:String="left",_ tracking:CGFloat=0) {
    let fontName=weight == "bold" ? "HelveticaNeue-Bold" : weight == "light" ? "HelveticaNeue-Light" : weight == "mono" ? "Menlo-Regular" : "HelveticaNeue-Medium"
    let font=CTFontCreateWithName(fontName as CFString,size,nil)
    let attrs:[NSAttributedString.Key:Any]=[NSAttributedString.Key(kCTFontAttributeName as String):font,NSAttributedString.Key(kCTForegroundColorAttributeName as String):color(fill),NSAttributedString.Key(kCTKernAttributeName as String):tracking]
    let l=CTLineCreateWithAttributedString(NSAttributedString(string:value,attributes:attrs))
    let width=CGFloat(CTLineGetTypographicBounds(l,nil,nil,nil));let dx=align == "center" ? -width/2 : align == "right" ? -width : 0
    c.saveGState();c.textMatrix=CGAffineTransform(scaleX:1,y:-1);c.textPosition=CGPoint(x:x+dx,y:y+CTFontGetAscent(font));CTLineDraw(l,c);c.restoreGState()
}
func label(_ value:String,_ x:CGFloat,_ y:CGFloat,_ fill:String=gray) {text(value,x,y,19,fill,"mono","left",2.0)}
func check(_ x:CGFloat,_ y:CGFloat,_ fill:String=paper,_ size:CGFloat=1) {line([CGPoint(x:x,y:y+8*size),CGPoint(x:x+7*size,y:y+15*size),CGPoint(x:x+21*size,y:y)],fill,2.4*size)}
func sparkle(_ x:CGFloat,_ y:CGFloat,_ size:CGFloat,_ fill:String=paper) {
    c.setFillColor(color(fill));c.beginPath();c.move(to:CGPoint(x:x,y:y-size));c.addQuadCurve(to:CGPoint(x:x+size,y:y),control:CGPoint(x:x+size*0.17,y:y-size*0.17));c.addQuadCurve(to:CGPoint(x:x,y:y+size),control:CGPoint(x:x+size*0.17,y:y+size*0.17));c.addQuadCurve(to:CGPoint(x:x-size,y:y),control:CGPoint(x:x-size*0.17,y:y+size*0.17));c.addQuadCurve(to:CGPoint(x:x,y:y-size),control:CGPoint(x:x-size*0.17,y:y-size*0.17));c.fillPath()
}
func envelope(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ fill:String=paper,_ stroke:String=bg,_ opened:CGFloat=0) {
    rect(x,y,w,h,fill,12);outline(x,y,w,h,stroke,12,0.24,1.5)
    line([CGPoint(x:x+3,y:y+4),CGPoint(x:x+w*0.5,y:y+h*0.56-opened*h*0.6),CGPoint(x:x+w-3,y:y+4)],stroke,max(1.2,w/180),0.8)
    line([CGPoint(x:x+3,y:y+h-4),CGPoint(x:x+w*0.32,y:y+h*0.51)],stroke,max(1.0,w/230),0.25)
    line([CGPoint(x:x+w-3,y:y+h-4),CGPoint(x:x+w*0.68,y:y+h*0.51)],stroke,max(1.0,w/230),0.25)
}
func arrow(_ x:CGFloat,_ y:CGFloat,_ fill:String=paper,_ size:CGFloat=1) {line([CGPoint(x:x,y:y),CGPoint(x:x+30*size,y:y)],fill,3*size);line([CGPoint(x:x+20*size,y:y-10*size),CGPoint(x:x+30*size,y:y),CGPoint(x:x+20*size,y:y+10*size)],fill,3*size)}
func brand(_ dark:Bool=false) {text("Lumail",82,53,33,dark ? bg:paper,"bold","left",-1.2);circle(198,76,4,dark ? bg:paper);label("EMAIL, REIMAGINED",1515,68,dark ? "686C71":gray)}
func foot(_ n:String,_ name:String,_ dark:Bool=false) {label(n+" / "+name,84,1003,dark ? "686C71":gray);label("LUMAIL.IO",1697,1003,dark ? "686C71":gray)}
func grid(_ dark:Bool=false,_ alpha:CGFloat=1) {
    let ink=dark ? "CDD0D3":"303339"
    for x in stride(from:CGFloat(80),to:W,by:CGFloat(80)){line([CGPoint(x:x,y:0),CGPoint(x:x,y:H)],ink,1,0.23*alpha)}
    for y in stride(from:CGFloat(60),to:H,by:CGFloat(80)){line([CGPoint(x:0,y:y),CGPoint(x:W,y:y)],ink,1,0.23*alpha)}
}
func appear(_ local:CGFloat,_ delay:CGFloat=0,_ body:()->Void) {let p=out((local-delay)/0.65);layer(p){move(0,(1-p)*55){body()}}}
func panel(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ light:Bool=false) {
    for i in (1..0.9).reversed(){rect(x-CGFloat(i)*2,y+CGFloat(i)*3,w+CGFloat(i)*4,h,light ? "000000":"000000",22,0.015)}
    rect(x,y,w,h,light ? "FFFFFF":"101214",18);outline(x,y,w,h,light ? "D9DCE0":"34373D",18,1,1.2)
}
func pill(_ value:String,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ light:Bool=false) {
    rect(x,y,w,48,light ? "E8EAEC":"1C1F23",24);outline(x,y,w,48,light ? "DADDDF":"363A40",24);text(value,x+w/2,y+11,20,light ? bg:silver,"medium","center")
}
func radial(_ cx:CGFloat,_ cy:CGFloat,_ radius:CGFloat,_ alpha:CGFloat=0.14) {
    let space=CGColorSpaceCreateDeviceRGB();let g=CGGradient(colorsSpace:space,colors:[color("AAB4C4",alpha),color(bg,0)] as CFArray,locations:[0,1])!;c.drawRadialGradient(g,startCenter:CGPoint(x:cx,y:cy),startRadius:0,endCenter:CGPoint(x:cx,y:cy),endRadius:radius,options:[])
}

func intro(_ t:CGFloat) {
    radial(960,540,820,0.13);brand();foot("01","A BETTER FEELING")
    let collapse=out((t-3.85)/1.55)
    for i in 0..<9 {
        let a=CGFloat(i)*0.698+t*0.1
        let radius=mix(760,190,collapse)
        let x=960+cos(a)*radius,y=540+sin(a)*radius*0.48
        layer(0.12+collapse*0.24){move(x,y,mix(0.7,0.35,collapse),a*0.12){envelope(-130,-84,260,168,"35383C",silver)}}
    }
    if t<2.05 {
        let p=out(t/0.72)
        layer(1-smooth((t-1.65)/0.4)){move(960,420,mix(0.87,1.03,p)){text("Email.",0,-48,220,paper,"bold","center",-10)};text("It should feel this good.",960,694,34,silver,"light","center",-0.5)}
    } else {
        let p=out((t-2.05)/0.68)
        layer(1-smooth((t-4.95)/0.5)){move(960,335+(1-p)*80,mix(0.94,1,p)){text("Fall in love",0,0,146,paper,"bold","center",-6);text("with it again.",0,158,146,paper,"bold","center",-6)}
            let q=out((t-2.7)/0.8);rect(493,681,934*q,3,paper,1,0.7);text("LESS FRICTION. MORE CONNECTION.",960,742,22,gray,"mono","center",2)}
    }
}
func reveal(_ t:CGFloat) {
    radial(960,515,950,0.2)
    let p=out(t/0.95)
    for i in 0..<20 {let r=CGFloat(i)*45+150;layer((1-p)*0.55+0.1){ring(960,535,r,r*0.55,silver,0.18)}}
    let angle=(1-p)*(-0.18)
    move(960,415,mix(0.65,1,p),angle){
        for i in (1..0.4).reversed(){layer(CGFloat(5-i)*0.07){envelope(-162+CGFloat(i)*22,-126-CGFloat(i)*12,324,220,"676C74",silver)}}
        envelope(-162,-126,324,220,paper,bg)
    }
    appear(t,0.22){text("Lumail",960,570,152,paper,"bold","center",-8)}
    appear(t,0.6){text("Your next great email starts here.",960,765,35,silver,"light","center",-0.6)}
    layer(smooth((t-1.1)/0.7)){label("AI POWERED",839,877)}
    brand();foot("02","MEET LUMAIL")
}
func editor(_ t:CGFloat) {
    rect(0,0,W,H,paper);grid(true,0.7);brand(true);foot("03","WRITE WITH MOMENTUM",true)
    appear(t){label("FROM IDEA TO INBOX",100,232,"666B72");text("Your words.",94,290,94,bg,"bold","left",-4);text("Supercharged.",94,390,94,bg,"bold","left",-4)}
    appear(t,0.25){text("AI helps you draft.",100,539,31,"535961","light");text("Your voice stays yours.",100,583,31,"535961","light")}
    let enter=out(t/0.85)
    move(0,(1-enter)*130){layer(enter){
        panel(807,190,996,688,true)
        rect(808,191,994,74,"F1F2F3",18);rect(808,241,994,24,"F1F2F3");line([CGPoint(x:808,y:265),CGPoint(x:1801,y:265)],"DADDE0")
        circle(842,228,6,"C2C6CB");circle(865,228,6,"C2C6CB");circle(888,228,6,"C2C6CB");text("Launch campaign",1304,211,21,"50565E","medium","center")
        text("Subject",852,303,19,"8A8F98");text("Something good just landed",957,299,25,bg,"medium")
        line([CGPoint(x:850,y:348),CGPoint(x:1760,y:348)],"E2E4E7")
        text("Hey {{first_name}},",859,389,29,bg)
        let lines=["We made something for you.","A simpler way to turn your next idea", "into an email people want to open.","Ready when you are."]
        for (i,s) in lines.enumerated() {
            let count=Int(clamp((t-1.2-CGFloat(i)*0.55)/0.7)*CGFloat(s.count))
            text(String(s.prefix(count)),859,461+CGFloat(i)*51,28,i==3 ? "777D85":"333940","light")
        }
        let q=smooth((t-4.3)/0.6)
        layer(q){rect(851,746,900,76,"F0F2F4",12);sparkle(885,783,14,bg);text("Sounds like you. Ready to send.",916,766,24,bg);check(1698,775,bg)}
    }}
    appear(t,0.75){panel(119,704,756,123);sparkle(166,764,19);text("Write a launch email in my voice",210,748,27);circle(816,765,22,paper);arrow(806,765,bg,0.65)}
    if t>5.4 {let q=out((t-5.4)/0.55);layer(q){pill("Draft ready",597,639,168,true);check(623,654,bg,0.6)}}
}
func agents(_ t:CGFloat) {
    radial(600,570,800,0.12);grid(false,0.55);brand();foot("04","WORK WITH YOUR AGENT")
    appear(t){text("Just ask.",96,223,137,paper,"bold","left",-6);text("Lumail gets to work.",102,385,52,silver,"light","left",-1.8)}
    let names=["Claude Code","Codex","ChatGPT"]
    for (i,s) in names.enumerated(){appear(t,0.2+CGFloat(i)*0.14){pill(s,103+CGFloat(i)*211,513,193)}}
    appear(t,0.55){label("CONNECTED TO YOUR WORKFLOW",104,623);text("Draft. Segment. Schedule.",100,678,39,paper,"medium","left",-1)}
    let p=out(t/0.8)
    move((1-p)*150,0){layer(p){panel(894,219,923,617)
        circle(936,262,5,gray);circle(957,262,5,gray);circle(978,262,5,gray);text("lumail / agent",1070,245,22,gray,"mono")
        line([CGPoint(x:895,y:302),CGPoint(x:1816,y:302)],"30343A")
        text(">",938,347,31,silver,"mono");text("Prepare my launch campaign.",977,348,27,paper,"mono")
        let tasks=[("Draft the email", "Your voice, polished"),("Find the right audience", "Segments, connected"),("Schedule the campaign", "Ready for your approval")]
        for (i,task) in tasks.enumerated(){let q=out((t-0.8-CGFloat(i)*0.88)/0.6);layer(q){
            circle(951,458+CGFloat(i)*102,16,"262C32");check(943,452+CGFloat(i)*102,paper,0.68)
            text(task.0,991,434+CGFloat(i)*102,27,paper);text(task.1,992,475+CGFloat(i)*102,19,gray,"mono")
        }}
        layer(smooth((t-3.6)/0.5)){rect(930,758,851,45,paper,9);text("You keep the final say.",1355,767,21,bg,"medium","center")}
    }}
}
func node(_ x:CGFloat,_ y:CGFloat,_ title:String,_ subtitle:String,_ active:Bool=false,_ icon:String="mail") {
    panel(x,y,410,118);if active {outline(x,y,410,118,silver,18,0.8,2)}
    rect(x+22,y+26,62,62,active ? paper:"23272C",14)
    if icon=="mail" {envelope(x+35,y+44,36,25,active ? bg:silver,active ? paper:bg)}
    else if icon=="clock" {ring(x+53,y+57,17,17,active ? bg:paper,1,2);line([CGPoint(x:x+53,y:y+46),CGPoint(x:x+53,y:y+57),CGPoint(x:x+61,y:y+62)],active ? bg:paper,2)}
    else {sparkle(x+53,y+57,18,active ? bg:paper)}
    text(title,x+105,y+27,26,paper);text(subtitle,x+105,y+67,18,gray,"mono")
}
func workflows(_ t:CGFloat) {
    grid(false,0.8);radial(960,600,1000,0.09);brand();foot("05","KEEP THE CONNECTION GOING")
    if t<4.7 {
        appear(t){text("Set it in motion.",960,165,95,paper,"bold","center",-4)}
        let p=out(t/0.9)
        layer(p){move(0,(1-p)*60){
            line([CGPoint(x:495,y:467),CGPoint(x:754,y:467),CGPoint(x:754,y:627),CGPoint(x:1080,y:627)],"454B54",2)
            line([CGPoint(x:1164,y:468),CGPoint(x:1450,y:468),CGPoint(x:1450,y:626)],"454B54",2)
            node(162,347,"New subscriber","The journey begins",t>0.7,"star")
            node(754,347,"Welcome email","A personal hello",t>1.5)
            node(1080,627,"Wait 2 days","Right message. Right time.",t>2.35,"clock")
            node(291,627,"Follow up","Keep the conversation going",t>3.3)
            line([CGPoint(x:1080,y:687),CGPoint(x:701,y:687)],"454B54",2)
            for j in 0..<3 {let travel=(t*0.45+CGFloat(j)/3).truncatingRemainder(dividingBy:1);circle(mix(572,754,travel),467,5,paper,0.8)}
            for j in 0..<3 {let travel=(t*0.35+CGFloat(j)/3).truncatingRemainder(dividingBy:1);circle(mix(1080,701,travel),687,5,paper,0.8)}
        }}
        appear(t,1.15){text("Welcome. Nurture. Launch. Repeat.",960,863,32,silver,"light","center")}
    } else {
        let q=t-4.7
        appear(q){text("Every email.",95,232,101,paper,"bold","left",-4);text("One home.",95,345,101,paper,"bold","left",-4);text("Marketing + transactional",102,527,31,silver,"light")}
        for i in 0..<3 {let y:CGFloat=298+CGFloat(i)*202;appear(q,CGFloat(i)*0.16){
            line([CGPoint(x:870,y:y+53),CGPoint(x:1710,y:y+53)],"414750",1.5)
            let x=940+(q*0.32+CGFloat(i)*0.22).truncatingRemainder(dividingBy:1)*500
            layer(0.5){envelope(x,y+27,79,52,"9097A1",bg)}
            rect(860,y,248,105,"15181C",15);outline(860,y,248,105,"353A42",15)
            text(["Newsletters","Receipts","Login codes"][i],983,y+36,26,paper,"medium","center")
            circle(1736,y+52,45,paper);check(1723,y+46,bg,1.2)
        }}
    }
}
func audience(_ t:CGFloat) {
    rect(0,0,W,H,paper);brand(true);foot("06","GROW ON YOUR TERMS",true)
    // A whole audience expands around the central statement without affecting the bill.
    let expansion=out(t/2.1)
    for row in 0..<5 {for col in 0..<12 {
        let index=row*12+col
        let x=CGFloat(col)*164+52,y=CGFloat(row)*192+193
        let phase=CGFloat(index)*0.38
        let alpha=(0.08+0.07*sin(phase+t*0.7))*expansion
        layer(alpha){move(x,y+sin(t*0.6+phase)*10){circle(0,-17,13,"39414B");c.setFillColor(color("39414B"));c.fillEllipse(in:CGRect(x:-23,y:1,width:46,height:28))}}
    }}
    rect(358,249,1204,549,paper,35,0.97)
    if t<3.5 {
        appear(t){text("Unlimited",960,297,163,bg,"bold","center",-8);text("subscribers.",960,474,151,bg,"bold","center",-7)}
        appear(t,0.6){text("Let your audience grow.",960,690,34,"666D75","light","center")}
    } else {
        let q=t-3.5
        appear(q){text("Pay for sends.",960,346,136,bg,"bold","center",-6);text("Never for list size.",960,502,103,"69717A","light","center",-3.5)}
        appear(q,0.45){pill("More people. Same freedom.",733,694,455,true)}
    }
    let q=out((t-1.2)/1.5);line([CGPoint(x:431,y:816),CGPoint(x:431+1058*q,y:816)],"B5BBC2",2)
    circle(431+1058*q,816,6,bg)
}
func finale(_ t:CGFloat) {
    radial(960,490,900,0.16);brand();foot("07","YOUR NEXT CHAPTER")
    if t<3.75 {
        let p=out(t/0.9)
        text("Start something",960,195+(1-p)*80,73,paper,"bold","center",-2.5)
        let val=Int(3000*out((t-0.1)/1.05))
        let s=NumberFormatter.localizedString(from:NSNumber(value:val),number:.decimal)
        text(s,960,320,276,paper,"bold","center",-15)
        appear(t,0.4){text("emails / month. Free.",960,663,59,silver,"light","center",-1.8)}
        appear(t,0.75){label("NO CARD REQUIRED",837,805)}
        for i in 0..<6 {let a=CGFloat(i)*1.047+t*0.13;let x=960+cos(a)*750,y=530+sin(a)*330;layer(0.2){move(x,y,0.32,a*0.12){envelope(-110,-74,220,148,"757E8B",paper)}}}
    } else {
        let q=t-3.75
        let p=out(q/0.85)
        move(960,274,mix(0.7,1,p),(1-p)*(-0.15)){envelope(-84,-54,168,110,paper,bg)}
        appear(q,0.05){text("Lumail",960,396,178,paper,"bold","center",-9)}
        appear(q,0.25){text("Make your next email matter.",960,622,46,silver,"light","center",-1)}
        appear(q,0.5){rect(715,755,490,93,paper,47);text("Start free at lumail.io",941,783,30,bg,"medium","center",-0.7);arrow(1142,802,bg,0.78)}
        layer(smooth((q-0.85)/0.6)){text("3,000 emails / month free  ·  Unlimited subscribers",960,900,22,gray,"medium","center")}
    }
}
let cuts:[CGFloat]=[0,5.625,9.375,16.875,22.5,30,37.5,45]
func render(_ t:CGFloat) {
    rect(0,0,W,H,bg)
    if t<cuts[1]{intro(t)}else if t<cuts[2]{reveal(t-cuts[1])}else if t<cuts[3]{editor(t-cuts[2])}else if t<cuts[4]{agents(t-cuts[3])}else if t<cuts[5]{workflows(t-cuts[4])}else if t<cuts[6]{audience(t-cuts[5])}else{finale(t-cuts[6])}
    // Fast sliding shutters bridge selected cuts. No flashes or long cross-fades.
    for boundary in [CGFloat(9.375),22.5,30,37.5] {let d=t-boundary;if d>=0 && d<0.32 {let p=out(d/0.32);rect(W*p,0,W*(1-p),H,boundary==30 ? bg:paper)}}
    // Very fine geometric tick marks provide a consistent framing system.
    let dark=t>=9.375 && t<16.875 || t>=30 && t<37.5
    for x:CGFloat in [36,1884] {line([CGPoint(x:x,y:500),CGPoint(x:x,y:580)],dark ? "CACDD2":"373C43",1,0.6)}
}

let base=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let output=base.appendingPathComponent("silent.mp4")
if FileManager.default.fileExists(atPath:output.path){try FileManager.default.moveItem(at:output,to:base.appendingPathComponent("silent-previous-\(Int(Date().timeIntervalSince1970)).mp4"))}
let writer=try AVAssetWriter(outputURL:output,fileType:.mp4)
let settings:[String:Any]=[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:1920,AVVideoHeightKey:1080,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:16000000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,AVVideoMaxKeyFrameIntervalKey:120,AVVideoExpectedSourceFrameRateKey:60]]
let input=AVAssetWriterInput(mediaType:.video,outputSettings:settings)
input.expectsMediaDataInRealTime=false
let attrs:[String:Any]=[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:1920,kCVPixelBufferHeightKey as String:1080,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true]
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:attrs)
writer.add(input);writer.startWriting();writer.startSession(atSourceTime:.zero)
let captureFrames:Set<Int>=[165,453,780,1170,1500,1680,1920,2145,2370,2600]
try FileManager.default.createDirectory(at:base.appendingPathComponent("frames"),withIntermediateDirectories:true)
let start=Date()
for frame in 0..<2700 {
    autoreleasepool {
        while !input.isReadyForMoreMediaData {Thread.sleep(forTimeInterval:0.002)}
        var buffer:CVPixelBuffer?;CVPixelBufferPoolCreatePixelBuffer(nil,adaptor.pixelBufferPool!,&buffer)
        let pixel=buffer!;CVPixelBufferLockBaseAddress(pixel,[])
        c=CGContext(data:CVPixelBufferGetBaseAddress(pixel),width:1920,height:1080,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(pixel),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
        c.translateBy(x:0,y:H);c.scaleBy(x:1,y:-1);c.setAllowsAntialiasing(true);c.setShouldAntialias(true);c.interpolationQuality = .high
        render(CGFloat(frame)/60)
        if captureFrames.contains(frame),let img=c.makeImage() {
            let rep=NSBitmapImageRep(cgImage:img);let data=rep.representation(using:.jpeg,properties:[.compressionFactor:0.9])!
            try! data.write(to:base.appendingPathComponent("frames/\(frame).jpg"))
            if frame==2600{try! data.write(to:base.appendingPathComponent("poster.jpg"))}
        }
        CVPixelBufferUnlockBaseAddress(pixel,[])
        if !adaptor.append(pixel,withPresentationTime:CMTime(value:Int64(frame),timescale:fps)) {fatalError("Frame failed: \(writer.error!)")}
        c=nil
    }
    if frame%180==0 {print("Rendered \(frame)/2700 frames · \(Int(Date().timeIntervalSince(start))) s");fflush(stdout)}
}
input.markAsFinished();writer.endSession(atSourceTime:CMTime(value:45,timescale:1))
let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError("Render failed: \(String(describing:writer.error))")}
print("Finished: 1920×1080 · 60 fps · 45.000 seconds")
