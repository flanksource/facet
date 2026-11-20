import CoreGraphics
import Foundation
import AppKit

do {
    guard CommandLine.arguments.count == 2 || CommandLine.arguments.count == 3 else {
        throw NSError(domain: "WordCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Expected the Word window title"])
    }
    guard let windows = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else {
        throw NSError(domain: "WordCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot enumerate windows; allow Screen Recording access"])
    }
    let matches = windows.filter {
        $0[kCGWindowOwnerName as String] as? String == "Microsoft Word"
            && $0[kCGWindowName as String] as? String == CommandLine.arguments[1]
            && $0[kCGWindowLayer as String] as? Int == 0
    }
    guard matches.count == 1, let identifier = matches[0][kCGWindowNumber as String] as? Int else {
        throw NSError(domain: "WordCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Expected one matching Word window; allow Screen Recording and avoid duplicate document titles"])
    }
    if CommandLine.arguments.count == 3 {
        guard let delta = Int32(CommandLine.arguments[2]),
              let pid = matches[0][kCGWindowOwnerPID as String] as? Int32,
              let bounds = matches[0][kCGWindowBounds as String] as? [String: Any],
              let frame = CGRect(dictionaryRepresentation: bounds as CFDictionary),
              let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1, wheel1: delta, wheel2: 0, wheel3: 0) else {
            throw NSError(domain: "WordCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot create Word scroll event"])
        }
        var activationError: NSDictionary?
        NSAppleScript(source: "tell application \"System Events\" to set frontmost of process \"Microsoft Word\" to true")?.executeAndReturnError(&activationError)
        if let activationError { throw NSError(domain: "WordCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: activationError.description]) }
        let location = CGPoint(x: frame.midX, y: frame.midY)
        CGWarpMouseCursorPosition(location)
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.5))
        guard NSWorkspace.shared.frontmostApplication?.processIdentifier == pid else {
            throw NSError(domain: "WordCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Word lost focus before scrolling"])
        }
        event.location = location
        event.post(tap: .cghidEventTap)
    }
    print(identifier)
} catch {
    FileHandle.standardError.write(Data("Error: \(error.localizedDescription)\n".utf8))
    exit(1)
}
