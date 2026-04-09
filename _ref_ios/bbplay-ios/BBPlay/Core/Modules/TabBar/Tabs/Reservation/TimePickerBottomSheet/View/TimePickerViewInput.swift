import Foundation
import UIKit

protocol TimePickerViewInput: AnyObject {
    func updateTimes(with times: [TimeSlot])
    func updateProducts(with products: [ProductDisplayItem])
    func updateButtonState(state: SelectedView.ViewState)
    func showUnavailableView()
    func scrollToItems(timeIndex: Int?, productIndex: Int?)
    func dismiss(completion: @escaping EmptyClosure)
    func close()
}
