import Foundation

final class CodeCheckingPresenterImpl {
    private weak var view: CodeChekingView?
    private let router: CodeCheckingRouter
    private let authManager: AuthManager
    private var userData: UserData
    private let verificationPhoneService: VerificationPhoneService

    init(router: CodeCheckingRouter, 
         authManager: AuthManager,
         userData: UserData,
         verificationPhoneService: VerificationPhoneService) {
        self.router = router
        self.authManager = authManager
        self.userData = userData
        self.verificationPhoneService = verificationPhoneService
    }

    func setView(_ view: CodeChekingView) {
        self.view = view
    }
}

// MARK: - CodeCheckingPresenter -
extension CodeCheckingPresenterImpl: CodeCheckingPresenter {
    func onViewWillAppear() {
        view?.startTimer(verificationPhoneService.nextSmsTime(memberId: userData.memberID))
        view?.changeNumberInLabel(userData.phone)
    }

    func updateScrollPosition(with height: CGFloat) {
        view?.updateScrollPosition(with: height)
    }

    func resetScrollPosition() {
        view?.resetScrollPosition()
    }

    func textFieldIsValid(_ code: String) {
        view?.updateButton(code.count == 4)
    }

    func startTimerFromVerificationPhone(_ nextRequestSMSTime: Int) {
        view?.startTimer(nextRequestSMSTime)
    }

    func checkCode(_ code: String) {
        Task {
            do {
                let convertedCode = code.replacingOccurrences(of: " ", with: "")
                
                guard let code = Int(convertedCode),
                      let privateKey = userData.privateKey else { return }

                try await verificationPhoneService.checkCode(
                    with: code, 
                    memberId: userData.memberID,
                    encodedData: userData.encodedData, 
                    privateKey: privateKey
                )

                await successful()
            } catch VerificationPhoneServiceError.wrongCode(let error) {
                logger.error(error)
                await openWrongCodeAlert()
            } catch VerificationPhoneServiceError.limitReached(let error) {
                logger.error(error)
            }
        }
    }
    
    func requestSMS() {
        Task {
            do {
                try await verificationPhoneService.requestSMS(with: userData.phone,
                                                              and: userData.memberID)
                await startTimer(verificationPhoneService.nextSmsTime(memberId: userData.memberID))
            } catch VerificationPhoneServiceError.manyRequests(let error) {
                await startTimer(verificationPhoneService.nextSmsTime(memberId: userData.memberID))
                logger.error(error)
                await showAlert(error)
            } catch let error {
                logger.error("\(error)")
                await showAlert(error.localizedDescription)
            }
        }
    }
}

// MARK: - Private extension -
private extension CodeCheckingPresenterImpl {
    @MainActor
    func openWrongCodeAlert() {
        router.openWrongCodeAlert()
    }
    
    @MainActor
    func showAlert(_ message: String) {
        view?.showError(with: message)
    }

    func successful() async {
        do {
            try await authManager.login(with: userData.nickname, userData.password).endLogin()
        } catch {
            logger.error(error.localizedDescription)
        }

        await MainActor.run {
            view?.close()
        }
    }

    @MainActor
    func startTimer(_ nextRequestSMSTime: Int) {
        view?.startTimer(nextRequestSMSTime)
    }
}
