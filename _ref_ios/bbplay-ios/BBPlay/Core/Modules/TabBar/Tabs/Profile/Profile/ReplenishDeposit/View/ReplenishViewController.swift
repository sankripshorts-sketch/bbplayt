import Foundation
import UIKit
import YooKassaPayments

final class ReplenishViewController: UIViewController {
    
    private let presenter: ReplenishPresenter
    private let mainView = ReplenishViewImpl()
    
    init(
        presenter: ReplenishPresenter
    ) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setupAction()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    override func loadView() {
        view = mainView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        presenter.onViewDidLoad()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        presenter.viewDidAppear()
        mainView.makeTextFieldFirstResponder()
    }

    private func setupAction() {
        mainView.setBackAction { [weak self] in
            self?.dismiss(animated: true)
        }

        mainView.setAmountAction { [weak self] amount in
            self?.presenter.paymentTap(with: amount)
        }

        mainView.setAmountTapAction { [weak self] index in
            self?.presenter.fastAmountTap(with: index)
        }
    }

    private func showAlert(with title: String, and description: String) {
        let alert =  UIAlertController(title: title, message: description, preferredStyle: .alert)
        let action = UIAlertAction(title: Localizable.okey(), style: .default) { [weak self] _ in
            self?.dismiss(animated: true)
        }
        
        alert.addAction(action)
        present(alert, animated: true)
    }

    private func showBottomSheet(with state: PaymentState, and action: EmptyClosure? = nil) {
        let sheet = ReplenishStatusOrderBottomSheet(state: state, action: action)
        present(sheet, animated: true)
    }

}

// MARK: - ReplenishView -

extension ReplenishViewController: ReplenishView {

    func openPaymentScreen(with viewController: UIViewController) {
        modalPresentationStyle = .automatic
        present(viewController, animated: true)
    }

    func updateTextField(with amount: Int) {
        mainView.updateTextField(amount: amount)
    }

    func updateView(with amount: [Int]) {
        mainView.update(with: amount)
    }

    func openBottomSheet(with state: PaymentState) {
        dismiss(animated: true, completion: { [weak self] in
            self?.showBottomSheet(with: state) {
                self?.presenter.updateAccount()
                self?.navigationController?.popViewController(animated: true)
            }
        })
    }

    func openErrorAlert(with description: String) {
        dismiss(animated: true, completion: { [weak self] in
            self?.showAlert(with: Localizable.error(), and: description)
        })
    }
    
    func openStatusOrderBottomSheetAfterClosePayment(with state: PaymentState) {
        dismiss(animated: true) { [weak self] in
            guard let self else { return }
    
            let sheet = ReplenishStatusOrderBottomSheet(state: state) {
                self.navigationController?.popViewController(animated: true)
            }

            self.present(sheet, animated: true)
            self.presenter.wasOpenPaymentBottomSheet()

            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                self?.presenter.checkPaymentStatus() { state in
                    sheet.updateState(with: state)
                }
            }
        }
    }

    func closePaymentView() {
        dismiss(animated: true)
    }
}

