import AppKit
import CoreText
import Darwin
import Foundation

let W = 1920
let H = 1080
let FPS: Int32 = 30
let TOTAL = 45.0
let SCENE = 7.5
let TRANSITION = 0.72

func rgb(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: alpha)
}

let paper = rgb(0xF8F7F4)
let ink = rgb(0x1A1614)
let flare = rgb(0xFF3300)
let coral = rgb(0xF26A4B)
let peach = rgb(0xFFE3D9)
let wash = rgb(0xFBEEE7)
let ember = rgb(0xC4320A)
let white = rgb(0xFFFFFF)
let void = rgb(0x08090A)
let muted = rgb(0x827A74)
let lineColor = rgb(0xD9D4CE)
let softInk = rgb(0x36302C)

func clamp(_ x: CGFloat, _ a: CGFloat = 0, _ b: CGFloat = 1) -> CGFloat { min(max(x, a), b) }
func ease(_ x: CGFloat) -> CGFloat {
    let v = clamp(x)
    return v * v * (3 - 2 * v)
}
func pop(_ x: CGFloat) -> CGFloat {
    let v = clamp(x)
    return 1 + 1.4 * pow(v - 1, 3) + 0.4 * pow(v - 1, 2)
}

func rounded(_ c: CGContext, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat,
             _ radius: CGFloat, _ color: CGColor, stroke: CGColor? = nil, lineWidth: CGFloat = 1) {
    let rect = CGRect(x: x, y: CGFloat(H) - y - h, width: w, height: h)
    let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    c.addPath(path)
    c.setFillColor(color)
    if let stroke {
        c.setStrokeColor(stroke)
        c.setLineWidth(lineWidth)
        c.drawPath(using: .fillStroke)
    } else {
        c.fillPath()
    }
}

func circle(_ c: CGContext, _ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ color: CGColor,
            stroke: CGColor? = nil, lineWidth: CGFloat = 1) {
    let rect = CGRect(x: x - r, y: CGFloat(H) - y - r, width: r * 2, height: r * 2)
    c.addEllipse(in: rect)
    c.setFillColor(color)
    if let stroke {
        c.setStrokeColor(stroke)
        c.setLineWidth(lineWidth)
        c.drawPath(using: .fillStroke)
    } else {
        c.fillPath()
    }
}

func line(_ c: CGContext, _ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat,
          _ color: CGColor, width: CGFloat = 2) {
    c.beginPath()
    c.move(to: CGPoint(x: x1, y: CGFloat(H) - y1))
    c.addLine(to: CGPoint(x: x2, y: CGFloat(H) - y2))
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.setLineCap(.round)
    c.strokePath()
}

func curve(_ c: CGContext, _ points: [CGPoint], _ color: CGColor, width: CGFloat = 3) {
    guard points.count == 4 else { return }
    c.beginPath()
    c.move(to: CGPoint(x: points[0].x, y: CGFloat(H) - points[0].y))
    c.addCurve(to: CGPoint(x: points[3].x, y: CGFloat(H) - points[3].y),
               control1: CGPoint(x: points[1].x, y: CGFloat(H) - points[1].y),
               control2: CGPoint(x: points[2].x, y: CGFloat(H) - points[2].y))
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.setLineCap(.round)
    c.strokePath()
}

func text(_ c: CGContext, _ value: String, x: CGFloat, y: CGFloat, size: CGFloat,
          color: CGColor = ink, face: String = "Inter-Regular", tracking: CGFloat = 0,
          align: CTTextAlignment = .left) {
    let font = CTFontCreateWithName(face as CFString, size, nil)
    var attrs: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color
    ]
    if tracking != 0 { attrs[NSAttributedString.Key(kCTKernAttributeName as String)] = tracking }
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: value, attributes: attrs))
    let width = CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
    let ascent = CGFloat(CTFontGetAscent(font))
    var drawX = x
    if align == .center { drawX -= width / 2 }
    if align == .right { drawX -= width }
    c.saveGState()
    c.textMatrix = .identity
    c.textPosition = CGPoint(x: drawX, y: CGFloat(H) - y - ascent)
    CTLineDraw(line, c)
    c.restoreGState()
}

