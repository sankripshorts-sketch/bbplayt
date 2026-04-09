import Foundation

final class ProfilePresenterImpl {

    weak var view: ProfileView?
    private let router: ProfileRouter
    private let authManager: AuthManager
    private let analyticsManager: AnalyticsManager
    private var isLoaded = false
    
    init(
        router: ProfileRouter,
        authManager: AuthManager,
        analyticsManager: AnalyticsManager
    ) {
        self.router = router
        self.authManager = authManager
        self.analyticsManager = analyticsManager
    }

    private func updateAccount() {
        Task {
            do {
                await MainActor.run {
                    guard !isLoaded else { return }
                    view?.contentLoader(.on)
                }
                
                try await authManager.updateAccount()

                await MainActor.run {
                    guard let account = authManager.getAccount() else {
                        view?.contentLoader(.off)
                        view?.endRefresh()
                        authManager.logout()
                        return
                    }
                    
                    isLoaded = true
                    view?.update(with: account)
                    view?.contentLoader(.off)
                    view?.endRefresh()
                }
            }
            catch let error {
                await MainActor.run {
                    errorHandle(with: error)
                }
                logger.error(error)
            }
        }
    }
    
    private func errorHandle(with error: Error) {
        guard let error = error as? AccountError else { return }
        let errorsForLogout: [AccountError] = [
            .accountInvalid,
            .accountInactive,
            .loginInvalid,
            .privateKeyInvalid
        ]

        guard errorsForLogout.contains(where: { $0 == error }) else { return }
        if error == .privateKeyInvalid {
            view?.showUpdateAlert(with: error.localizedDescription)
            return
        }
        view?.showError(with: error.localizedDescription)
    }

}

// MARK: - ProfilePresenter -

extension ProfilePresenterImpl: ProfilePresenter {
    
    func refresh() {
        updateAccount()
    }
    
    func needLogout() {
        authManager.logout()
    }
    
    func openSettings() {
        router.openSettings()
    }
    
    func openBonusRublesAlert() {
        router.openBonusAlert()
    }
    
    func openReplenishScreen() {
        if let email = authManager.getAccount()?.memberEmail,
           email.makeValidEmail() != nil {
            router.openReplenishScreen(inputData: nil)
        } else {
            router.openUserEmailScreen() { [weak self] outputData in
                guard let self else { return }
                self.router.openReplenishScreen(
                    inputData: .init(
                        email: outputData.email,
                        openScreenCallback: {
                            outputData.closeAction()
                        }
                    )
                )
            }
        }

        sendTapReplenishEvent()
    }
    
    func goToRanking() {
        router.openRankingScreen()
    }
    
    func onViewDidAppear() {
        updateAccount()
    }
    
}

// MARK: - Analytics -

private extension ProfilePresenterImpl {
    
    func sendTapReplenishEvent() {
        analyticsManager.sendEvent(with: .paymentProfileTapButton)
    }
    
}
