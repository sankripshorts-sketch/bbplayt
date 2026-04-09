import Foundation

final class UserEmailPresenterImpl {

    weak var view: UserEmailView?

    private let didFinish: (_ outputData: OutputData) -> Void

    init(
        didFinish: @escaping (_ outputData: OutputData) -> Void
    ) {
        self.didFinish = didFinish
    }

    private func validateEmail(email: String?) -> Bool {
        guard let email else { return false }
        return email.makeValidEmail() != nil
    }

}

// MARK: - UserEmailPresenter -

extension UserEmailPresenterImpl: UserEmailPresenter {

    func viewDidLoad() {
        view?.updateButton(isEnabled: false)
    }

    func validateEmail(_ email: String?) {
        view?.updateButton(
            isEnabled: validateEmail(email: email)
        )
    }

    func didTapNext(email: String?) {
        guard let email else { return }

        view?.updateButton(
            isEnabled: false
        )
        
        let closeAction: EmptyClosure = { [weak self] in
            self?.view?.close()
        }
        
        let outputData = OutputData(
            email: email,
            closeAction: closeAction
        )
        
        view?.hideKeyboard() { [weak self] in
            self?.didFinish(outputData)
        }
    }

}

// MARK: - OutputData -

extension UserEmailPresenterImpl {
    
    struct OutputData {
        let email: String
        let closeAction: EmptyClosure
    }

}
