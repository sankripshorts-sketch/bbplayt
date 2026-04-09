import Foundation
import SnapKit
import UIKit

final class DatePickerViewController: BaseBottomSheetController {

    private let didFinish: (DatePickerSelectedData) -> Void
    private let mainView = DatePickerViewImpl()
    private let presenter: DatePickerPresenter

    init(
        presenter: DatePickerPresenter,
        didFinish: @escaping (DatePickerSelectedData) -> Void
    ) {
        self.presenter = presenter
        self.didFinish = didFinish
        super.init(with: 459.scale())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        presenter.setView(self)
        presenter.onViewDidLoad()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        mainView.updateScrollViewDidScroll()
        presenter.onViewDidLayoutSubviews()
    }

    override func setupUI() {
        super.setupUI()
        addMainView()
        setupActions()
    }
    
    private func addMainView() {
        contentView.addSubview(mainView)
        mainView.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    private func setupActions() {
        mainView.setContinueButtonAction { [weak self] index in
            self?.presenter.continueButtonTapped(with: index)
        }
    }
}

// MARK: - DatePickerView -
extension DatePickerViewController: DatePickerView {
    func update(with date: DatePickerPresenterImpl.DatePicker) {
        mainView.update(with: date)
    }
    
    func scroll(to index: Int) {
        mainView.scroll(to: index)
    }
    
    // TODO: to presenter
    func dimiss(outputModel: DatePickerSelectedData) {
        dismiss(animated: true) { [weak self] in
            self?.didFinish(outputModel)
        }
    }
}