func label(_ c: CGContext, _ s: String, x: CGFloat, y: CGFloat, color: CGColor = ember) {
    text(c, s.uppercased(), x: x, y: y, size: 17, color: color,
         face: "GeistMono-Regular", tracking: 1.8)
}

func pill(_ c: CGContext, _ s: String, x: CGFloat, y: CGFloat, w: CGFloat,
          fill: CGColor = peach, color: CGColor = ember, size: CGFloat = 18) {
    rounded(c, x, y, w, 40, 20, fill)
    text(c, s, x: x + w / 2, y: y + 10, size: size, color: color,
         face: "Geist-Medium", align: .center)
}

func cardShadow(_ c: CGContext, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat,
                radius: CGFloat = 22, fill: CGColor = white) {
    c.saveGState()
    c.setShadow(offset: CGSize(width: 0, height: -12), blur: 28, color: rgb(0x201A17, 0.10))
    rounded(c, x, y, w, h, radius, fill)
    c.restoreGState()
    rounded(c, x, y, w, h, radius, fill, stroke: rgb(0x1A1614, 0.06), lineWidth: 1)
}

func arrow(_ c: CGContext, from: CGPoint, to: CGPoint, color: CGColor, width: CGFloat = 3) {
    line(c, from.x, from.y, to.x, to.y, color, width: width)
    let angle = atan2(to.y - from.y, to.x - from.x)
    let len: CGFloat = 13
    let left = CGPoint(x: to.x - len * cos(angle - .pi / 6), y: to.y - len * sin(angle - .pi / 6))
    let right = CGPoint(x: to.x - len * cos(angle + .pi / 6), y: to.y - len * sin(angle + .pi / 6))
    line(c, to.x, to.y, left.x, left.y, color, width: width)
    line(c, to.x, to.y, right.x, right.y, color, width: width)
}

func floatingDot(_ c: CGContext, x: CGFloat, y: CGFloat, r: CGFloat, t: CGFloat,
                 phase: CGFloat = 0, color: CGColor = flare) {
    let drift = sin(t * 1.3 + phase) * 9
    circle(c, x, y + drift, r, color)
}

func drawChaos(_ c: CGContext, t: CGFloat) {
    c.setFillColor(paper)
    c.fill(CGRect(x: 0, y: 0, width: W, height: H))
    label(c, "THE WORK SHOULD FEEL LIGHTER", x: 138, y: 120)
    let reveal = ease(t / 1.05)
    text(c, "Email marketing", x: 138, y: 202 + (1 - reveal) * 32, size: 72,
         color: ink, face: "Inter-Medium", tracking: -2.6)
    text(c, "shouldn't feel like", x: 138, y: 294 + (1 - reveal) * 32, size: 72,
         color: ink, face: "Inter-Medium", tracking: -2.6)
    text(c, "a second job.", x: 138, y: 386 + (1 - reveal) * 32, size: 72,
         color: ink, face: "Inter-Medium", tracking: -2.6)

    let scatter = 1 - ease((t - 2.2) / 2.3)
    let cards: [(CGFloat, CGFloat, CGFloat, String, String)] = [
        (1110, 190, 320, "TEMPLATES", "Start from a blank page"),
        (1350, 340, 350, "CAMPAIGN", "Choose who gets this"),
        (1010, 520, 330, "SETTINGS", "Check every tiny detail"),
        (1310, 670, 380, "SCHEDULE", "Find the right moment")
    ]
    for (i, item) in cards.enumerated() {
        let (x, y, width, heading, detail) = item
        let phase = CGFloat(i) * 0.9
        let jitterX = scatter * sin(t * 1.5 + phase) * 42
        let jitterY = scatter * cos(t * 1.4 + phase) * 26
        let a = clamp(1 - (t - 4.5) / 0.8)
        c.saveGState()
        c.setAlpha(a)
        cardShadow(c, x: x + jitterX, y: y + jitterY, w: width, h: 112, radius: 18, fill: white)
        circle(c, x + jitterX + 28, y + jitterY + 32, 6, flare)
        text(c, heading, x: x + jitterX + 50, y: y + jitterY + 20, size: 14,
             color: muted, face: "GeistMono-Medium", tracking: 1.5)
        text(c, detail, x: x + jitterX + 26, y: y + jitterY + 57, size: 20,
             color: ink, face: "Geist-Medium")
        c.restoreGState()
    }

    if t > 3.7 {
        let a = ease((t - 3.7) / 0.65)
        c.saveGState()
        c.setAlpha(a)
        rounded(c, 1144, 280, 510, 430, 28, wash)
        cardShadow(c, x: 1180, y: 314, w: 480, h: 375, radius: 20)
        circle(c, 1230, 366, 9, flare)
        text(c, "A note for your people", x: 1270, y: 350, size: 23,
             color: ink, face: "Inter-SemiBold")
        line(c, 1212, 410, 1627, 410, rgb(0xE9E4DE), width: 1)
        rounded(c, 1212, 440, 374, 12, 6, rgb(0xE9E4DE))
        rounded(c, 1212, 468, 340, 12, 6, rgb(0xE9E4DE))
        rounded(c, 1212, 496, 395, 12, 6, rgb(0xE9E4DE))
        rounded(c, 1212, 540, 245, 46, 14, flare)
        text(c, "Read the update", x: 1334, y: 552, size: 17,
             color: white, face: "Geist-SemiBold", align: .center)
        label(c, "IDEA → INBOX", x: 1212, y: 626, color: ember)
        c.restoreGState()
    }
    for i in 0..<7 {
        let x = CGFloat(250 + i * 58)
        floatingDot(c, x: x, y: 760 + CGFloat(i % 2) * 26, r: 3.5,
                    t: t, phase: CGFloat(i) * 0.6, color: rgb(0xD3CDC6))
    }
}

