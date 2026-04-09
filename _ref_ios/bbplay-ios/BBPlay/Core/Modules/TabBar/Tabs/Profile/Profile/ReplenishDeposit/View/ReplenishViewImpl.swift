import Foundation
import SnapKit

final class ReplenishViewImpl: UIView {
    
    private var amountAction: ((String) -> Void)?
    private var backAction: EmptyClosure?
    
    private let title = UILabel()
    private let backButton = UIButton()
    private let textField = ReplenishTextField()
    private let descriptionLabel = UILabel()
    
    private let delegateAdapter = ReplanishDelegateAdapter()
    private let collectionViewLayout = UICollectionViewFlowLayout()
    private lazy var collectionView = UICollectionView(
        frame: .zero,
        collectionViewLayout: collectionViewLayout)
    private var dataSourceAdapter: ReplenishDataSourseAdapter?
    private let replenishButton = MainButton()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        self.dataSourceAdapter = createDataSource()
        collectionView.delegate = delegateAdapter
        setupUI()
        setupAction()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func setupUI() {
        backgroundColor = Color.background()
        
        setupTitle()
        setupTextField()
        setupDescriptionLabel()
        
        setupCollectionView()
        setupCollectionViewLayout()
        
        setupReplenishButton()
    }
    
    private func setupTitle() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        
        title.attributedText = NSAttributedString(
            string: Localizable.replenishTheBalance(),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .paragraphStyle: paragraphStyle,
                .foregroundColor: UIColor.white
            ])
        
        addSubview(title)
        title.snp.makeConstraints {
            $0.top.equalToSuperview().inset(104.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }

    private func setupTextField() {
        textField.text = "100"
        addSubview(textField)
        textField.snp.makeConstraints {
            $0.top.equalToSuperview().inset(262.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(50.scale())
        }
    }
    
    private func setupDescriptionLabel() {
        descriptionLabel.text = Localizable.inputDescription()
        descriptionLabel.font = Font.dinRoundProMedi(size: 16.scale())
        descriptionLabel.textColor = Color.commonText()
        
        addSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(textField.snp.bottom).offset(4.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(24.scale())
        }
    }
    
    private func setupCollectionView() {
        collectionView.backgroundColor = Color.background()
        collectionView.showsHorizontalScrollIndicator = false
        
        addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.top.equalTo(descriptionLabel.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview()
            $0.height.equalTo(48.scale())
        }
        
        collectionView.register(ReplenishCell.self, forCellWithReuseIdentifier: ReplenishCell.identifier)
    }
    
    private func setupCollectionViewLayout() {
        collectionViewLayout.itemSize = CGSize(width: 127.scale(), height: 48.scale())
        collectionViewLayout.minimumInteritemSpacing = 12
        collectionViewLayout.scrollDirection = .horizontal
        collectionViewLayout.sectionInset = .init(top: 0, left: 24, bottom: 0, right: 24)
    }
    
    private func setupReplenishButton() {
        replenishButton.configure(
            title: Localizable.replenish())
        
        addSubview(replenishButton)
        replenishButton.snp.makeConstraints {
            $0.top.equalTo(collectionView.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(58.scale())
        }
    }
    
    @objc private func moveBack() {
        backAction?()
    }
    
    private func createDataSource() -> ReplenishDataSourseAdapter {
        return ReplenishDataSourseAdapter(collectionView)
    }
}

//MARK: - Public -
extension ReplenishViewImpl {
    private func setupAction() {
        replenishButton.setActionButton { [weak self] in
            self?.amountAction?(self?.textField.text ?? "")
        }

        textField.setAction { [weak self] value in
            self?.replenishButton.setEnable(isEnabled: value)
        }
    }

    func setBackAction(_ action: @escaping EmptyClosure) {
        self.backAction = action
    }
    
    func setAmountAction(_ action: @escaping ((String) -> Void)) {
        self.amountAction = action
    }
    
    func setAmountTapAction(_ action: @escaping ((Int) -> Void)) {
        delegateAdapter.setAction(action)
    }
    
    func updateTextField(amount: Int) {
        textField.text = String(amount)
    }
    
    func update(with amountValues: [Int]) {
        dataSourceAdapter?.updateReplenishCell(with: amountValues)
    }
    
    func makeTextFieldFirstResponder() {
        textField.becomeFirstResponder()
    }
}
