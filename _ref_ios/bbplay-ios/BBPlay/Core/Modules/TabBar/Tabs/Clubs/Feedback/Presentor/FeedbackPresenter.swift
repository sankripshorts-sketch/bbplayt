import Foundation

protocol FeedbackPresenter: AnyObject {
    func sendFeedback(text: String)
    func checkTextField(text: String)
    func onViewDidAppear()
}
