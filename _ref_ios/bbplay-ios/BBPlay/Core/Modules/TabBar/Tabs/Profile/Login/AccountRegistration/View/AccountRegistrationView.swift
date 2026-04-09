import Foundation

protocol AccountRegistrationView: AnyObject {
    func updateScrollPosition()
    func resetScrollPosition()
    func updateButton(_ isEnabled: Bool)
    func showError(with message: String)
    func login(with nickname: String, and password: String)
    func contentLoader(_ state: ContentLoaderState)
}
