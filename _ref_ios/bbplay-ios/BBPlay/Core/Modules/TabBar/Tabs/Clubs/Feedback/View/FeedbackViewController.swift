import Foundation
import UIKit

final class FeedbackViewController: UIViewController {
    private let mainView = FeedbackViewImpl()
    private let presenter: FeedbackPresenter
    private let mailAgent: SendEmailViewController
    
    override func loadView() {
        view = mainView
    }
    
    init(presenter: FeedbackPresenter,
         mailAgent: SendEmailViewController) {
        self.presenter = presenter
        self.mailAgent = mailAgent
        super.init(nibName: nil, bundle: nil)
        setAction()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        presenter.onViewDidAppear()
    }
}

private extension FeedbackViewController {
    func setAction() {
        mainView.setSendAction { [weak self] text in
            self?.presenter.sendFeedback(text: text)
        }
        
        mainView.setCheckTextFieldAction { [weak self] text in
            self?.presenter.checkTextField(text: text)
        }
    }
}

// MARK: - FeedbackView -
extension FeedbackViewController: FeedbackView {
    func openMailClient(feedback: String) {
        navigationController?.present(mailAgent, animated: true)
        mailAgent.sendEmail(message: feedback)
    }
    
    func updateButton(_ isEnabled: Bool) {
        mainView.updateButton(isEnabled)
    }
    
    func setFirstResponder() {
        mainView.setFirstResponder()
    }
}
