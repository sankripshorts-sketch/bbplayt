import Foundation
import UIKit

final class LocalEventsRouter: Router {
    func openEvent(with event: Event,
                   eventButtonTapAction: EventButtonTapAction,
                   eventRefreshAction: EventRefreshAction) {
        let viewController = makeLocalEventViewController(with: event,
                                                          eventButtonTapAction: eventButtonTapAction,
                                                          eventRefreshAction: eventRefreshAction)
        push(viewController)
        needShowNavigationBar()
    }
    
    private func makeLocalEventViewController(
        with event: Event,
        eventButtonTapAction: EventButtonTapAction,
        eventRefreshAction: EventRefreshAction) -> LocalEventViewController {
            let router = LocalEventRouter(navigationController: makeNavigationController())
            let presenter = LocalEventPresenterImpl(event: event,
                                                    router: router,
                                                    eventButtonTapAction: eventButtonTapAction,
                                                    eventRefreshAction: eventRefreshAction)
            let viewController = LocalEventViewController(presenter: presenter)
            presenter.setView(with: viewController)
            return viewController
        }
}
