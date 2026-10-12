import AppKit
import CoreGraphics
import CoreText
import Foundation

let W = 1280, H = 720, FPS = 24, DURATION = 45
let dark = CGColor(red: 8/255, green: 9/255, blue: 10/255, alpha: 1)
let white = CGColor(red: 247/255, green: 248/255, blue: 248/255, alpha: 1)
let muted = CGColor(red: 138/255, green: 143/255, blue: 152/255, alpha: 1)
let line = CGColor(red: 55/255, green: 58/255, blue: 63/255, alpha: 1)
let panel = CGColor(red: 19/255, green: 21/255, blue: 24/255, alpha: 1)
let lime = CGColor(red: 201/255, green: 204/255, blue: 209/255, alpha: 1)
let regular = CTFontCreateWithName("Geist-Regular" as CFString, 20, nil)
let mono = CTFontCreateWithName("GeistMono-Regular" as CFString, 20, nil)

func clamp(_ x: Double) -> Double { min(1, max(0, x)) }
func ease(_ x: Double) -> Double { let t = clamp(x); return 1 - pow(1-t, 3) }
func smooth(_ x: Double) -> Double { let t = clamp(x); return t*t*(3-2*t) }
func fade(_ t: Double, _ start: Double, _ end: Double, _ inTime: Double = 0.35, _ outTime: Double = 0.35) -> Double {
    min(smooth((t-start)/inTime), smooth((end-t)/outTime))
}

