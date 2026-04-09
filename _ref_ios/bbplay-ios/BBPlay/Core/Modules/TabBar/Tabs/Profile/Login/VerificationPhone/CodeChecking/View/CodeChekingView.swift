import Foundation

protocol CodeChekingView: AnyObject {
    func updateScrollPosition(with height: CGFloat)
    func resetScrollPosition()
    func updateButton(_ isEnable: Bool)
    func close()
    func startTimer(_ nextRequestSMSTime: Int)
    func changeNumberInLabel(_ phone: String)
    func stopTimer()
    func showError(with message: String)
}
