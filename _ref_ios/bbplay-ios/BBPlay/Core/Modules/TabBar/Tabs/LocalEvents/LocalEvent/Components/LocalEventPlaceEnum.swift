import Foundation
import UIKit

enum LocalEventPlace: Int, CaseIterable {
    case one, two, three, none
}

extension LocalEventPlace {
    var color: UIColor! {
        switch self {
            case .one: return Color.firstPlace()
            case .two: return Color.secondPlace()
            case .three: return Color.thirdPlace()
            case .none:
                return .clear
        }
    }
    
    var text: String {
        switch self {
            case .one: return Localizable.onePlace()
            case .two: return Localizable.twoPlace()
            case .three: return Localizable.threePlace()
            case .none:
                return String()
        }
    }
    
    var price: String {
        switch self {
            case .one: return Localizable.rub(Prices.one)
            case .two: return Localizable.rub(Prices.two)
            case .three: return Localizable.rub(Prices.three)
            case .none:
                return String()
        }
    }
}

extension LocalEventPlace {
    struct Prices {
        static let one = "300"
        static let two = "200"
        static let three = "100"
    }
}
