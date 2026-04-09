import Foundation
import UIKit

final class LocalEventRouter: Router {
    
    func openHowToJointBottomSheet() {
        let viewController = HowToJoinBottomSheet()
        present(viewController, animated: true)
    }
}


