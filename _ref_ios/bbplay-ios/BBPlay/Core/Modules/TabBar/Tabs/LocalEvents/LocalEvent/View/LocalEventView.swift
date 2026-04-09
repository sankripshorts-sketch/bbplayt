import Foundation
import UIKit

protocol LocalEventView: AnyObject {
    func update(with event: LocalEvent<Section<Header, Item>>)
    func updateBottomView(with state: LocalEventBottomView.StateView,
                          description: String?,
                          title: String?)
    func showErrorAlert(with description: String)
    func showSuccessAlert(with description: String)
    func updateBottomButton(isEnabled: Bool)
    func endRefreshing()
}
