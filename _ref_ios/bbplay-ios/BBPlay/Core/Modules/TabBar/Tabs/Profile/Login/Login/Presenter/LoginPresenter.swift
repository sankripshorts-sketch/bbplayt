import Foundation

protocol LoginPresenter: AnyObject {
    func registrationButtonTap()
    func openRecoveryPasswordAlert()
    func backgroundTap()
    func contentUp()
    func contentDown()
    func login(with nickname: String, _ password: String)
    func textFieldIsValid(_ nickname: String,
                          _ password: String)
}
