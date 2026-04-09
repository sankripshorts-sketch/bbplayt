import Foundation

protocol VerificationPhoneView: AnyObject {
    func updateScrollPosition(with height: CGFloat)
    func resetScrollPosition()
    func updateTextField(_ phone: String)
    func updateButton(_ isEnable: Bool)
    func showError(with message: String)
}