func drawEditor(_ c: CGContext, t: CGFloat) {
    c.setFillColor(paper)
    c.fill(CGRect(x: 0, y: 0, width: W, height: H))
    label(c, "MAKE ROOM FOR THE IDEA", x: 135, y: 115)
    let slide = 1 - ease(t / 0.85)
    cardShadow(c, x: 122 + slide * 48, y: 178, w: 805, h: 728, radius: 24, fill: white)
    line(c, 122, 254, 927, 254, rgb(0xE7E2DC), width: 1)
    circle(c, 157, 216, 6, rgb(0xD5CFC9))
    circle(c, 177, 216, 6, rgb(0xD5CFC9))
    circle(c, 197, 216, 6, rgb(0xD5CFC9))
    text(c, "Campaign draft", x: 235, y: 203, size: 18, color: muted, face: "Geist-Medium")
    text(c, "Weekly notes · Draft", x: 174, y: 300, size: 20, color: ember,
         face: "Geist-Medium")
    text(c, "A better way", x: 174, y: 358, size: 46, color: ink,
         face: "Inter-Medium", tracking: -1.2)
    text(c, "to stay in touch", x: 174, y: 414, size: 46, color: ink,
         face: "Inter-Medium", tracking: -1.2)
    let writing = ease((t - 0.4) / 1.4)
    rounded(c, 174, 497, 610 * writing, 10, 5, rgb(0xD9D4CE))
    rounded(c, 174, 525, 525 * writing, 10, 5, rgb(0xD9D4CE))
    rounded(c, 174, 553, 562 * writing, 10, 5, rgb(0xD9D4CE))
    rounded(c, 174, 581, 460 * writing, 10, 5, rgb(0xD9D4CE))
    let slash = ease((t - 1.9) / 0.45)
    if slash > 0 {
        c.saveGState(); c.setAlpha(slash)
        circle(c, 639, 640, 12, flare)
        cardShadow(c, x: 565, y: 657, w: 260, h: 184, radius: 16)
        text(c, "Add a block", x: 589, y: 680, size: 16, color: muted, face: "Geist-Medium")
        line(c, 588, 715, 800, 715, rgb(0xECE8E3), width: 1)
        text(c, "/button", x: 588, y: 736, size: 19, color: ink, face: "GeistMono-Medium")
        text(c, "/image", x: 588, y: 768, size: 19, color: ink, face: "GeistMono-Regular")
        text(c, "/columns", x: 588, y: 800, size: 19, color: ink, face: "GeistMono-Regular")
        c.restoreGState()
    }

    let headlineY = 252 + (1 - ease((t - 0.15) / 0.8)) * 25
    text(c, "Write the email,", x: 1060, y: headlineY, size: 70,
         color: ink, face: "Inter-Medium", tracking: -2.6)
    text(c, "not the layout.", x: 1060, y: headlineY + 88, size: 70,
         color: ink, face: "Inter-Medium", tracking: -2.6)
    text(c, "Type like a document. Add only what", x: 1065, y: 462, size: 27,
         color: softInk, face: "Geist-Regular")
    text(c, "your idea needs. Your voice stays yours.", x: 1065, y: 501, size: 27,
         color: softInk, face: "Geist-Regular")
    pill(c, "FOCUS MODE", x: 1065, y: 598, w: 174)
    pill(c, "AI WHEN YOU ASK", x: 1252, y: 598, w: 250, fill: wash, color: ember)
    rounded(c, 1064, 704, 572, 70, 18, ink)
    text(c, "A blank page. A clear thought.", x: 1096, y: 725, size: 22,
         color: white, face: "Geist-Medium")
    circle(c, 1599, 739, 10, flare)
}

