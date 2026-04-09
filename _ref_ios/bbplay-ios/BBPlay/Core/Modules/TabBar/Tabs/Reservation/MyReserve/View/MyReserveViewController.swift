import Foundation
import UIKit

final class MyReserveViewController: UIViewController {
    
    private let mainView = MyReserveViewImpl()
    private let presenter: MyReservePresenter
    
    init(presenter: MyReservePresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func loadView() {
        view = mainView
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        presenter.onViewDidLoad()
    }
}

// MARK: - MyReserveView -
extension MyReserveViewController: MyReserveView {
    func updateMyReserveCard(with models: [MyReservePresenterImpl.CardModel]) {
        mainView.updateMyReserveCard(with: models)
    }
}
