import Foundation
import YooKassaPayments

protocol ReplenishView: AnyObject {
    func updateTextField(with amount: Int)
    func updateView(with amount: [Int])
    func openPaymentScreen(with viewController: UIViewController)
    func openBottomSheet(with state: PaymentState)
    func openErrorAlert(with description: String)
    func openStatusOrderBottomSheetAfterClosePayment(with state: PaymentState)
    func closePaymentView()
}
