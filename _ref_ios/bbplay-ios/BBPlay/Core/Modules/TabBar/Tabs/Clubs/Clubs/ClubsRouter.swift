import Foundation

final class ClubsRouter: Router {
    
    func openFeedback() {
        let viewController = makeFeedbackViewController()
        push(viewController)
        super.needShowNavigationBar()
    }
    
    private func makeFeedbackViewController() -> FeedbackViewController {
        let presenter = FeedbackPresenterImpl()
        let mailAgent = SendEmailViewController()
        let viewController = FeedbackViewController(presenter: presenter, mailAgent: mailAgent)
        presenter.setView(viewController)
        return viewController
    }
}
