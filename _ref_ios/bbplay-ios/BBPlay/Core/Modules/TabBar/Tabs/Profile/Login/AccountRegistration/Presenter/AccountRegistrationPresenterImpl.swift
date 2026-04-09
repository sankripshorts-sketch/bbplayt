import Foundation

final class AccountRegistrationPresenterImpl {

    weak var view: AccountRegistrationView?
    private let router: AccountRegistrationRouter
    private let networkService: AccountRegistrationAPI
    private let analyticsManager: AnalyticsManager
    private let verificationPhoneService: VerificationPhoneService

    init(router: AccountRegistrationRouter, 
         analyticsManager: AnalyticsManager,
         networkService: NetworkService,
         verificationPhoneService: VerificationPhoneService) {
        self.router = router
        self.analyticsManager = analyticsManager
        self.networkService = networkService
        self.verificationPhoneService = verificationPhoneService
    }

    private func validateNickname(nickname: String?) -> Bool {
        guard let nickname else { return false }
        return nickname.count >= 2
    }

    private func validatePhone(phone: String?) -> Bool {
        guard let phone else { return false }
        return (
            (phone.contains("8") && phone.count == 15) || (phone.contains("+") && phone.count == 16)
        )
    }

    private func validateEmail(email: String?) -> Bool {
        guard let email else { return false }
        return email.makeValidEmail() != nil
    }

    private func validateName(name: String?) -> Bool {
        guard let name else { return false }
        return name.count >= 1
    }

    private func validateSurname(surname: String?) -> Bool {
        guard let surname else { return false }
        return surname.count >= 1
    }
    
    private func validateDate(date: String?) -> Bool {
        guard let date else { return false }
        return date.count == 10 && date.checkDate()
    }

    private func validatePassword(password: String?) -> Bool {
        guard let password else { return false }
        return password.count >= 1
    }

    private func validateAcceptedRules(isAccepted: Bool) -> Bool {
        return isAccepted
    }

}

// MARK: - AccountRegistrationPresenter -

extension AccountRegistrationPresenterImpl: AccountRegistrationPresenter {

    func openTermsOfUse() {
        router.openTermsOfUse()
    }
    
    func updateScrollPosition() {
        view?.updateScrollPosition()
    }

    func resetScrollPosition() {
        view?.resetScrollPosition()
    }

    func textFieldIsValid(_ model: AccountRegistrationContentView.ValidationModel) {
        let buttonIsActive = (
            validateNickname(nickname: model.nickname) &&
            validatePhone(phone: model.phone) &&
            validateEmail(email: model.email) &&
            validateSurname(surname: model.surname) &&
            validateDate(date: model.date) &&
            validatePassword(password: model.password) &&
            validateAcceptedRules(isAccepted: model.checkBoxIsActive)
        )

        view?.updateButton(buttonIsActive)
        
    }

    func createAccount(_ model: AccountRegistrationContentView.RegistrationModel) {
        guard
            let name = model.name,
            let surname = model.surname,
            let phone = model.phone,
            let mail = model.email,
            let nickname = model.nickname,
            let date = model.date,
            let password = model.password
        else {
            return
        }

        view?.contentLoader(.on)

        let convertedPhone = phone.replacingOccurrences(of: " ", with: "")

        Task {
            do {
                let reponse = try await networkService.createAccount(
                    data: .init(
                        nickname: nickname,
                        phone: convertedPhone,
                        mail: mail,
                        name: name,
                        surname: surname,
                        date: date,
                        password: password
                    )
                )

                guard let memberId = reponse.data?.memberId else {
                    await registrationError(reponse.message)
                    return
                }

                if reponse.code == 200 || reponse.code == 201 {
                    let userData = UserData(memberID: memberId,
                                            nickname: nickname,
                                            password: password,
                                            phone: convertedPhone,
                                            privateKey: reponse.privateKey)
                    await registrationSuccessful(nickname, password)
                    try await verificationPhoneService.requestSMS(with: convertedPhone, and: memberId)
                    await openCodeCheckingView(userData)
                } else {
                    await registrationError(reponse.message)
                }
            } catch let error {
                logger.error("\(self), \(error)")
                await registrationError(error.localizedDescription)
            }
        }
    }

}

// MARK: - Private -

private extension AccountRegistrationPresenterImpl {
    
    @MainActor
    func registrationError(_ message: String) {
        view?.contentLoader(.off)
        sendRegistrationEvent(eventName: .registrationError, error: message)
        view?.showError(with: message)
    }

    @MainActor
    func registrationSuccessful(_ nickname: String, _ password: String) {
        view?.contentLoader(.off)
        sendRegistrationEvent(eventName: .registrationSuccess)
    }

    @MainActor
    func openCodeCheckingView(_ userData: UserData) {
        view?.contentLoader(.off)
        router.openCodeCheckingView(with: userData)
    }
    
}

// MARK: - Analytics -

private extension AccountRegistrationPresenterImpl {
    
    func sendRegistrationEvent(eventName: AnalyticEventName, error: String? = nil) {
        let params = AnalyticEventParameters.createErrorParams(with: error)
        analyticsManager.sendEvent(with: eventName, params: params)
    }

}
