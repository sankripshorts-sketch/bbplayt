import Foundation
import UIKit

extension CGFloat {
    func scale() -> CGFloat {
        let heightMaket = 812.0
        let screenHeight = UIScreen.main.bounds.height
        let scale = CGFloat(heightMaket / screenHeight)
        return self / scale
    }
    
    func scaleIfNeeded() -> CGFloat {
        return Appearance.orBigger13Mini ? self.scale() : CGFloat(self)
    }
}
