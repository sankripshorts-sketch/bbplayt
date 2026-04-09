import Foundation
import SnapKit

final class MyReserveViewImpl: BaseView {
    private let titleLabel = UILabel()
    
    private let collectionViewLayout = UICollectionViewFlowLayout()
    private lazy var collectionView = UICollectionView(frame: .zero,
                                                       collectionViewLayout: collectionViewLayout)
    private var dataSource: MyReserveViewDataSourceAdapter?
    
    override init() {
        super.init()
        dataSource = MyReserveViewDataSourceAdapter(collectionView)
    }
    
    override func setupUI() {
        backgroundColor = Color.background()
        setupTitleLabel()
        setupCollectionLayout()
        setupCollectionView()
    }
}

// MARK: - Private -
private extension MyReserveViewImpl {
    func setupTitleLabel() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineHeightMultiple = 0.78
        paragraph.minimumLineHeight = 28.scale()
        paragraph.maximumLineHeight = 28.scale()
        
        let text = NSAttributedString(
            string: Localizable.myReserveButton(),
            attributes: [
                .paragraphStyle: paragraph,
                .foregroundColor: UIColor.white,
                .font: Font.dinRoundProBold(size: 28.scale())!
            ])
        
        titleLabel.attributedText = text
        addSubview(titleLabel)
        
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(104.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupCollectionLayout() {
        collectionViewLayout.minimumLineSpacing = 16.scale()
        collectionViewLayout.scrollDirection = .vertical
        collectionViewLayout.itemSize = .init(width: 327.scaleIfNeeded(),
                                              height: 131.scaleIfNeeded())
    }
    
    func setupCollectionView() {
        collectionView.backgroundColor = .clear
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.register(ReserveCardCell.self,
                                forCellWithReuseIdentifier: ReserveCardCell.identifier)

        addSubview(collectionView)

        collectionView.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(16.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview().inset(Self.safeAreaBottom)
        }
    }
}

// MARK: - Public -
extension MyReserveViewImpl {
    func updateMyReserveCard(with models: [MyReservePresenterImpl.CardModel]) {
        dataSource?.update(with: models)
    }
}