func drawAI(_ c: CGContext, t: CGFloat) {
    c.setFillColor(void)
    c.fill(CGRect(x: 0, y: 0, width: W, height: H))
    for i in 0..<22 {
        let x = CGFloat((i * 197 + 83) % 1920)
        let y = CGFloat((i * 109 + 38) % 1080)
        circle(c, x, y, (i % 3 == 0) ? 2 : 1.2, rgb(0xFFFFFF, 0.13))
    }
    label(c, "YOUR WORKFLOW, IN YOUR WORDS", x: 138, y: 116, color: coral)
    text(c, "AI that moves", x: 138, y: 216, size: 72, color: white,
         face: "Inter-Medium", tracking: -2.5)
    text(c, "work forward.", x: 138, y: 304, size: 72, color: white,
         face: "Inter-Medium", tracking: -2.5)
    text(c, "Tell it what you need.", x: 142, y: 434, size: 28,
         color: rgb(0xC6C0BA), face: "Geist-Regular")
    text(c, "Keep the last click.", x: 142, y: 477, size: 28,
         color: rgb(0xC6C0BA), face: "Geist-Regular")

    let promptIn = ease((t - 0.25) / 0.7)
    c.saveGState(); c.setAlpha(promptIn)
    rounded(c, 138, 608, 620, 160, 22, rgb(0x171819), stroke: rgb(0xFFFFFF, 0.12), lineWidth: 1)
    text(c, "PROMPT", x: 168, y: 633, size: 15, color: coral,
         face: "GeistMono-Medium", tracking: 1.7)
    text(c, "Draft a launch note for the people", x: 168, y: 669, size: 22,
         color: white, face: "Geist-Regular")
    text(c, "who signed up this week.", x: 168, y: 702, size: 22,
         color: white, face: "Geist-Regular")
    rounded(c, 616, 722, 112, 32, 10, rgb(0x242628))
    text(c, "↵  SEND", x: 672, y: 729, size: 14, color: rgb(0xD7D2CC),
         face: "GeistMono-Medium", tracking: 1, align: .center)
    c.restoreGState()

    let baseX: CGFloat = 900
    let stages: [(String, String)] = [("01", "DRAFT"), ("02", "SEGMENT"), ("03", "SCHEDULE")]
    for i in 0..<3 {
        let x = baseX + CGFloat(i) * 275
        let delay = CGFloat(i) * 0.22
        let a = ease((t - 0.75 - delay) / 0.55)
        c.saveGState(); c.setAlpha(a)
        rounded(c, x, 340, 234, 184, 22, rgb(0x151718), stroke: rgb(0xFFFFFF, 0.14), lineWidth: 1)
        text(c, stages[i].0, x: x + 25, y: 365, size: 15, color: coral,
             face: "GeistMono-Medium", tracking: 1.4)
        text(c, stages[i].1, x: x + 25, y: 406, size: 20, color: white,
             face: "Geist-SemiBold", tracking: 0.8)
        line(c, x + 25, 448, x + 208, 448, rgb(0xFFFFFF, 0.12), width: 1)
        if i == 0 {
            text(c, "Subject + copy", x: x + 25, y: 468, size: 16, color: rgb(0xBFB9B2), face: "Geist-Regular")
        } else if i == 1 {
            text(c, "The right readers", x: x + 25, y: 468, size: 16, color: rgb(0xBFB9B2), face: "Geist-Regular")
        } else {
            text(c, "Ready for review", x: x + 25, y: 468, size: 16, color: rgb(0xBFB9B2), face: "Geist-Regular")
        }
        if i < 2 {
            let x0 = x + 240
            let x1 = x + 269
            let progress = ease((t - 1.35 - CGFloat(i) * 0.38) / 0.55)
            line(c, x0, 432, x1, 432, rgb(0xFFFFFF, 0.3), width: 2)
            if progress > 0 { circle(c, x0 + (x1 - x0) * progress, 432, 5, flare) }
        }
        c.restoreGState()
    }
    if t > 2.3 {
        let a = ease((t - 2.3) / 0.5)
        c.saveGState(); c.setAlpha(a)
        rounded(c, 1052, 606, 510, 92, 18, flare)
        text(c, "Review campaign", x: 1307, y: 634, size: 23,
             color: white, face: "Geist-SemiBold", align: .center)
        text(c, "YOU DECIDE WHEN IT GOES", x: 1307, y: 671, size: 13,
             color: rgb(0xFFFFFF, 0.8), face: "GeistMono-Medium", tracking: 1.5, align: .center)
        c.restoreGState()
    }
    text(c, "Draft. Segment. Schedule.", x: 900, y: 796, size: 23,
         color: rgb(0xC6C0BA), face: "Geist-Regular")
    circle(c, 862 + sin(t * 1.2) * 10, 431, 5, flare)
}

