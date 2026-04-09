import Foundation

protocol LocalEventPresenter: AnyObject {
    func setView(with view: LocalEventView)
    func onViewWillAppear()

    func connectEventButtonTapped()
    func eventButtonTapped()
    func pullToRefreshTriggered()
}
