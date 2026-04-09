import Foundation
import YooKassaPayments

protocol ReplenishPresenter: AnyObject {
    func wasOpenPaymentBottomSheet() 
    func fastAmountTap(with index: Int)
    func onViewDidLoad()
    func viewDidAppear()
    func paymentTap(with inputAmount: String)
    func checkPaymentStatus(_ status: @escaping (PaymentState) -> Void)
    func updateAccount()
}
