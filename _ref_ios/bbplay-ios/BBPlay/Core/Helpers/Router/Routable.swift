import Foundation
import UIKit

protocol Routable: AnyObject {
    func present(_ controller: UIViewController, animated: Bool, completion: EmptyClosure?)
    func push(_ viewController: UIViewController)
    func push(_ viewController: UIViewController, animated: Bool)
}
