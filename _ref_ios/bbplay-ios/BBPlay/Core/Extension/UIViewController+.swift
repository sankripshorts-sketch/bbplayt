import Foundation
import UIKit

// MARK: - Loader
extension UIViewController {
    func activityIndicatorOn() {
        let loader = ContentLoader()
        loader.frame = UIScreen.main.bounds
        loader.tag = view.hashValue
        
        if view.viewWithTag(view.hashValue) as? ContentLoader == nil {
            view.addSubview(loader)
        }
        
        loader.loaderOn()
    }
    
    func activityIndicatorOff() {
        guard let view = view.viewWithTag(view.hashValue) as? ContentLoader else { return }
        
        view.loaderOff()
        view.removeFromSuperview()
    }
}

// MARK: - Error default alert
extension UIViewController {
    func showDefaultAlert(with title: String = Localizable.error(),
                          description: String,
                          buttonStyle: UIAlertAction.Style = .default,
                          handler: ((UIAlertAction) -> Void)? = nil) {
        let alert = UIAlertController(title: title,
                                      message: description,
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Localizable.okey(),
                                      style: buttonStyle,
                                      handler: handler))
        present(alert, animated: true)
    }
}

// MARK: - Open deeplink -
extension UIViewController {
    func openDeeplink(_ url: URL) {
        UIApplication.shared.open(url)
    }
}
