import Foundation
import UIKit

// MARK: - Right item
extension UINavigationController {
    func setupSettingsRightItem(with target: Any?, and action: Selector) {
        let insets = UIEdgeInsets(top: 3.scale(), left: 0, bottom: 0, right: 7.scale())
        let image = Image.settings()!.withInsets(insets)?.withTintColor(Color.settings()!, renderingMode: .alwaysOriginal)
        
        let item = UIBarButtonItem(image: image, style: .plain, target: target, action: action)
        navigationBar.topItem?.rightBarButtonItem = item
    }
}

// MARK: - TabBar
extension UINavigationController {
    func visibleTabBarIfNeeded() {
        let neededTabBarPresentedIn = [
            ProfileContainerViewController.self,
            NewsViewController.self,
            ClubsViewController.self,
            LocalEventsViewController.self,
            ReservationViewController.self
        ]

        guard let topPresented = topViewController,
              neededTabBarPresentedIn.contains(where: { $0 == type(of: topPresented) }) else {
            hideTabBar()
            return
        }

        showTabBar()
    }
    
    private func hideTabBar() {
        guard var frame = self.tabBarController?.tabBar.frame else {
            tabBarController?.tabBar.isHidden = true
            return
        }

        frame.origin.y = self.view.frame.size.height + frame.size.height
        UIView.animate(
            withDuration: 0.3,
            delay: 0,
            options: .curveEaseOut,
            animations: {
                self.tabBarController?.tabBar.frame = frame
            }, completion: { [weak self] _ in
                self?.tabBarController?.tabBar.isHidden = true
            }
        )
    }
    
    private func showTabBar() {
        guard var frame = self.tabBarController?.tabBar.frame else {
            tabBarController?.tabBar.isHidden = false
            return
        }
        tabBarController?.tabBar.isHidden = false

        frame.origin.y = self.view.frame.size.height - frame.size.height
        UIView.animate(
            withDuration: 0.3,
            delay: 0,
            options: .curveEaseOut,
            animations: {
                self.tabBarController?.tabBar.frame = frame
            }
        )
    }
}
