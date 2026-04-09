import Foundation
import UIKit

class Router {
    
    private weak var navigationController: UINavigationController?
    
    init(navigationController: UINavigationController?) {
        self.navigationController = navigationController
    }
    
    func needShowNavigationBar() {
        navigationController?.navigationBar.isHidden = false
    }
    
    func makeNavigationController() -> UINavigationController? {
        navigationController
    }
}

extension Router: Routable {
    func present(_ controller: UIViewController, animated: Bool, completion: EmptyClosure? = nil) {
        navigationController?.parent?.present(controller, animated: animated, completion: completion)
    }

    func push(_ viewController: UIViewController) {
        push(viewController, animated: true)
    }

    func push(_ viewController: UIViewController, animated: Bool) {
        navigationController?.pushViewController(viewController, animated: animated)
    }

    func dismiss(completion: EmptyClosure? = nil) {
        navigationController?.dismiss(animated: true, completion: completion)
    }
}
