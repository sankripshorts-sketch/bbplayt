import Foundation

final class FeedbackPresenterImpl {
    
    private weak var view: FeedbackView?
    
    func setView(_ view: FeedbackView) {
        self.view = view
    }
    
    func setFirstResponder() {
        view?.setFirstResponder()
    }
}

extension FeedbackPresenterImpl: FeedbackPresenter {
    func sendFeedback(text: String) {
        view?.openMailClient(feedback: text)
    }
    
    func checkTextField(text: String) {
        guard text.count == 0 else {
            view?.updateButton(true)
            return
        }
        view?.updateButton(false)
    }
    
    func onViewDidAppear() {
        setFirstResponder()
    }
}
