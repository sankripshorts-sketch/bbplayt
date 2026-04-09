import Foundation
import SnapKit

final class TimePickerView: UIView {

    private let collectionViewHeight = 220.scale()
    private let cellHeight = 48.scale()

    private let titleLabel = UILabel()
    private let containerCollectionView = UIView()
    private lazy var timeCollectionView = TimeCollectionView(
        collectionViewHeight,
        cellHeight)
    private lazy var productCollectionView = DurationCollectionView(
        collectionViewHeight,
        cellHeight)

    private let saveButton = MainButton()

    private let opacityViewTime = UIView()
    private let opacityViewDuration = UIView()
    
    private let unavailableView = UIView()
    private let unavailableLabel = UILabel()

    // используется когда нужно показать unavailable view
    private var cancelAction: EmptyClosure?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
}

// MARK: - Public -
extension TimePickerView {
    func updateTimes(with times: [TimeSlot]) {
        timeCollectionView.updateTimes(with: times)
    }
    
    func updateProducts(with products: [ProductDisplayItem]) {
        productCollectionView.updateProducts(with: products)
    }
    
    func updateButtonState(state: SelectedView.ViewState) {
        saveButton.setEnable(isEnabled: state == .active)
    }
    
    func updateScrollViewContent() {
        timeCollectionView.updateScrollViewDidScroll()
    }

    func setTimeSelectedAction(_ action: @escaping IntClosure) {
        timeCollectionView.setTimeSelectedAction(action)
    }
    
    func setProductSelectedAction(_ action: @escaping IntClosure) {
        productCollectionView.setProductSelectedAction(action)
    }

    func setConfirmAction(_ action: @escaping EmptyClosure) {
        saveButton.setActionButton(action)
    }

    func setCancelAction(_ action: @escaping EmptyClosure) {
        cancelAction = action
    }

    func showUnavailableView() {
        titleLabel.isHidden = true
        unavailableView.isHidden = false
        saveButton.configure(title: Localizable.okey())
        saveButton.setActionButton(cancelAction)
    }

    func scrollToItems(timeIndex: Int?, productIndex: Int?) {
        if let timeIndex {
            timeCollectionView.scrollToItem(on: timeIndex)
        }
        if let productIndex {
            productCollectionView.scrollToItem(on: productIndex)
        }
    }
}

// MARK: - Private -
private extension TimePickerView {
    func setupUI() {
        addSubviews()
        setupTitleLabel()
        setupSaveButton()
        setupContainer()
        setupTimeCollectionView()
        setupProductCollectionView()
        setupOpacityTimeView()
        setupOpacityDurationView()
        setupUnavailableView()
    }

    func addSubviews() {
        addSubview(titleLabel)
        addSubview(saveButton)
        addSubview(containerCollectionView)
        containerCollectionView.addSubview(opacityViewTime)
        containerCollectionView.addSubview(opacityViewDuration)
        containerCollectionView.addSubview(timeCollectionView)
        containerCollectionView.addSubview(productCollectionView)
        containerCollectionView.addSubview(unavailableView)
        unavailableView.addSubview(unavailableLabel)
        setupUnavailableLabel()
    }
    
    func setupTitleLabel() {
        titleLabel.text = Localizable.selectTimeAndPack()
        titleLabel.font = Font.dinRoundProMedi(size: 20.scale())
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(37.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupSaveButton() {
        saveButton.configure(title: Localizable.save())
        saveButton.setEnable(isEnabled: true)
        
        saveButton.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(layoutMarginsGuide.snp.bottom).inset(43.scale())
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupContainer() {
        containerCollectionView.snp.makeConstraints {
            $0.top.lessThanOrEqualTo(titleLabel.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(31.scale())
            $0.bottom.equalTo(saveButton.snp.top).offset(-24.scale())
            $0.height.equalTo(collectionViewHeight)
        }
    }
    
    func setupTimeCollectionView() {
        timeCollectionView.snp.makeConstraints {
            $0.top.left.bottom.equalToSuperview()
            $0.width.equalTo(94.scaleIfNeeded())
        }
    }
    
    func setupProductCollectionView() {
        productCollectionView.snp.makeConstraints {
            $0.top.right.bottom.equalToSuperview()
            $0.left.equalTo(timeCollectionView.snp.right).offset(16.scale())
        }
    }
    
    func setupOpacityTimeView() {
        opacityViewTime.layer.cornerRadius = 8
        //TODO: - Цвет
        opacityViewTime.backgroundColor = UIColor(red: 0.145, green: 0.192, blue: 0.239, alpha: 1)
        
        opacityViewTime.snp.makeConstraints {
            $0.centerY.equalTo(timeCollectionView.snp.centerY)
            $0.height.equalTo(cellHeight)
            $0.left.right.equalTo(timeCollectionView)
        }
    }
    
    func setupOpacityDurationView() {
        opacityViewDuration.layer.cornerRadius = 8
        //TODO: - Цвет
        opacityViewDuration.backgroundColor = UIColor(red: 0.145, green: 0.192, blue: 0.239, alpha: 1)
        
        opacityViewDuration.snp.makeConstraints {
            $0.centerY.equalTo(productCollectionView.snp.centerY)
            $0.height.equalTo(cellHeight)
            $0.left.right.equalTo(productCollectionView)
        }
    }

    func setupUnavailableView() {
        unavailableView.backgroundColor = Color.background()
        unavailableView.isHidden = true

        unavailableView.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    func setupUnavailableLabel() {
        unavailableLabel.text = Localizable.cannotReservationOnToday()
        unavailableLabel.font = Font.dinRoundProBold(size: 20.scaleIfNeeded())
        unavailableLabel.textColor = .white
        unavailableLabel.textAlignment = .center
        unavailableLabel.numberOfLines = 0
        
        unavailableLabel.snp.makeConstraints {
            $0.center.horizontalEdges.equalToSuperview()
        }
    }
}

// MARK: - Section -
extension TimePickerView {
    enum Section {
        case main
    }
}
