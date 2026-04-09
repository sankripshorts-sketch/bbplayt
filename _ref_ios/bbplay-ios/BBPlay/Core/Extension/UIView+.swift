import Foundation
import UIKit

extension UIView {
    static var safeAreaBottom: CGFloat {
        let window = UIApplication.shared.windows.first
        return window?.safeAreaInsets.bottom ?? 0
    }
    
    var tabBarHeight: CGFloat {
        guard let tabBar = UIApplication.shared.windows.first?.rootViewController?.children.first as? TabBarViewController else {
            return 0
        }
        
        return tabBar.tabBar.frame.height
    }
}

extension UIView {
    var orBigger13Mini: Bool {
        return UIScreen.main.bounds.height > 812
    }
}
