import Foundation
import SnapKit

final class TimePickerViewController: BaseBottomSheetController {
    private let mainView = TimePickerView()
    private let output: TimePickerViewOutput

    // MARK: - Initialization
    init(
        output: TimePickerViewOutput
    ) {
        self.output = output
        super.init(with: 499.scale())
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        output.setViewInput(self)
        output.onViewDidLoad()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        mainView.updateScrollViewContent()
        output.onViewDidLayoutSubviews()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setupActions()
    }
    
    override func setupUI() {
        super.setupUI()
        contentView.addSubview(mainView)
        mainView.snp.makeConstraints { $0.edges.equalToSuperview() }
    }
    
    // MARK: - Setup Actions
    private func setupActions() {
        mainView.setTimeSelectedAction { [weak self] timeIndex in
            self?.output.didSelectTime(at: timeIndex)
        }
        
        mainView.setProductSelectedAction { [weak self] productIndex in
            self?.output.didSelectProduct(at: productIndex)
        }
        
        mainView.setConfirmAction { [weak self] in
            self?.output.confirmSelection()
        }
        
        mainView.setCancelAction { [weak self] in
            self?.output.cancelSelection()
        }
    }
}

// MARK: - TimePickerViewInput -
extension TimePickerViewController: TimePickerViewInput {
    func updateTimes(with times: [TimeSlot]) {
        mainView.updateTimes(with: times)
    }

    func updateProducts(with products: [ProductDisplayItem]) {
        mainView.updateProducts(with: products)
    }

    func updateButtonState(state: SelectedView.ViewState) {
        mainView.updateButtonState(state: state)
    }

    func showUnavailableView() {
        mainView.showUnavailableView()
    }

    func scrollToItems(timeIndex: Int?, productIndex: Int?) {
        mainView.scrollToItems(timeIndex: timeIndex, productIndex: productIndex)
    }

    func dismiss(completion: @escaping EmptyClosure) {
        dismiss(animated: true, completion: completion)
    }

    func close() {
        dismiss(animated: true)
    }
}
