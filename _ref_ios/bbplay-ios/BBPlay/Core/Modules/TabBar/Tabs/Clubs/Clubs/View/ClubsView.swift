import Foundation

protocol ClubsView: AnyObject {
    func updateView(with models: [ClubModel])
    func contentLoader(_ state: ContentLoaderState)
}
