import UIKit

struct TabModel {
    let type: TabType
    let viewController: UIViewController
}

extension TabModel {
    enum TabType {
        case profile
        case news
        case clubs
        case localEvents
        case reservation
    }
}
