import Foundation
import UIKit

final class TabBarViewController: UITabBarController {
    
    private let presenter: TabBarPresenter
    
    init(presenter: TabBarPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        let appereance = UITabBarAppearance()
        appereance.stackedItemSpacing = 21.scale()
        appereance.stackedItemWidth = 64.scale()
        appereance.stackedItemPositioning = .centered
        appereance.backgroundColor = Color.background()
        
        tabBar.standardAppearance = appereance
        if #available(iOS 15.0, *) {
            tabBar.scrollEdgeAppearance = appereance
        }

        tabBar.clipsToBounds = true
        tabBar.tintColor = .white

        UITabBar.appearance()
            .unselectedItemTintColor = Color.commonText()

        UITabBarItem.appearance()
            .titlePositionAdjustment = UIOffset(horizontal: 0,
                                                vertical: 4.scale())
    }
}

extension TabBarViewController: TabBarView {
    func set(viewControllers: [UIViewController]) {
        self.viewControllers = viewControllers
    }
}
