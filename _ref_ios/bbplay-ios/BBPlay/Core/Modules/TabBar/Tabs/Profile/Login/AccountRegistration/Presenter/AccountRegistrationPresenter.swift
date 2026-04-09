import Foundation

protocol AccountRegistrationPresenter: AnyObject {
    func updateScrollPosition()
    func resetScrollPosition()
    func textFieldIsValid(_ model: AccountRegistrationContentView.ValidationModel)
    func createAccount(_ model: AccountRegistrationContentView.RegistrationModel)
    func openTermsOfUse()
}
