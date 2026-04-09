import Foundation

protocol ProfileView: AnyObject {
    func update(with account: Account)
    func contentLoader(_ state: ContentLoaderState)
    func endRefresh()
    func showError(with description: String)
    func showUpdateAlert(with description: String)
}

