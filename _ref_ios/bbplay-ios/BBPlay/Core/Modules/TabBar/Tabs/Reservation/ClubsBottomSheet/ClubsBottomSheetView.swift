import Foundation
import SnapKit

final class ClubsBottomSheetView: UIView {
    
    private let flowLayout = UICollectionViewFlowLayout()
    private lazy var collectionView = UICollectionView(frame: .zero,
                                                       collectionViewLayout: flowLayout)
    private lazy var dataSourceAdapter = ClubsBottomSheetDataSourceAdapter(collectionView)
    private let mainButton = MainButton()
    init(frame: CGRect, adress: String) {
        super.init(frame: frame)
        setupUI()
        dataSourceAdapter.updateClubCell(adress: adress)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func setupUI() {
        setupFlowLayout()
        setupCollectionView()
        setupMainButton()
    }

    private func setupFlowLayout() {
        flowLayout.itemSize = CGSize(width: 327.scaleIfNeeded(),
                                     height: 58.scaleIfNeeded())
        flowLayout.minimumLineSpacing = 16.scaleIfNeeded()
        flowLayout.minimumInteritemSpacing = 16.scaleIfNeeded()
        flowLayout.scrollDirection = .vertical
        flowLayout.sectionInset.left = 24.scaleIfNeeded()
        flowLayout.sectionInset.right = 24.scaleIfNeeded()
    }
    
    private func setupCollectionView() {
        collectionView.backgroundColor = .clear
        collectionView.showsVerticalScrollIndicator = false
        collectionView.allowsMultipleSelection = false
        collectionView.allowsSelection = false
        collectionView.register(ClubsBottomSheetCell.self, forCellWithReuseIdentifier: ClubsBottomSheetCell.identifier)
        collectionView.register(NewClubsBottomSheetCell.self, forCellWithReuseIdentifier: NewClubsBottomSheetCell.identifier)
        
        addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(49.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    private func setupMainButton() {
        mainButton.configure(title: Localizable.select())
        
        addSubview(mainButton)
        mainButton.snp.makeConstraints {
            $0.top.equalTo(collectionView.snp.bottom).offset(32.scale())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.height.equalTo(58.scale())
            $0.bottom.equalToSuperview().inset(43.scale() + UIView.safeAreaBottom)
        }
    }
}

//MARK: - Set Action -
extension ClubsBottomSheetView {
    func setTapAction(_ action: @escaping EmptyClosure) {
        mainButton.setActionButton(action)
    }
}
