import Foundation

protocol NewsView: AnyObject {
    func update(with news: [NewsPost])
    func openPost(postId: Int, ownerId: String)
    func showSkeleton()
    func hideSkeleton()
    func endRefreshing()
}