func drawWorkflow(_ c: CGContext, t: CGFloat) {
    c.setFillColor(paper)
    c.fill(CGRect(x: 0, y: 0, width: W, height: H))
    label(c, "SET IT ONCE. LET IT RUN.", x: 138, y: 116)
    text(c, "Sequences that", x: 138, y: 213, size: 74,
         color: ink, face: "Inter-Medium", tracking: -2.7)
    text(c, "keep running.", x: 138, y: 303, size: 74,
         color: ink, face: "Inter-Medium", tracking: -2.7)
    text(c, "Welcome, launch, follow-up.", x: 142, y: 438, size: 27,
         color: softInk, face: "Geist-Regular")
    text(c, "Publish once. Lumail handles the", x: 142, y: 480, size: 27,
         color: softInk, face: "Geist-Regular")
    text(c, "timing, branches and exits.", x: 142, y: 522, size: 27,
         color: softInk, face: "Geist-Regular")
    pill(c, "WORKFLOWS", x: 142, y: 610, w: 183)

    let pathAlpha = ease((t - 0.4) / 0.65)
    c.saveGState(); c.setAlpha(pathAlpha)
    curve(c, [CGPoint(x: 955, y: 397), CGPoint(x: 1060, y: 397), CGPoint(x: 1060, y: 397), CGPoint(x: 1140, y: 397)], rgb(0xD0C9C2), width: 4)
    curve(c, [CGPoint(x: 1357, y: 397), CGPoint(x: 1455, y: 397), CGPoint(x: 1455, y: 397), CGPoint(x: 1515, y: 397)], rgb(0xD0C9C2), width: 4)
    curve(c, [CGPoint(x: 1625, y: 458), CGPoint(x: 1625, y: 570), CGPoint(x: 1490, y: 635), CGPoint(x: 1400, y: 680)], rgb(0xD0C9C2), width: 4)
    curve(c, [CGPoint(x: 1625, y: 458), CGPoint(x: 1700, y: 505), CGPoint(x: 1700, y: 595), CGPoint(x: 1700, y: 635)], rgb(0xD0C9C2), width: 4)
    c.restoreGState()

    let nodes: [(CGFloat, CGFloat, CGFloat, CGFloat, String, String)] = [
        (805, 340, 150, 114, "TRIGGER", "Tag added"),
        (1140, 340, 217, 114, "EMAIL", "Welcome, start here"),
        (1515, 340, 217, 114, "WAIT", "2 days"),
        (1295, 650, 215, 114, "IF OPENED", "welcome email"),
        (1605, 635, 185, 110, "YES / NO", "Next step")
    ]
    for (i, node) in nodes.enumerated() {
        let (x, y, w, h, title, detail) = node
        let a = ease((t - 0.45 - CGFloat(i) * 0.24) / 0.55)
        c.saveGState(); c.setAlpha(a)
        cardShadow(c, x: x, y: y + (1 - a) * 22, w: w, h: h, radius: 18)
        circle(c, x + 27, y + 28, 6, i == 0 ? flare : rgb(0xD48A67))
        text(c, title, x: x + 44, y: y + 17, size: 13, color: muted,
             face: "GeistMono-Medium", tracking: 1.2)
        text(c, detail, x: x + 22, y: y + 56, size: 18, color: ink,
             face: "Geist-SemiBold")
        c.restoreGState()
    }
    let pulse = (t.truncatingRemainder(dividingBy: 1.6)) / 1.6
    let bx: CGFloat = pulse < 0.48 ? 955 + (1140 - 955) * CGFloat(pulse / 0.48) :
        1140 + (1515 - 1140) * CGFloat((pulse - 0.48) / 0.52)
    let by: CGFloat = 397
    circle(c, bx, by, 8, flare)
    text(c, "One visual flow. Clear control.", x: 1282, y: 839, size: 21,
         color: muted, face: "Geist-Regular")
}

