import Foundation
import UIKit

final class Appearance {
    static var orBigger13Mini: Bool {
        return UIScreen.main.bounds.height > 812
    }
    
    static var isIpad: Bool {
        UIDevice.current.userInterfaceIdiom == .pad
    }
}