func box(_ c: CGContext, _ x: Double, _ y: Double, _ w: Double, _ h: Double, _ r: Double, _ fill: CGColor, _ stroke: CGColor? = nil, _ strokeWidth: Double = 1) {
    let p = CGPath(roundedRect: CGRect(x:x,y:Double(H)-y-h,width:w,height:h), cornerWidth:r,cornerHeight:r,transform:nil)
    c.addPath(p); c.setFillColor(fill); c.fillPath()
    if let stroke { c.addPath(p); c.setStrokeColor(stroke); c.setLineWidth(strokeWidth); c.strokePath() }
}
func stroke(_ c: CGContext, _ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double, _ color: CGColor, _ width: Double = 1) {
    c.setStrokeColor(color); c.setLineWidth(width); c.move(to:CGPoint(x:x1,y:Double(H)-y1)); c.addLine(to:CGPoint(x:x2,y:Double(H)-y2)); c.strokePath()
}
func circle(_ c: CGContext, _ x: Double, _ y: Double, _ radius: Double, _ color: CGColor) {
    c.setFillColor(color); c.fillEllipse(in:CGRect(x:x-radius,y:Double(H)-y-radius,width:radius*2,height:radius*2))
}
func txt(_ c: CGContext, _ s: String, _ x: Double, _ y: Double, _ size: Double, _ color: CGColor = white, _ weight: String = "Geist-Regular", _ opacity: Double = 1) {
    c.saveGState(); c.setAlpha(opacity)
    let font = CTFontCreateWithName(weight as CFString, size, nil)
    let a = NSAttributedString(string:s, attributes:[kCTFontAttributeName as NSAttributedString.Key:font,kCTForegroundColorAttributeName as NSAttributedString.Key:color])
    let l = CTLineCreateWithAttributedString(a)
    c.textPosition = CGPoint(x:x,y:Double(H)-y-size*0.93)
    CTLineDraw(l,c)
    c.restoreGState()
}
func width(_ s:String,_ size:Double,_ weight:String="Geist-Regular") -> Double {
    let font=CTFontCreateWithName(weight as CFString,size,nil)
    let a=NSAttributedString(string:s,attributes:[kCTFontAttributeName as NSAttributedString.Key:font])
    return CTLineGetTypographicBounds(CTLineCreateWithAttributedString(a),nil,nil,nil)
}
func centered(_ c:CGContext,_ s:String,_ y:Double,_ size:Double,_ color:CGColor=white,_ weight:String="Geist-Regular",_ opacity:Double=1) {
    txt(c,s,(Double(W)-width(s,size,weight))/2,y,size,color,weight,opacity)
}
func curve(_ c: CGContext, _ p:[CGPoint], _ color:CGColor, _ width:Double = 2) {
    c.setStrokeColor(color); c.setLineWidth(width); c.setLineCap(.round); c.move(to:p[0]);
    for q in p.dropFirst() { c.addLine(to:q) }; c.strokePath()
}
func brand(_ c:CGContext,_ light:Bool = true) {
    box(c,54,48,28,28,8,light ? white : dark)
    // Geometric L / envelope seam mark.
    stroke(c,61,57,61,69,light ? dark : white,2.5)
    stroke(c,61,69,73,69,light ? dark : white,2.5)
    txt(c,"lumail",92,46,26,light ? white : dark,"Geist-SemiBold")
}
func chapter(_ c:CGContext,_ n:String,_ label:String) {
    txt(c,n,56,652,13,muted,"GeistMono-Medium")
    stroke(c,94,662,135,662,line,1)
    txt(c,label.uppercased(),150,652,13,muted,"GeistMono-Medium")
}
func scene(_ c:CGContext,_ t:Double) {
    c.setFillColor(dark); c.fill(CGRect(x:0,y:0,width:W,height:H))
    // Fine background grid and moving scan line establish a product/technical visual system.
    c.saveGState(); c.setAlpha(0.18)
    for x in stride(from:0,through:W,by:64) { stroke(c,Double(x),0,Double(x),Double(H),line) }
    for y in stride(from:0,through:H,by:64) { stroke(c,0,Double(y),Double(W),Double(y),line) }
    c.restoreGState()
    let scan = (t*78).truncatingRemainder(dividingBy:720)
    c.saveGState(); c.setAlpha(0.18); stroke(c,0,scan,1280,scan,lime,1); c.restoreGState()
    brand(c)
    txt(c,"LUMAIL / LAUNCH FILM",1014,54,13,muted,"GeistMono-Medium")

    // 00–05  Manifesto: an editorial headline collides with a stamped answer.
    let a0=fade(t,0,5.3,0.5,0.5)
    if a0>0 {
        c.saveGState(); c.setAlpha(a0)
        txt(c,"EMAIL MARKETING,",82,203-18*ease(t/1.2),91,white,"Geist-SemiBold")
        txt(c,"WITHOUT THE WORK.",82,306-18*ease((t-0.4)/1.1),82,white,"Geist-SemiBold")
        let p=ease((t-1.8)/0.6)
        if p>0 { box(c,82,442,Double(508)*p,6,3,lime) }
        txt(c,"Write. Send. Grow. Repeat.",85,486,27,muted,"Geist-Regular",ease((t-2.1)/0.6))
        for i in 0..<10 {
            let q=Double(i), ang=t*0.8+q*0.628
            let x=1038+cos(ang)*(90+q*9), y=343+sin(ang)*(90+q*9)
            circle(c,x,y,2.5, i%3==0 ? lime : muted)
        }
        chapter(c,"01","A better way")
        c.restoreGState()
    }

    // 05–11  Editor: copy appears character by character; preview is the product payoff.
    let a1=fade(t,4.8,11.3,0.45,0.45)
    if a1>0 {
        c.saveGState(); c.setAlpha(a1)
        txt(c,"WRITE THE EMAIL.",72,147,67,white,"Geist-SemiBold")
        txt(c,"WE HANDLE THE REST.",72,221,54,muted,"Geist-Medium")
        let open=ease((t-5.2)/0.8)
        box(c,70,324+45*(1-open),740,270,18,panel,line)
        box(c,70,324+45*(1-open),740,51,18,CGColor(red:0.105,green:0.115,blue:0.13,alpha:1))
        circle(c,98,350+45*(1-open),5,muted);circle(c,117,350+45*(1-open),5,muted);circle(c,136,350+45*(1-open),5,muted)
        txt(c,"NEW CAMPAIGN",672,341+45*(1-open),12,muted,"GeistMono-Medium")
        let message="The best emails sound like you."
        let count=Int(Double(message.count)*clamp((t-6.0)/2.0))
        txt(c,String(message.prefix(count)),106,411,31,white,"Geist-Medium")
        if t<8.6 && Int(t*3)%2==0 { box(c,108+width(String(message.prefix(count)),31,"Geist-Medium"),413,2,34,0,lime) }
        txt(c,"A simple note, beautifully delivered.",106,468,20,muted)
        box(c,106,525,134,39,9,white); txt(c,"Send email →",122,535,15,dark,"Geist-SemiBold")
        let px=885+60*(1-ease((t-6.4)/0.8))
        box(c,px,354,312,211,16,white)
        txt(c,"INBOX PREVIEW",px+24,375,12,CGColor(red:0.48,green:0.51,blue:0.53,alpha:1),"GeistMono-Medium")
        txt(c,"The best emails",px+24,420,25,dark,"Geist-SemiBold")
        txt(c,"sound like you.",px+24,451,25,dark,"Geist-SemiBold")
        stroke(c,px+24,507,px+282,507,CGColor(red:0.82,green:0.83,blue:0.84,alpha:1))
        txt(c,"Lumail",px+24,525,15,dark,"Geist-Medium")
        chapter(c,"02","Editor")
        c.restoreGState()
    }

    // 11–17  The agent turns a plain-language prompt into an actionable audience.
    let a2=fade(t,10.8,17.2,0.4,0.4)
    if a2>0 {
        c.saveGState(); c.setAlpha(a2)
        txt(c,"ASK FOR THE WORK.",70,132,69,white,"Geist-SemiBold")
        txt(c,"NOT THE MENU PATH.",70,204,58,muted,"Geist-Medium")
        box(c,70,316,1138,225,17,panel,line)
        txt(c,"❯",105,351,29,lime,"GeistMono-Medium")
        let prompt="Who clicked pricing but never bought?"
        let n=Int(Double(prompt.count)*clamp((t-11.6)/1.3))
        txt(c,String(prompt.prefix(n)),148,354,31,white,"Geist-Regular")
        stroke(c,104,417,1173,417,line)
        let p=ease((t-13.4)/0.5)
        txt(c,"●",109,444,18,lime,"GeistMono-Regular",p)
        txt(c,"query_subscribers",142,444,20,white,"GeistMono-Regular",p)
        txt(c,"→  312 matched",895,444,20,muted,"GeistMono-Regular",p)
        let p2=ease((t-14.4)/0.5)
        txt(c,"●",109,486,18,lime,"GeistMono-Regular",p2)
        txt(c,"tag + enroll in follow-up",142,486,20,white,"GeistMono-Regular",p2)
        box(c,834,569,374*ease((t-15.0)/0.6),44,22,lime)
        txt(c,"AUDIENCE IN MOTION  ↗",858,582,16,dark,"GeistMono-Medium",ease((t-15.2)/0.4))
        chapter(c,"03","AI that acts")
        c.restoreGState()
    }

    // 17–23  Workflow graph with animated edges and a traveling signal.
    let a3=fade(t,16.7,23.3,0.45,0.45)
    if a3>0 {
        c.saveGState(); c.setAlpha(a3)
        txt(c,"SET IT IN MOTION.",70,133,70,white,"Geist-SemiBold")
        txt(c,"Sequences that keep running.",74,217,34,muted)
        let prog=ease((t-17.3)/1.3)
        stroke(c,243,419,485,419,line,3); stroke(c,694,419,851,419,line,3)
        stroke(c,991,420,991,528,line,3);stroke(c,991,528,1103,528,line,3)
        box(c,85,365,172,104,15,white); txt(c,"TRIGGER",108,384,13,muted,"GeistMono-Medium"); txt(c,"Tag added",108,412,23,dark,"Geist-SemiBold")
        box(c,470,365,240,104,15,panel,line);txt(c,"01 / SEND",494,384,13,lime,"GeistMono-Medium");txt(c,"Welcome email",494,412,23,white,"Geist-SemiBold")
        box(c,839,365,245,104,15,panel,line);txt(c,"02 / WAIT",863,384,13,lime,"GeistMono-Medium");txt(c,"2 days",863,412,23,white,"Geist-SemiBold")
        box(c,1037,488,170,80,14,white);txt(c,"IF OPENED",1056,510,12,muted,"GeistMono-Medium");txt(c,"Follow up ↗",1056,531,19,dark,"Geist-SemiBold")
        let paths:[(Double,Double,Double,Double)]=[(257,419,470,419),(710,419,839,419),(1084,419,1124,419),(1124,419,1124,488)]
        for (i,p) in paths.enumerated() {
            let q=clamp((prog*4-Double(i)))
            stroke(c,p.0,p.1,p.0+(p.2-p.0)*q,p.1+(p.3-p.1)*q,lime,3)
        }
        let cycle=(t-19.5).truncatingRemainder(dividingBy:2.2)/2.2
        let x=260+cycle*856
        if t>19.5 { circle(c,x,419,6,lime) }
        chapter(c,"04","Workflows")
        c.restoreGState()
    }

    // 23–29  Two lanes, one sending domain. The instant lane outruns the campaign.
    let a4=fade(t,22.8,29.2,0.4,0.4)
    if a4>0 {
        c.saveGState(); c.setAlpha(a4)
        txt(c,"ONE DOMAIN.",70,128,82,white,"Geist-SemiBold")
        txt(c,"EVERY EMAIL.",70,220,82,white,"Geist-SemiBold")
        txt(c,"Campaigns and transactional email, side by side.",74,328,27,muted)
        for j in 0..<2 {
            let y=443+Double(j)*100
            box(c,70,y,1138,72,13,panel,line)
            txt(c,j==0 ? "MARKETING" : "TRANSACTIONAL",100,y+23,17,j==0 ? muted : lime,"GeistMono-Medium")
            stroke(c,345,y+36,1162,y+36,j==0 ? muted : lime,2)
            for k in 0..<8 {
                let speed=j==0 ? 160.0 : 330.0
                let x=345+((t-23.4)*speed+Double(k)*120).truncatingRemainder(dividingBy:817)
                if t>23.4 { circle(c,x,y+36,j==0 ? 4 : 5,j==0 ? white : lime) }
            }
        }
        txt(c,"PRIORITY LANE  →",909,617,15,lime,"GeistMono-Medium")
        chapter(c,"05","Sending")
        c.restoreGState()
    }

    // 29–35  The economics: audience grows without growing the bill.
    let a5=fade(t,28.7,35.3,0.4,0.45)
    if a5>0 {
        c.saveGState(); c.setAlpha(a5)
        txt(c,"GROW THE LIST.",70,117,73,white,"Geist-SemiBold")
        txt(c,"NOT THE BILL.",70,197,73,white,"Geist-SemiBold")
        txt(c,"Unlimited subscribers. Pay for emails sent.",74,296,29,muted)
        let count=Int(200+49800*ease((t-29.7)/2.6))
        box(c,70,383,525,200,18,white)
        txt(c,"SUBSCRIBERS",102,413,15,CGColor(red:0.43,green:0.46,blue:0.49,alpha:1),"GeistMono-Medium")
        txt(c,String(format:"%02d,%03d",count/1000,count%1000),101,452,72,dark,"Geist-SemiBold")
        txt(c,"no per-contact pricing",105,540,17,CGColor(red:0.39,green:0.42,blue:0.45,alpha:1))
        box(c,630,383,578,200,18,panel,line)
        txt(c,"EMAILS SENT",662,413,15,muted,"GeistMono-Medium")
        let v=ease((t-30.4)/2.0)
        for i in 0..<17 {
            let h=20+Double((i*37)%103)*v
            box(c,662+Double(i)*29,543-h,15,h,4,i>12 ? lime : white)
        }
        txt(c,"Only sending moves the meter →",663,555,16,muted)
        chapter(c,"06","Fair pricing")
        c.restoreGState()
    }

    // 35–40  Bold editorial summary, precise numerals.
    let a6=fade(t,34.8,40.2,0.4,0.5)
    if a6>0 {
        c.saveGState(); c.setAlpha(a6)
        let titles=["DRAFT.","SEGMENT.","AUTOMATE.","SEND."]
        for (i,s) in titles.enumerated() {
            let p=ease((t-(35.1+Double(i)*0.55))/0.5)
            txt(c,s,77+12*(1-p),130+Double(i)*103,70,i==3 ? lime : white,"Geist-SemiBold",p)
            box(c,765,162+Double(i)*103,430*p,1,0,line)
            txt(c,String(format:"0%d",i+1),1129,129+Double(i)*103,27,muted,"GeistMono-Regular",p)
        }
        chapter(c,"07","Everything connected")
        c.restoreGState()
    }

    // 40–45  Final monochrome brand lockup with a single accent line.
    let a7=fade(t,39.6,45.2,0.5,0.6)
    if a7>0 {
        c.saveGState(); c.setAlpha(a7)
        box(c,0,0,1280,720,0,dark)
        let grow=ease((t-40.0)/0.9)
        centered(c,"lumail",198+25*(1-grow),148,white,"Geist-SemiBold")
        box(c,378,388,524*grow,5,2,lime)
        centered(c,"Email for people who write, ship and sell.",432,27,white,"Geist-Regular",ease((t-41.0)/0.6))
        box(c,488,519,304,65,14,white)
        centered(c,"Start free  →",536,27,dark,"Geist-SemiBold",ease((t-41.6)/0.5))
        centered(c,"lumail.io  ·  3,000 emails/month free  ·  no card",624,18,muted,"GeistMono-Regular",ease((t-42.0)/0.5))
        c.restoreGState()
    }
}

let bytes = W*H*4
let data = UnsafeMutablePointer<UInt8>.allocate(capacity: bytes)
defer { data.deallocate() }
let colorSpace=CGColorSpaceCreateDeviceRGB()
let bitmapInfo=CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
guard let c=CGContext(data:data,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:colorSpace,bitmapInfo:bitmapInfo) else { fatalError("No drawing context") }
let frames=CommandLine.arguments.count>1 ? 1 : FPS*DURATION
let start=CommandLine.arguments.count>1 ? Double(CommandLine.arguments[1])! : 0
for f in 0..<frames {
    let t=CommandLine.arguments.count>1 ? start : Double(f)/Double(FPS)
    scene(c,t)
    var done=0
    while done<bytes { let n=write(STDOUT_FILENO,data.advanced(by:done),bytes-done); if n<=0 { exit(1) }; done+=n }
}
