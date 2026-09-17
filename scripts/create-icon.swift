import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let build = root.appendingPathComponent("build")
let iconset = build.appendingPathComponent("AppIcon.iconset")
try FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)

func png(_ size: Int) -> Data {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let scale = CGFloat(size) / 1024
    let transform = AffineTransform(scale: scale)
    (transform as NSAffineTransform).concat()
    NSColor(calibratedWhite: 0.98, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 48, y: 48, width: 928, height: 928), xRadius: 220, yRadius: 220).fill()
    NSColor(calibratedWhite: 0.07, alpha: 1).setFill()
    let heights: [CGFloat] = [130, 255, 390, 520, 390, 255, 130]
    for (index, height) in heights.enumerated() {
        NSBezierPath(roundedRect: NSRect(x: 240 + CGFloat(index) * 80, y: (1024 - height) / 2, width: 48, height: height), xRadius: 24, yRadius: 24).fill()
    }
    NSGraphicsContext.restoreGraphicsState()
    return bitmap.representation(using: .png, properties: [:])!
}

for size in [16, 32, 128, 256, 512] {
    try png(size).write(to: iconset.appendingPathComponent("icon_\(size)x\(size).png"))
    try png(size * 2).write(to: iconset.appendingPathComponent("icon_\(size)x\(size)@2x.png"))
}
try png(1024).write(to: build.appendingPathComponent("icon.png"))
let windowsPNG = png(256)
var ico = Data([0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 32, 0])
for value in [UInt32(windowsPNG.count), UInt32(22)] {
    var little = value.littleEndian
    withUnsafeBytes(of: &little) { ico.append(contentsOf: $0) }
}
ico.append(windowsPNG)
try ico.write(to: build.appendingPathComponent("icon.ico"))
var chunks = Data()
for (tag, size) in [("icp4", 16), ("icp5", 32), ("icp6", 64), ("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024)] {
    let payload = png(size)
    chunks.append(tag.data(using: .ascii)!)
    var length = UInt32(payload.count + 8).bigEndian
    withUnsafeBytes(of: &length) { chunks.append(contentsOf: $0) }
    chunks.append(payload)
}
var icns = "icns".data(using: .ascii)!
var length = UInt32(chunks.count + 8).bigEndian
withUnsafeBytes(of: &length) { icns.append(contentsOf: $0) }
icns.append(chunks)
try icns.write(to: build.appendingPathComponent("icon.icns"))
