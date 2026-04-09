import Foundation
import SnapKit

final class ClubsViewImpl: UIView {
    
    private let logo = UIImageView()
    private let feedbackButton = MainButton()
    
    private let collectionView: UICollectionView
    private let dataSourceAdapter: ClubsDataSourceAdapter

    override init(frame: CGRect) {
        self.collectionView = UICollectionView(frame: .zero, collectionViewLayout: .init())
        self.dataSourceAdapter = ClubsDataSourceAdapter(collectionView)
        super.init(frame: frame)
        setupUI()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    override func updateConstraints() {
        super.updateConstraints()
        feedbackButton.snp.updateConstraints {
            $0.bottom.equalToSuperview().inset(tabBarHeight + 32.scale())
        }
    }
}

// MARK: - Private -
private extension ClubsViewImpl {
    func setupUI() {
        backgroundColor = Color.background()
        setupLogo()
        setupFeedbackButton()
        setupCollectionViewFlowLayout()
        setupCollectionView()
    }

    func setupLogo() {
        logo.image = Image.logo()
        addSubview(logo)

        logo.snp.makeConstraints {
            $0.centerX.equalToSuperview()
            $0.top.equalToSuperview().inset(68.scale())
            $0.height.equalTo(49.scale())
            $0.width.equalTo(125.scale())
        }
    }
    
    func setupCollectionViewFlowLayout() {
        let collectionViewLayout = UICollectionViewFlowLayout()
        collectionViewLayout.scrollDirection = .vertical
        collectionViewLayout.estimatedItemSize = CGSize(
            width: UIScreen.main.bounds.width,
            height: 272.scaleIfNeeded()
        )
        collectionViewLayout.minimumLineSpacing = 16.scaleIfNeeded()
        collectionView.collectionViewLayout = collectionViewLayout
    }
    
    func setupCollectionView() {
        collectionView.register(ClubCardCell.self, forCellWithReuseIdentifier: ClubCardCell.identifier)
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.backgroundColor = .clear
        addSubview(collectionView)
        
        collectionView.snp.makeConstraints {
            $0.top.equalTo(logo.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(feedbackButton.snp.top).inset(-32.scale())
        }
    }

    func setupFeedbackButton() {
        feedbackButton.configure(title: Localizable.feedback())
        addSubview(feedbackButton)

        feedbackButton.snp.makeConstraints {
            $0.bottom.equalToSuperview().inset(0)
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(58.scale())
        }
    }
}

// MARK: - Set Action -
extension ClubsViewImpl {
    func setFeedbackAction(_ action: @escaping EmptyClosure) {
        feedbackButton.setActionButton(action)
    }
}

// MARK: - Update -
extension ClubsViewImpl {
    func updateView(with models: [ClubModel]) {
        dataSourceAdapter.update(with: models)
    }
}


