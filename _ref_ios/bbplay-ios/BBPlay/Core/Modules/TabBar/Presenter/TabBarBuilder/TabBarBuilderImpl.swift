import Foundation
import UIKit

final class TabBarBuilderImpl {
    private func createTabBarItem(tabType: TabModel.TabType) -> UITabBarItem {
        switch tabType {
            case .profile:
                return UITabBarItem(title: Localizable.profile(),
                                    image: Image.profile(),
                                    selectedImage: Image.selectedProfile())
            case .news:
            return UITabBarItem(title: Localizable.news(),
                                    image: Image.news(),
                                    selectedImage: Image.selectedNews())
            case .clubs:
                return UITabBarItem(title: Localizable.clubs(),
                                    image: Image.clubs(),
                                    selectedImage: Image.selectedClubs())
            case .localEvents:
                return UITabBarItem(title: Localizable.events(),
                                    image: Image.ranking(),
                                    selectedImage: Image.selectedRanking())
            case .reservation:
                return UITabBarItem(title: Localizable.reservation(),
                                    image: Image.reservation(),
                                    selectedImage: Image.selectedReservation())
        }
    }
}

extension TabBarBuilderImpl: TabBarBuilder {
    func prepareViewControllers(tabModels: [TabModel]) -> [UIViewController] {
        return tabModels.map { tabModel in
            let tab = createTabBarItem(tabType: tabModel.type)
            
            tabModel.viewController.tabBarItem = tab
            return tabModel.viewController
        }
    }
}
