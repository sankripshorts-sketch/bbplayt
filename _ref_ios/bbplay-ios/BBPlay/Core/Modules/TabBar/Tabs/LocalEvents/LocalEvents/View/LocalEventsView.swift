import Foundation

protocol LocalEventsView: AnyObject {
    func contentLoader(_ state: ContentLoaderState)
    func update(with events: LocalEvents)
    func endRefreshing()
}
