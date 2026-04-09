import Foundation

protocol VerificationPhonePresenter: AnyObject {
    func updateScrollPosition(with height: CGFloat)
    func resetScrollPosition()
    func textFieldValid(_ phone: String)
    func checkNumber(_ phone: String)
    func onViewDidLoad()
}
