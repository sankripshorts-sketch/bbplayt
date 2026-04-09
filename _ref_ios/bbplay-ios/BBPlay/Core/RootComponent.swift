import Foundation
import NeedleFoundation

final class RootComponent: BootstrapComponent {
    
    private let appNavigationController = BaseNavigationController()

    // TODO: кажется можно private(set) appNavigationController сделать, а не это
    var navigationController: UINavigationController { appNavigationController }

    var bannerUpdateAppCoordinator: BannerUpdateAppCoordinatorComponent {
        BannerUpdateAppCoordinatorComponent(parent: self)
    }

    var tabBarViewControllerWithNavigation: BaseNavigationController {
        let router = Router(navigationController: appNavigationController)
        router.push(tabBarComponent.tabBar)
        return appNavigationController
    }
    
    var maps: Maps {
        shared { Maps() }
    }
    var phoneCall: PhoneCall {
        shared { PhoneCall() }
    }
    var socialMedia: SocialMedia {
        shared { SocialMedia() }
    }

    var networkStatusManager: NetworkStatusManager {
        shared { NetworkStatusManagerImpl() }
    }

    var analyticsManager: AnalyticsManager {
        shared {
            let backend = AppMetricaBackendImpl()
            return AnalyticsManagerImpl(appMetrica: backend)
        }
    }
    
    var remoteConfigManager: RemoteConfigManager {
        shared { RemoteConfigManagerImpl(networkStatus: networkStatusManager) }
    }
    
    var clubsHolder: ClubsHolder {
        shared { ClubsHolder() }
    }

    var proxyNetworkService: NetworkServiceProtocol {
        shared {
            let configuration = ProxyConfiguration()
            let requestAdapters: [RequestAdapter] = [
                ProxyRequestAdapterImpl(configuration: configuration)
            ]
            let requestInterceptor = RequestInterceptorImpl(requestAdapters: requestAdapters)
            let requestBuilder = RequestBuilderImpl(
                configuration: configuration,
                requestInterceptor: requestInterceptor)
            let responseHandler = ResponseHandlerImpl()
            return NetworkServiceImpl(
                requestBuilder: requestBuilder,
                responseHandler: responseHandler,
                urlSession: .default
            )
        }
    }

    var networkService: NetworkService {
        shared { NetworkService(clubsHolder: clubsHolder) }
    }
    
    var clubsManager: ClubsManager {
        shared {
            ClubsManagerImpl(
                authManager: authManager,
                remoteConfigManager: remoteConfigManager,
                networkService: networkService,
                proxyNetworkService: proxyNetworkService,
                clubsHolder: clubsHolder
            )
        }
    }

    // MARK: - AuthManager
    private var accountHandler: AccountHandler { AccountHandler() }
    private var accountService: AccountService {
        shared { AccountServiceImpl(networkService: networkService,
                                    accountHandler: accountHandler) }
    }
    var accountManager: AccountManager {
        shared {  AccountManagerImpl(accountService: accountService,
                                     analyticsManager: analyticsManager) }
    }
    var authManager: AuthManager {
        shared { AuthManagerImpl(accountManager: accountManager) }
    }
    
    // MARK: - verificationPhoneService
    private var smsServiceDataStorage: SMSServiceDataStorage {
        shared { SMSServiceDataStorage(accountManager: accountManager) }
    }
    
    var verificationPhoneService: VerificationPhoneService {
        shared { VerificationPhoneServiceImpl(networkService: networkService,
                                              smsServiceDataStorage: smsServiceDataStorage) }
    }
    
// MARK: - Screens
    var tabBarComponent: TabBarComponent { TabBarComponent(parent: self) }
    var profileComponent: ProfileComponent { ProfileComponent(parent: self) }
    var newsComponent: NewsComponent { NewsComponent(parent: self) }
    var clubsComponent: ClubsComponent { ClubsComponent(parent: self) }
    var localEventsComponent: LocalEventsComponent { LocalEventsComponent(parent: self) }
    var reservationComponent: ReservationComponent { ReservationComponent(parent: self) }
}
