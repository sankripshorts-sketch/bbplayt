import Foundation

protocol NewsPresenter: AnyObject {
    func onViewDidLoad()
    func handlePullToRefresh(with isRefreshing: Bool)
    func postTap(with id: Int)
}
