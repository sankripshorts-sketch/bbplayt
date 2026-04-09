import Foundation

protocol LocalEventsPresenter: AnyObject {
    func onViewDidAppear()
    func cellDidTap(with eventId: String)
    func pullToRefreshTriggered()
}
