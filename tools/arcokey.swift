import Foundation
import AppKit

// arcokey — turn white-background JPGs into clean transparent PNGs,
// normalised so a run cycle keeps one size and one centre.
//
//   arcokey <outSize> <mode: each|cycle> <outDir> <namePrefix> <inputs...>

let KEY_MIN = Int(ProcessInfo.processInfo.environment["ARCOKEY_MIN"] ?? "222") ?? 222
let KEY_TOL = Int(ProcessInfo.processInfo.environment["ARCOKEY_TOL"] ?? "20") ?? 20

struct Frame {
    var w = 0, h = 0
    var px: [UInt8] = []          // RGBA8, premultiplied-last
    var minX = 0, minY = 0, maxX = 0, maxY = 0
}

func load(_ path: String) -> (CGImage, Int, Int)? {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
    return (img, img.width, img.height)
}

func rasterise(_ img: CGImage, _ w: Int, _ h: Int) -> [UInt8] {
    var buf = [UInt8](repeating: 0, count: w * h * 4)
    let cs = CGColorSpaceCreateDeviceRGB()
    buf.withUnsafeMutableBytes { raw in
        let ctx = CGContext(data: raw.baseAddress, width: w, height: h,
                            bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    }
    return buf
}

/// Flood-fill the background in from every border pixel, so white *inside*
/// the dog (chest, paws, muzzle) is never touched.
func key(_ px: inout [UInt8], _ w: Int, _ h: Int) -> Frame {
    var bg = [Bool](repeating: false, count: w * h)
    var stack: [Int] = []

    func nearWhite(_ i: Int) -> Bool {
        if px[i*4+3] < 8 { return true }          // already-transparent input
        let r = Int(px[i*4]), g = Int(px[i*4+1]), b = Int(px[i*4+2])
        let mx = max(r, max(g, b)), mn = min(r, min(g, b))
        return mn >= KEY_MIN && (mx - mn) <= KEY_TOL
    }
    func push(_ x: Int, _ y: Int) {
        let i = y * w + x
        if !bg[i] && nearWhite(i) { bg[i] = true; stack.append(i) }
    }

    for x in 0..<w { push(x, 0); push(x, h - 1) }
    for y in 0..<h { push(0, y); push(w - 1, y) }

    while let i = stack.popLast() {
        let x = i % w, y = i / w
        if x > 0     { push(x - 1, y) }
        if x < w - 1 { push(x + 1, y) }
        if y > 0     { push(x, y - 1) }
        if y < h - 1 { push(x, y + 1) }
    }

    // erode the kept region by 1px — kills the JPEG white halo around the edge
    var erode = [Bool](repeating: false, count: w * h)
    for y in 0..<h {
        for x in 0..<w {
            let i = y * w + x
            if bg[i] { continue }
            var touches = false
            if x == 0 || y == 0 || x == w-1 || y == h-1 { touches = true }
            else if bg[i-1] || bg[i+1] || bg[i-w] || bg[i+w] { touches = true }
            if touches { erode[i] = true }
        }
    }

    // Keep only the largest connected blob of kept pixels. Detached ground
    // shadows and stray speckles are separate components, so this removes them
    // without touching the dog.
    var comp = [Int32](repeating: -1, count: w * h)
    var best = -1, bestCount = 0, next: Int32 = 0
    for start in 0..<(w * h) {
        if bg[start] || erode[start] || comp[start] >= 0 { continue }
        var q = [start]; comp[start] = next; var count = 0
        while let i = q.popLast() {
            count += 1
            let x = i % w, y = i / w
            func visit(_ nx: Int, _ ny: Int) {
                let j = ny * w + nx
                if bg[j] || erode[j] || comp[j] >= 0 { return }
                comp[j] = next; q.append(j)
            }
            if x > 0     { visit(x - 1, y) }
            if x < w - 1 { visit(x + 1, y) }
            if y > 0     { visit(x, y - 1) }
            if y < h - 1 { visit(x, y + 1) }
        }
        if count > bestCount { bestCount = count; best = Int(next) }
        next += 1
    }
    if best >= 0 {
        for i in 0..<(w * h) where !bg[i] && !erode[i] && comp[i] != Int32(best) { erode[i] = true }
    }

    var f = Frame(); f.w = w; f.h = h
    f.minX = w; f.minY = h; f.maxX = -1; f.maxY = -1
    for y in 0..<h {
        for x in 0..<w {
            let i = y * w + x
            if bg[i] || erode[i] {
                px[i*4] = 0; px[i*4+1] = 0; px[i*4+2] = 0; px[i*4+3] = 0
            } else {
                px[i*4+3] = 255
                if x < f.minX { f.minX = x }; if x > f.maxX { f.maxX = x }
                if y < f.minY { f.minY = y }; if y > f.maxY { f.maxY = y }
            }
        }
    }
    f.px = px
    return f
}

func writePNG(_ frame: Frame, bbox: (Int, Int, Int, Int), scale: Double,
              outSize: Int, path: String, cx: Double = 0.5, cy: Double = 0.5) {
    let (bx, by, bw, bh) = bbox
    let cs = CGColorSpaceCreateDeviceRGB()
    var src = frame.px
    let srcImg: CGImage = src.withUnsafeMutableBytes { raw -> CGImage in
        let c = CGContext(data: raw.baseAddress, width: frame.w, height: frame.h,
                          bitsPerComponent: 8, bytesPerRow: frame.w * 4, space: cs,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        return c.makeImage()!
    }

    let out = CGContext(data: nil, width: outSize, height: outSize,
                        bitsPerComponent: 8, bytesPerRow: outSize * 4, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    out.interpolationQuality = .high
    out.clear(CGRect(x: 0, y: 0, width: outSize, height: outSize))

    // place the bbox centre at the canvas centre, at the shared scale
    let dw = Double(bw) * scale, dh = Double(bh) * scale
    let dx = cx * Double(outSize) - dw / 2.0
    let dyTop = cy * Double(outSize) - dh / 2.0
    let dy = Double(outSize) - dyTop - dh      // CG origin is bottom-left
    // CG origin is bottom-left; our bbox y is top-down
    let flippedY = frame.h - by - bh
    out.draw(srcImg.cropping(to: CGRect(x: bx, y: flippedY, width: bw, height: bh))!,
             in: CGRect(x: dx, y: dy, width: dw, height: dh))

    guard let img = out.makeImage() else { return }
    let rep = NSBitmapImageRep(cgImage: img)
    if let data = rep.representation(using: .png, properties: [:]) {
        try? data.write(to: URL(fileURLWithPath: path))
    }
}

// ---- main ----
let args = CommandLine.arguments
guard args.count >= 6 else { print("usage: arcokey <size> <each|cycle> <outDir> <prefix> <inputs...>"); exit(1) }
let outSize = Int(args[1])!
let mode = args[2]
let outDir = args[3]
let prefix = args[4]
let inputs = Array(args[5...])

var frames: [Frame] = []
for p in inputs {
    guard let (img, w, h) = load(p) else { print("skip \(p)"); continue }
    var px = rasterise(img, w, h)
    let f = key(&px, w, h)
    frames.append(f)
}

// one shared scale across the whole cycle so he never changes size
var maxW = 0.0, maxH = 0.0
for f in frames {
    maxW = max(maxW, Double(f.maxX - f.minX + 1))
    maxH = max(maxH, Double(f.maxY - f.minY + 1))
}
let margin = 0.94
let sharedScale = min(Double(outSize) * margin / maxW, Double(outSize) * margin / maxH)

for (i, f) in frames.enumerated() {
    let bw = f.maxX - f.minX + 1, bh = f.maxY - f.minY + 1
    var s = (mode == "cycle") ? sharedScale
          : min(Double(outSize) * margin / Double(bw), Double(outSize) * margin / Double(bh))
    // "place" reproduces another image's framing exactly: same bbox width and
    // same bbox centre, so two poses cross-fade without shifting.
    var placeCX = 0.5, placeCY = 0.5, usePlace = false
    if mode == "place" {
        let env = ProcessInfo.processInfo.environment
        let boxW = Double(env["ARCO_BOXW"] ?? "0.9") ?? 0.9
        placeCX = Double(env["ARCO_CX"] ?? "0.5") ?? 0.5
        placeCY = Double(env["ARCO_CY"] ?? "0.5") ?? 0.5
        s = boxW * Double(outSize) / Double(bw)
        usePlace = true
    }
    let name = frames.count == 1 ? "\(prefix).png" : String(format: "%@-%02d.png", prefix, i + 1)
    writePNG(f, bbox: (f.minX, f.minY, bw, bh), scale: s, outSize: outSize,
             path: "\(outDir)/\(name)", cx: usePlace ? placeCX : 0.5, cy: usePlace ? placeCY : 0.5)
    print(String(format: "%@  bbox %dx%d  scale %.3f", name, bw, bh, s))
}
