import Foundation
import UIKit

// String to Hex
extension UIColor {
    convenience init?(hex: String?) {
        self.init(hexString: hex)
    }
    
    private convenience init?(hexString: String?) {
        guard let hexString else { return nil }

        let hex = hexString.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        let scanner = Scanner(string: hex)
        
        if hex.hasPrefix("#") {
            scanner.currentIndex = hex.index(after: hex.startIndex)
        }
        
        var color: UInt64 = 0
        guard scanner.scanHexInt64(&color) else { return nil }
        
        let length = hex.count - (hex.hasPrefix("#") ? 1 : 0)
        
        switch length {
            case 6:
                self.init(
                    red: CGFloat((color & 0xFF0000) >> 16) / 255.0,
                    green: CGFloat((color & 0x00FF00) >> 8) / 255.0,
                    blue: CGFloat(color & 0x0000FF) / 255.0,
                    alpha: 1.0
                )
                
            case 8:
                self.init(
                    red: CGFloat((color & 0xFF0000) >> 16) / 255.0,
                    green: CGFloat((color & 0x00FF00) >> 8) / 255.0,
                    blue: CGFloat(color & 0x0000FF) / 255.0,
                    alpha: CGFloat((color & 0xFF000000) >> 24) / 255.0
                )
                
            default:
                return nil
        }
    }
}