func drawOneDomain(_ c: CGContext, t: CGFloat) {
    c.setFillColor(wash)
    c.fill(CGRect(x: 0, y: 0, width: W, height: H))
    label(c, "MARKETING + TRANSACTIONAL", x: 138, y: 116)
    text(c, "One domain.", x: 138, y: 210, size: 76,
         color: ink, face: "Inter-Medium", tracking: -2.8)
    text(c, "Two clear lanes.", x: 138, y: 302, size: 76,
         color: ink, face: "Inter-Medium", tracking: -2.8)
    text(c, "Newsletters, sequences, receipts and", x: 142, y: 432, size: 26,
         color: softInk, face: "Geist-Regular")
    text(c, "login codes from the domain you know.", x: 142, y: 472, size: 26,
         color: softInk, face: "Geist-Regular")

    let slide = 1 - ease(t / 0.7)
    cardShadow(c, x: 136, y: 622, w: 475, h: 172, radius: 22)
    rounded(c, 171, 655, 48, 48, 15, peach)
    text(c, "✉", x: 195, y: 663, size: 25, color: ember, face: "Inter-Regular", align: .center)
    text(c, "CAMPAIGN LANE", x: 241, y: 655, size: 14,
         color: muted, face: "GeistMono-Medium", tracking: 1.3)
    text(c, "The weekly note", x: 171, y: 720, size: 24, color: ink, face: "Geist-SemiBold")
    text(c, "To the people who signed up", x: 171, y: 758, size: 17, color: muted, face: "Geist-Regular")
    rounded(c, 136, 822, 475, 54, 16, white, stroke: rgb(0x1A1614, 0.06), lineWidth: 1)
    text(c, "TRANSACTIONAL · PRIORITY LANE", x: 373, y: 839, size: 14,
         color: ember, face: "GeistMono-Medium", tracking: 0.8, align: .center)

    let cardX: CGFloat = 710 + slide * 70
    cardShadow(c, x: cardX, y: 610, w: 415, h: 205, radius: 24)
    rounded(c, cardX + 33, 646, 45, 45, 14, ink)
    circle(c, cardX + 55, 668, 7, flare)
    text(c, "SAME DOMAIN", x: cardX + 99, y: 650, size: 14,
         color: muted, face: "GeistMono-Medium", tracking: 1.3)
    text(c, "yourdomain.com", x: cardX + 33, y: 713, size: 31,
         color: ink, face: "Geist-SemiBold")
    text(c, "Verified sender · one place to manage", x: cardX + 33, y: 764,
         size: 16, color: muted, face: "Geist-Regular")

    curve(c, [CGPoint(x: 612, y: 701), CGPoint(x: 667, y: 701), CGPoint(x: 675, y: 675), CGPoint(x: 710, y: 675)], rgb(0xDEA18C), width: 3)
    curve(c, [CGPoint(x: 612, y: 849), CGPoint(x: 668, y: 849), CGPoint(x: 680, y: 763), CGPoint(x: 710, y: 763)], flare, width: 3)
    let p1 = (t * 0.36).truncatingRemainder(dividingBy: 1)
    let p2 = (t * 0.84).truncatingRemainder(dividingBy: 1)
    circle(c, 612 + 98 * p1, 701 - 26 * sin(p1 * .pi), 8, coral)
    circle(c, 612 + 98 * p2, 849 - 86 * p2, 7, flare)

    arrow(c, from: CGPoint(x: 1128, y: 706), to: CGPoint(x: 1324, y: 706), color: rgb(0xC9B7AE), width: 3)
    let domainIn = ease((t - 1.2) / 0.6)
    c.saveGState(); c.setAlpha(domainIn)
    rounded(c, 1344, 606, 435, 206, 30, ink)
    text(c, "YOUR SENDING DOMAIN", x: 1561, y: 645, size: 14,
         color: rgb(0xC9BEB5), face: "GeistMono-Medium", tracking: 1.1, align: .center)
    text(c, "one domain", x: 1561, y: 695, size: 34,
         color: white, face: "Inter-Medium", tracking: -0.5, align: .center)
    text(c, "Campaign + transactional", x: 1561, y: 752, size: 17,
         color: rgb(0xC9BEB5), face: "Geist-Regular", align: .center)
    c.restoreGState()
}

