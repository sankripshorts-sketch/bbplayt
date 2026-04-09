import Foundation
import UIKit

final class ProfileRouter: Router {
    
    private let authManager: AuthManager
    private let analyticsManager: AnalyticsManager
    private let networkService: NetworkService
    
    init(authManager: AuthManager,
         analyticsManager: AnalyticsManager,
         networkService: NetworkService,
         navigationController: UINavigationController?) {
        self.authManager = authManager
        self.analyticsManager = analyticsManager
        self.networkService = networkService
        super.init(navigationController: navigationController)
    }
    
    func openSettings() {
        let viewController = makeSettingsViewController()
        push(viewController)
        needShowNavigationBar()
    }

    func openBonusAlert() {
        let alert = ProfileBonusRublesInfoAlert()
        present(alert, animated: true)
    }

    func openReplenishScreen(inputData: ReplenishPresenterImpl.InputData?) {
        let viewController = makeReplenishViewController(inputData: inputData)
        push(viewController)
        needShowNavigationBar()
    }

    func openUserEmailScreen(
        didFinish: @escaping (UserEmailPresenterImpl.OutputData) -> Void
    ) {
        let viewController = makeUserEmailViewController(didFinish: didFinish)
        push(viewController)
        needShowNavigationBar()
    }

    func openRankingScreen() {
        let viewController = makeRankingViewController()
        push(viewController)
    }

    private func makeSettingsViewController() -> SettingsViewController {
        let router = SettingsRouter(navigationController: makeNavigationController())
        let presenter = SettingsPresenter(
            authManager: authManager,
            analyticsManager: analyticsManager,
            router: router
        )
        let viewController = SettingsViewController(
            output: presenter
        )
        presenter.viewInput = viewController
        return viewController
    }

    private func makeReplenishViewController(
        inputData: ReplenishPresenterImpl.InputData?
    ) -> ReplenishViewController {
        let converter = ReplenishConverter()
        let presenter = ReplenishPresenterImpl(
            inputData: inputData,
            authManager: authManager,
            analyticsManager: analyticsManager,
            networkService: networkService,
            converter: converter
        )
        let viewController = ReplenishViewController(presenter: presenter)
        presenter.view = viewController
        return viewController
    }

    private func makeRankingViewController() -> RankingViewController {
        let router = RankingRouter(navigationController: makeNavigationController())
        let presenter = RankingPresenterImpl(router: router)
        let viewController = RankingViewController(presenter: presenter)
        presenter.setView(viewController)
        return viewController
    }

    private func makeUserEmailViewController(
        didFinish: @escaping (UserEmailPresenterImpl.OutputData) -> Void
    ) -> UserEmailViewController {
        let presenter = UserEmailPresenterImpl(didFinish: didFinish)
        let viewController = UserEmailViewController(presenter: presenter)
        presenter.view = viewController
        return viewController
    }

}
