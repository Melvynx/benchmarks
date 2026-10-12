import Foundation
import CoreGraphics
import ImageIO
let commands = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: ".verification/draw-commands.json"))) as! [[String: Any]]
let w = 938, h = 440
let ctx = CGContext(data:nil,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.translateBy(x:0,y:CGFloat(h));ctx.scaleBy(x:1,y:-1)
func color(_ value:String) -> CGColor {let hex=value.replacingOccurrences(of:"#",with:"");let n=UInt64(hex,radix:16) ?? 0;let alpha=hex.count==8 ? CGFloat(n&255)/255 : 1;let shifted=hex.count==8 ? n>>8 : n;return CGColor(red:CGFloat((shifted>>16)&255)/255,green:CGFloat((shifted>>8)&255)/255,blue:CGFloat(shifted&255)/255,alpha:alpha)}
ctx.setFillColor(color("#faf9f0"));ctx.fill(CGRect(x:0,y:0,width:w,height:h))
struct Gradient {var radial:Bool;var numbers:[CGFloat];var stops:[CGFloat]=[];var colors:[CGColor]=[]}
var gradients:[Int:Gradient]=[:],path=CGMutablePath(),fill:Any="#000000",stroke="#000000",stack:[(Any,String)]=[]
for cmd in commands {let op=cmd["op"] as! String;let a=cmd["args"] as? [Any] ?? [];let n=a.compactMap{($0 as? NSNumber).map{CGFloat(truncating:$0)}}
 switch op {
 case "createLinearGradient","createRadialGradient":gradients[cmd["id"] as! Int]=Gradient(radial:op=="createRadialGradient",numbers:n)
 case "stop":let id=cmd["id"] as! Int;gradients[id]!.stops.append(n[0]);gradients[id]!.colors.append(color(a[1] as! String))
 case "set":let key=cmd["key"] as! String;let v=cmd["value"]!;switch key {case "fillStyle":fill=v;case "strokeStyle":stroke=v as! String;case "lineWidth":ctx.setLineWidth(CGFloat(truncating:v as! NSNumber));case "globalAlpha":ctx.setAlpha(CGFloat(truncating:v as! NSNumber));case "lineCap":ctx.setLineCap((v as! String)=="round" ? .round:.butt);case "lineJoin":ctx.setLineJoin(.round);default:break}
 case "beginPath":path=CGMutablePath()
 case "moveTo":path.move(to:CGPoint(x:n[0],y:n[1]))
 case "lineTo":path.addLine(to:CGPoint(x:n[0],y:n[1]))
 case "bezierCurveTo":path.addCurve(to:CGPoint(x:n[4],y:n[5]),control1:CGPoint(x:n[0],y:n[1]),control2:CGPoint(x:n[2],y:n[3]))
 case "quadraticCurveTo":path.addQuadCurve(to:CGPoint(x:n[2],y:n[3]),control:CGPoint(x:n[0],y:n[1]))
 case "closePath":path.closeSubpath()
 case "ellipse":let transform=CGAffineTransform(translationX:n[0],y:n[1]).rotated(by:n[4]).scaledBy(x:n[2],y:n[3]);path.addArc(center:.zero,radius:1,startAngle:n[5],endAngle:n[6],clockwise:false,transform:transform)
 case "fill":if let ref=fill as? [String:Int],let g=gradients[ref["gradient"]!]{ctx.saveGState();ctx.addPath(path);ctx.clip();let grad=CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:g.colors as CFArray,locations:g.stops)!;let p=g.numbers;if g.radial {ctx.drawRadialGradient(grad,startCenter:CGPoint(x:p[0],y:p[1]),startRadius:p[2],endCenter:CGPoint(x:p[3],y:p[4]),endRadius:p[5],options:[.drawsBeforeStartLocation,.drawsAfterEndLocation])}else{ctx.drawLinearGradient(grad,start:CGPoint(x:p[0],y:p[1]),end:CGPoint(x:p[2],y:p[3]),options:[.drawsBeforeStartLocation,.drawsAfterEndLocation])};ctx.restoreGState()}else{ctx.setFillColor(color(fill as? String ?? "#000000"));ctx.addPath(path);ctx.fillPath()}
 case "stroke":ctx.setStrokeColor(color(stroke));ctx.addPath(path);ctx.strokePath()
 case "clip":ctx.addPath(path);ctx.clip()
 case "save":ctx.saveGState();stack.append((fill,stroke))
 case "restore":ctx.restoreGState();if let state=stack.popLast(){fill=state.0;stroke=state.1}
 case "translate":ctx.translateBy(x:n[0],y:n[1])
 case "rotate":ctx.rotate(by:n[0])
 case "setLineDash":let values=(a.first as? [NSNumber] ?? []).map{CGFloat(truncating:$0)};ctx.setLineDash(phase:0,lengths:values)
 default:break
 }
}
let image=ctx.makeImage()!
let url=URL(fileURLWithPath:".verification/garden-preview.png")
let dest=CGImageDestinationCreateWithURL(url as CFURL,"public.png" as CFString,1,nil)!
CGImageDestinationAddImage(dest,image,nil);CGImageDestinationFinalize(dest)
print("Rendered garden preview to .verification/garden-preview.png")
