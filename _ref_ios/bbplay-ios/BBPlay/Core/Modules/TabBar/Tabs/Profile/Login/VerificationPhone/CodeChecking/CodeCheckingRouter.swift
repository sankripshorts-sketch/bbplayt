import Foundation
import UIKit

final class CodeCheckingRouter: Router {
    override init(navigationController: UINavigationController?) {
        super.init(navigationController: navigationController)
    }
    
    func openWrongCodeAlert() {
        let viewController = WrongCodeAlert()
        present(viewController, animated: true)
    }
}