func drawPricing(_ c: CGContext, t: CGFloat) {
    c.setFillColor(paper)
    c.fill(CGRect(x: 0, y: 0, width: W, height: H))
    label(c, "A FAIRER WAY TO GROW", x: 138, y: 116)
    text(c, "Keep every", x: 138, y: 215, size: 76,
         color: ink, face: "Inter-Medium", tracking: -2.7)
    text(c, "subscriber.", x: 138, y: 308, size: 76,
         color: ink, face: "Inter-Medium", tracking: -2.7)
    text(c, "Your bill follows the emails you send.", x: 142, y: 431, size: 27,
         color: softInk, face: "Geist-Regular")
    cardShadow(c, x: 138, y: 548, w: 690, h: 258, radius: 26)
    text(c, "SUBSCRIBERS", x: 174, y: 584, size: 14, color: muted,
         face: "GeistMono-Medium", tracking: 1.6)
    text(c, "Unlimited", x: 174, y: 619, size: 40, color: ink,
         face: "Inter-Medium", tracking: -1.0)
    text(c, "No fee for the list you keep", x: 174, y: 675, size: 18,
         color: muted, face: "Geist-Regular")
    line(c, 502, 580, 502, 754, rgb(0xEAE5DF), width: 1)
    text(c, "EMAILS SENT", x: 546, y: 584, size: 14, color: muted,
         face: "GeistMono-Medium", tracking: 1.6)
    text(c, "3,000", x: 546, y: 619, size: 40, color: ember,
         face: "Inter-Medium", tracking: -1.0)
    text(c, "included each month", x: 546, y: 675, size: 18,
         color: muted, face: "Geist-Regular")
    rounded(c, 174, 727, 588, 14, 7, rgb(0xEEE9E3))
    let fill = ease(t / 3.2)
    rounded(c, 174, 727, 588 * fill, 14, 7, flare)
    for i in 0..<20 {
        let angle = CGFloat(i) * 2.0 * .pi / 20
        let radius: CGFloat = 28 + 8 * sin(t * 2 + angle)
        let x = 1047 + cos(angle + t * 0.22) * radius * 3.5
        let y = 674 + sin(angle + t * 0.22) * radius * 2.0
        circle(c, x, y, (i % 5 == 0) ? 7 : 4.5, i % 5 == 0 ? flare : rgb(0xD8CEC5))
    }
    text(c, "List size", x: 1047, y: 548, size: 19, color: muted,
         face: "Geist-Regular", align: .center)
    text(c, "doesn't set the price.", x: 1047, y: 808, size: 22,
         color: ink, face: "Geist-SemiBold", align: .center)
    let outbound = ease((t - 1.0) / 1.0)
    arrow(c, from: CGPoint(x: 1215, y: 674), to: CGPoint(x: 1417, y: 674), color: rgb(0xC8BDB3), width: 3)
    rounded(c, 1443, 585, 330, 178, 26, ink)
    text(c, "SEND", x: 1608, y: 619, size: 14, color: rgb(0xC9BEB5),
         face: "GeistMono-Medium", tracking: 1.8, align: .center)
    text(c, "Pay for sends.", x: 1608, y: 660, size: 27, color: white,
         face: "Inter-Medium", align: .center)
    rounded(c, 1536, 714, 144, 14, 7, rgb(0x34302D))
    rounded(c, 1536, 714, 144 * outbound, 14, 7, flare)
    if t > 3.7 {
        let end = ease((t - 3.7) / 0.55)
        c.saveGState(); c.setAlpha(end)
        rounded(c, 0, 0, 1920, 1080, 0, paper)
        let scale = 0.82 + 0.18 * pop((t - 3.7) / 0.6)
        c.saveGState()
        c.translateBy(x: 960, y: 548)
        c.scaleBy(x: scale, y: scale)
        c.translateBy(x: -960, y: -548)
        text(c, "Lumail", x: 960, y: 358, size: 118, color: ink,
             face: "Inter-SemiBold", tracking: -3.2, align: .center)
        rounded(c, 912, 507, 96, 8, 4, flare)
        text(c, "Import your list. Send tonight.", x: 960, y: 572, size: 32,
             color: ink, face: "Inter-Regular", tracking: -0.6, align: .center)
        rounded(c, 795, 665, 330, 58, 17, flare)
        text(c, "3,000 EMAILS / MONTH · FREE", x: 960, y: 681, size: 16,
             color: white, face: "GeistMono-Medium", tracking: 1.3, align: .center)
        text(c, "lumail.io", x: 960, y: 800, size: 21,
             color: muted, face: "GeistMono-Regular", tracking: 1.3, align: .center)
        c.restoreGState()
        c.restoreGState()
    }
}

