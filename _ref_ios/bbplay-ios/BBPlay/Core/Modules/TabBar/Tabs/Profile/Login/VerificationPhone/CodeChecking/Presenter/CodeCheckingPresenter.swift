import Foundation

protocol CodeCheckingPresenter: AnyObject {
    func updateScrollPosition(with height: CGFloat)
    func resetScrollPosition()
    func textFieldIsValid(_ code: String)
    func checkCode(_ code: String) 
    func requestSMS()
    func onViewWillAppear()
}
