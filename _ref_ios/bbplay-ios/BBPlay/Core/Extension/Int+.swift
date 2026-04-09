import Foundation
import UIKit

extension Int {
    func scale() -> CGFloat {
        let heightMaket = 812.0
        let screenHeight = UIScreen.main.bounds.height
        let scale = CGFloat(heightMaket / screenHeight)
        return CGFloat(self) / scale
    }
    
    func scaleIfNeeded() -> CGFloat {
        return Appearance.orBigger13Mini ? self.scale() : CGFloat(self)
    }
}

//MARK: - To Date -
extension Int {
    func intToDate() -> Date {
        return Date(timeIntervalSince1970: TimeInterval(self))
    }
}

