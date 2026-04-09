import Foundation
import UIKit

protocol BannerUpdateAppViewOutput {
    func updateButtonTapped()
}

protocol BannerUpdateAppViewInput: AnyObject {}

final class BannerUpdateAppViewController: UIViewController {
    private let mainView = BannerUpdateAppView()
    private let output: BannerUpdateAppViewOutput
    
    init(
        output: BannerUpdateAppViewOutput
    ) {
        self.output = output
        super.init(nibName: nil, bundle: nil)
        setupActions()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    override func loadView() {
        view = mainView
    }

    private func setupActions() {
        mainView.setButtonAction { [weak self] in
            self?.output.updateButtonTapped()
        }
    }
}

// MARK: - BannerUpdateAppViewInput -
extension BannerUpdateAppViewController: BannerUpdateAppViewInput {}
