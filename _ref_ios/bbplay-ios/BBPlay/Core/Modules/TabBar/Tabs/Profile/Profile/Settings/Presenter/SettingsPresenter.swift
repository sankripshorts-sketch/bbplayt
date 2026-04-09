import Foundation

final class SettingsPresenter {
    weak var viewInput: SettingsViewInput?
    private let authManager: AuthManager
    private let analyticsManager: AnalyticsManager
    private let router: SettingsRouter
    
    private var version: String? {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
    }
    
    private var build: String? {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String
    }

    init(
        authManager: AuthManager,
        analyticsManager: AnalyticsManager,
        router: SettingsRouter
    ) {
        self.authManager = authManager
        self.analyticsManager = analyticsManager
        self.router = router
    }
}

// MARK: - SettingsViewOutput -
extension SettingsPresenter: SettingsViewOutput {
    func cheсkSaveAction(oldPass: String?, newPass: String?) {
        guard let oldPass, let newPass else { return }

        viewInput?.updateSavePasswordButtonState(
            isEnabled: oldPass.count > 0 && newPass.count > 0
        )
    }

    func saveButtonTap(oldPass: String?, newPass: String?) {
        guard
            let oldPass,
            let newPass,
            let account = authManager.getAccount()
        else {
            return
        }

        changePassword(newPass: newPass, oldPass: oldPass, account: account)
    }
    
    func logoutButtonTap() {
        authManager.logout()
        viewInput?.dismiss()
    }
    
    func keyboardShow() {
        viewInput?.keyboardShow()
        viewInput?.hideContent(isHidden: true)
    }
    
    func keyboardHide() {
        viewInput?.keyboardHide()
        viewInput?.hideContent(isHidden: false)
    }
    
    func onViewDidLoad() {
        updateView()
    }
    
    func removeAccountTap() {
        viewInput?.openRemoveAccountAlert()
    }
}

// MARK: - Private methods -
private extension SettingsPresenter {
    @discardableResult
    func checkPassword(oldPass: String, account: Account) async throws -> CompleteLogin {
        return try await authManager.login(with: account.memberNickname, oldPass)
    }
    
    func changePassword(newPass: String, oldPass: String, account: Account) {
        Task {
            do {
                await MainActor.run {
                    viewInput?.contentLoader(.on)
                }
                try await checkPassword(oldPass: oldPass, account: account)
                let result = try await authManager.changePassword(newPassword: newPass)
                guard result.code == 200 else {
                    await MainActor.run {
                        viewInput?.contentLoader(.off)
                        router.showErrorAlert(with: Localizable.networkError())
                    }
                    return
                }
                await MainActor.run {
                    viewInput?.contentLoader(.off)
                    sendChangePasswordEvent(eventName: .profileChangePassword)
                    router.showSuccessAlert(with: Localizable.passwordChangeSuccess())
                    viewInput?.clearPasswordFields()
                }
            } catch let error {
                logger.error(error)
                await MainActor.run {
                    viewInput?.contentLoader(.off)
                    router.showErrorAlert(with: error.localizedDescription)
                }
            }
        }
    }

    func updateView() {
        guard let account = authManager.getAccount() else {
            logger.error("\(self) account is nil")
            assertionFailure()
            return
        }

        let versionApp: String?
        if let version, let build {
            versionApp = Localizable.versionApp(version, build)
        } else {
            versionApp = nil
        }

        viewInput?.update(
            with: .init(
                nickname: account.memberNickname,
                phone: account.memberPhone,
                mail: account.memberEmail.makeValidEmail(),
                name: account.memberFirstName,
                surname: account.memberLastName,
                dateOfBirth: account.memberBirthday.convertBirthdayFromBack(),
                versionApp: versionApp
            )
        )
    }

}

//MARK: - Analytics -

private extension SettingsPresenter {
    func sendChangePasswordEvent(eventName: AnalyticEventName, error: String? = nil) {
        let param = AnalyticEventParameters.createErrorParams(with: error)
        analyticsManager.sendEvent(with: eventName, params: param)
    }
}
