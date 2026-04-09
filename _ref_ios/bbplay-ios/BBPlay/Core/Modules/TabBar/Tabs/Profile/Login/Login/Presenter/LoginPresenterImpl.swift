import Foundation

final class LoginPresenterImpl {

    private weak var view: LoginView?
    private let router: LoginRouter
    private let authManager: AuthManager
    private let analyticsManager: AnalyticsManager

    init(router: LoginRouter,
         authManager: AuthManager,
         analyticsManager: AnalyticsManager) {
        self.router = router
        self.authManager = authManager
        self.analyticsManager = analyticsManager
    }

    func setView(_ view: LoginView) {
        self.view = view
    }
}

extension LoginPresenterImpl: LoginPresenter {
    func contentUp() {
        view?.contentUp()
    }
    
    func contentDown() {
        view?.contentDown()
    }
    
    func registrationButtonTap() {
        router.openRegistrationAccount()
    }
    
    func openRecoveryPasswordAlert() {
        router.openRecoveryPasswordAlert()
    }
    
    func backgroundTap() {
        view?.resignResponders()
    }
    
    func textFieldIsValid(_ nickname: String,
                          _ password: String) {
        guard nickname.count >= 2,
              password.count >= 1 else {
            view?.updateButton(false)
            return
        }
        
        view?.updateButton(true)
    }

    func login(with nickname: String, _ password: String) {
        Task {
            do {
                await MainActor.run {
                    view?.updateButton(false)
                }

                let loginInfo = try await authManager.login(with: nickname, password)
                await openVerificationPhoneIfNeeded(for: loginInfo, with: password)
            } catch let error {
                logger.error(error)
                await MainActor.run {
                    view?.updateButton(true)
                    sendLoginEvent(eventName: .loginError, error: error.localizedDescription)
                    self.router.showErrorAlert(with: error.localizedDescription)
                }
            }
        }
    }
    
    func openVerificationPhoneIfNeeded(for loginInfo: CompleteLogin, with password: String) async {
        guard loginInfo.account.needPhoneVerify == true else {
            await loginInfo.endLogin()
            sendLoginEvent(eventName: .loginSuccess)
            return
        }

        let userData = UserData(memberID: loginInfo.account.memberId,
                                nickname: loginInfo.account.memberNickname,
                                password: password,
                                phone: loginInfo.account.memberPhone,
                                privateKey: loginInfo.account.memberPrivateKey)
        
        await router.openVerificationPhone(with: userData)
    }
}

// MARK: - Analytics -
private extension LoginPresenterImpl {
    func sendLoginEvent(eventName: AnalyticEventName, error: String? = nil) {
        let params = AnalyticEventParameters.createErrorParams(with: error)
        analyticsManager.sendEvent(with: eventName, params: params)
    }
}
