import Foundation
import NeedleFoundation

protocol TabBarComponentDependency: Dependency {
    var profileComponent: ProfileComponent { get }
    var newsComponent: NewsComponent { get }
    var clubsComponent: ClubsComponent { get }
    var localEventsComponent: LocalEventsComponent { get }
    var reservationComponent: ReservationComponent { get }
}

class TabBarComponent: Component<TabBarComponentDependency> {
    
    var tabBar: TabBarViewController {
        let tabBarBuilder = TabBarBuilderImpl()
        let presenter = TabBarPreseterImpl(tabBarModelBuilder: tabBarBuilder)
        let tabBarViewController = TabBarViewController(presenter: presenter)

        let tabs: [TabModel] = [
            TabModel(
                type: .profile,
                viewController: dependency.profileComponent.profileViewControllerWithNavigation),
            TabModel(
                type: .news,
                viewController: dependency.newsComponent.newsViewControllerWithNavigation),
            TabModel(
                type: .clubs,
                viewController: dependency.clubsComponent.clubsViewControllerWithNavigation),
            TabModel(
                type: .localEvents,
                viewController: dependency.localEventsComponent.localEventsViewControllerWithNavigation),
            TabModel(
                type: .reservation,
                viewController: dependency.reservationComponent.reservationViewControllerWithNavigation),
        ]
        
        presenter.setView(tabBarViewController)
        presenter.setupTabModels(tabs)
        return tabBarViewController
    }
}