func drawScene(_ c: CGContext, index: Int, t: CGFloat) {
    switch index {
    case 0: drawChaos(c, t: t)
    case 1: drawEditor(c, t: t)
    case 2: drawAI(c, t: t)
    case 3: drawWorkflow(c, t: t)
    case 4: drawOneDomain(c, t: t)
    default: drawPricing(c, t: t)
    }
}

func renderFrame(_ base: UnsafeMutableRawPointer, time: CGFloat) throws {
    let bytesPerRow = W * 4
    let space = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(data: base, width: W, height: H, bitsPerComponent: 8,
                                  bytesPerRow: bytesPerRow, space: space,
                                  bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue |
                                    CGImageAlphaInfo.premultipliedFirst.rawValue) else {
        throw NSError(domain: "LumailVideo", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create drawing context"])
    }
    context.setAllowsAntialiasing(true)
    context.setShouldAntialias(true)
    context.interpolationQuality = .high

    let safeTime = min(max(time, 0), TOTAL - 1 / CGFloat(FPS))
    let rawIndex = Int(safeTime / SCENE)
    let index = min(max(rawIndex, 0), 5)
    let local = safeTime - CGFloat(index) * SCENE
    if index < 5 && local > CGFloat(SCENE) - CGFloat(TRANSITION) {
        let p = ease((local - (CGFloat(SCENE) - CGFloat(TRANSITION))) / CGFloat(TRANSITION))
        context.saveGState(); context.setAlpha(1 - p)
        drawScene(context, index: index, t: local)
        context.restoreGState()
        context.saveGState(); context.setAlpha(p)
        drawScene(context, index: index + 1, t: 0)
        context.restoreGState()
    } else {
        drawScene(context, index: index, t: local)
    }
    context.flush()
}

let frameCount = Int(TOTAL * Double(FPS))
let frameBytes = W * H * 4
let buffer = UnsafeMutableRawPointer.allocate(byteCount: frameBytes, alignment: 64)
defer { buffer.deallocate() }

func writeFrame(_ pointer: UnsafeRawPointer, bytes: Int) throws {
    var offset = 0
    while offset < bytes {
        let result = Darwin.write(STDOUT_FILENO, pointer.advanced(by: offset), bytes - offset)
        if result <= 0 {
            throw NSError(domain: "LumailVideo", code: 8, userInfo: [NSLocalizedDescriptionKey: "Raw frame output stopped at byte \(offset)"])
        }
        offset += result
    }
}

for frame in 0..<frameCount {
    try autoreleasepool {
        try renderFrame(buffer, time: CGFloat(frame) / CGFloat(FPS))
        try writeFrame(UnsafeRawPointer(buffer), bytes: frameBytes)
    }
    if frame % 150 == 0 { fputs("Rendered \(frame)/\(frameCount) frames\n", stderr) }
}
fputs("Rendered \(frameCount) frames · \(W)x\(H) · \(TOTAL)s\n", stderr)
