import Foundation
import UIKit

final class AccountRegistrationRouter: Router {
    
    private let networkService: NetworkService
    private let authManager: AuthManager
    private let verificationPhoneService: VerificationPhoneService
    
    init(networkService: NetworkService, 
         authManager: AuthManager,
         verificationPhoneService: VerificationPhoneService,
         navigationController: UINavigationController?) {
        self.networkService = networkService
        self.authManager = authManager
        self.verificationPhoneService = verificationPhoneService
        super.init(navigationController: navigationController)
    }

    func openCodeCheckingView(with userData: UserData) {
        let viewController = makeCodeCheckingViewController(with: userData)
        push(viewController)
        super.needShowNavigationBar()
    }

    func makeCodeCheckingViewController(with userData: UserData) -> CodeCheckingViewController {
        let router = CodeCheckingRouter(navigationController: makeNavigationController())
        let presenter = CodeCheckingPresenterImpl(
            router: router,
            authManager: authManager,
            userData: userData, 
            verificationPhoneService: verificationPhoneService
        )

        let viewController = CodeCheckingViewController(presenter: presenter)
        
        presenter.setView(viewController)
        return viewController
    }
    
    func openTermsOfUse() {
        guard let url = URL(string: "https://bbplay.bbgms-api.com/legal/ru/terms") else {
            return
        }
        UIApplication.shared.open(url)
    }
}
