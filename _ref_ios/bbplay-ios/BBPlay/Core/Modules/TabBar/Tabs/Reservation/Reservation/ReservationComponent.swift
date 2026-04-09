import Foundation
import NeedleFoundation

protocol ReservationComponentDependency: Dependency {
    var accountManager: AccountManager { get }
    var networkService: NetworkService { get }
    var clubsManager: ClubsManager { get }
    var authManager: AuthManager { get }
    var analyticsManager: AnalyticsManager { get }
    var proxyNetworkService: NetworkServiceProtocol { get }
}

final class ReservationComponent: Component<ReservationComponentDependency> {
    
    private let navigationController = BaseNavigationController()
    
    var reservationViewControllerWithNavigation: BaseNavigationController {
        let router = Router(navigationController: navigationController)
        router.push(reservationViewController)
        return navigationController
    }
    
    private var reservationViewController: ReservationViewController {
        let router = ReservationRouter(
            authManager: dependency.authManager,
            analyticsManager: dependency.analyticsManager,
            networkService: dependency.networkService,
            navigationController: navigationController
        )
        
        let availableComputerUseCase = AvailableComputerUseCaseImpl(
            proxyNetworkService: dependency.proxyNetworkService
        )
        let myBookingsUseCase = MyBookingsUseCaseImpl(
            accountManager: dependency.accountManager,
            networkService: dependency.networkService
        )
        let reservationUseCase = ReservationUseCaseImpl(
            accountManager: dependency.accountManager,
            networkService: dependency.networkService
        )
        
        let presenter = ReservationPresenterImpl(
            clubsManager: dependency.clubsManager,
            accountManager: dependency.accountManager,
            router: router,
            availableComputerUseCase: availableComputerUseCase,
            myBookingsUseCase: myBookingsUseCase,
            reservationUseCase: reservationUseCase
        )

        let viewController = ReservationViewController(presenter: presenter)
        presenter.viewInput = viewController
        return viewController
    }
}
