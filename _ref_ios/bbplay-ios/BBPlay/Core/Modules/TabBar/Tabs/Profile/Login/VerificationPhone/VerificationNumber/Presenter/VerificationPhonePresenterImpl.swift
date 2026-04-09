import Foundation

final class VerificationPhonePresenterImpl {
    private weak var view: VerificationPhoneView?
    private let router: VerificationPhoneRouter
    private var userData: UserData
    private let verificationPhoneService: VerificationPhoneService
    
    init(router: VerificationPhoneRouter,
         userData: UserData,
         verificationPhoneService: VerificationPhoneService) {
        self.router = router
        self.userData = userData
        self.verificationPhoneService = verificationPhoneService
    }

    func setView(_ view: VerificationPhoneView) {
        self.view = view
    }
}

// MARK: - VerificationPhonePresenter -
extension VerificationPhonePresenterImpl: VerificationPhonePresenter {
   func onViewDidLoad() {
        view?.updateTextField(userData.phone.formatPhoneNumber())
    }

    func textFieldValid(_ phone: String) {
        let buttonState = ((phone.contains("8") && phone.count == 15) || (phone.contains("+") && phone.count == 16))
        view?.updateButton(buttonState)
    }

    func updateScrollPosition(with height: CGFloat) {
        view?.updateScrollPosition(with: height)
    }

    func resetScrollPosition() {
        view?.resetScrollPosition()
    }

    func checkNumber(_ phone: String) {
        var convertedPhone = phone.replacingOccurrences(of: " ", with: "")
        if userData.phone.first != "+" {
            convertedPhone = convertedPhone.replacingOccurrences(of: "+", with: "")
        }
        
        Task { [convertedPhone] in
            do {
                if userData.phone == convertedPhone {
                    try await requestSMS()
                } else {
                    try await updateNumber(convertedPhone)
                }
            } catch VerificationPhoneServiceError.manyRequests(let error) {
                logger.error(error)
                await verificationSuccesful()
            } catch let error {
                logger.error("\(error)")
                await errorAlert(error.localizedDescription)
            }
        }
    }
}

// MARK: - Private extension -
private extension VerificationPhonePresenterImpl {
    func updateNumber(_ newPhone: String) async throws {
        try await verificationPhoneService.updateNumber(with: userData.phone,
                                                        newPhone: newPhone,
                                                        memberId: userData.memberID)
        userData.phone = newPhone
        try await requestSMS()
    }

    func requestSMS() async throws {
        try await verificationPhoneService.requestSMS(with: userData.phone, and: userData.memberID)
        await verificationSuccesful()
    }

    @MainActor
    func verificationSuccesful() {
        router.openCodeCheckingView(with: userData)
    }

    @MainActor
    func errorAlert(_ message: String) {
        view?.showError(with: message)
    }
}
