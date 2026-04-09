import UIKit

protocol TabBarBuilder: AnyObject {
    func prepareViewControllers(tabModels: [TabModel]) -> [UIViewController]
}
