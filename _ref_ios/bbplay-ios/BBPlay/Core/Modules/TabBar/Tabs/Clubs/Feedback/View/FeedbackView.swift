import Foundation

protocol FeedbackView: AnyObject {
    func updateButton(_ isEnabled: Bool)
    func openMailClient(feedback: String)
    func setFirstResponder()
}
