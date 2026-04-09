import Foundation
import SnapKit

final class DatePickerViewImpl: UIView {

    private let titleLabel = UILabel()
    private lazy var collectionView = UICollectionView(frame: .zero,
                                                       collectionViewLayout: makeLayout())
    private var dataSource: DatePickerDataSourceAdapter?
    private let continueButton = MainButton()
    
    private let collectionViewHeight = 206.scale()
    private let cellHeight = 48.scale()
    
    private let viewOpacity = UIView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        dataSource = DatePickerDataSourceAdapter(collectionView)
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    private func makeLayout() -> UICollectionViewCompositionalLayout {
        let itemSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                              heightDimension: .fractionalHeight(1.0))
        let item = NSCollectionLayoutItem(layoutSize: itemSize)
        
        let groupSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                               heightDimension: .absolute(cellHeight))
        let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitems: [item])
        
        let section = NSCollectionLayoutSection(group: group)
        
        let inset = collectionViewHeight / 2 - cellHeight / 2
        section.contentInsets = .init(top: inset,
                                      leading: 0,
                                      bottom: inset + 1,
                                      trailing: 0)
        
        let layout = UICollectionViewCompositionalLayout(section: section)
        layout.configuration.scrollDirection = .vertical
        return layout
    }
    
    private func setupUI() {
        setupTitleLabel()
        setupContinueButton()
        setupCollectionView()
        setupOpacityView()
    }
    
    private func setupTitleLabel() {
        titleLabel.text = Localizable.selectDateWhenReservePlace()
        titleLabel.font = Font.dinRoundProMedi(size: 20.scale())
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(34.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }
    
    private func setupContinueButton() {
        continueButton.configure(title: Localizable.save())
        continueButton.setEnable(isEnabled: true)
        
        addSubview(continueButton)
        continueButton.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(layoutMarginsGuide.snp.bottom).inset(43.scale())
            $0.height.equalTo(58.scale())
        }
    }
    
    private func setupCollectionView() {
        collectionView.register(DatePickerCell.self, forCellWithReuseIdentifier: DatePickerCell.identifier)
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.backgroundColor = .clear
        collectionView.delegate = self

        addSubview(viewOpacity)
        addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.top.greaterThanOrEqualTo(titleLabel.snp.bottom)
            $0.bottom.equalTo(continueButton.snp.top).offset(-24.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(collectionViewHeight)
        }
    }
    
    private func setupOpacityView() {
        viewOpacity.layer.cornerRadius = 8
        //TODO: - Цвет
        viewOpacity.backgroundColor = UIColor(red: 0.145, green: 0.192, blue: 0.239, alpha: 1)
        
        viewOpacity.snp.makeConstraints {
            $0.centerY.equalTo(collectionView.snp.centerY)
            $0.height.equalTo(cellHeight)
            $0.left.right.equalTo(collectionView)
        }
    }
    
    private func getCellIndex() -> Int? {
        let centerPoint = CGPoint(x: self.collectionView.center.x,
                                  y: self.collectionView.bounds.height / 2 + self.collectionView.bounds.origin.y)
        guard let indexPath = collectionView.indexPathForItem(at: centerPoint) else { return nil }
        return indexPath.row
    }
}

// MARK: - Public -
extension DatePickerViewImpl {
    func setContinueButtonAction(_ action: @escaping IntClosure) {
        continueButton.setActionButton { [weak self] in
            guard let index = self?.getCellIndex() else { return }
            action(index)
        }
    }

    func update(with text: DatePickerPresenterImpl.DatePicker) {
        dataSource?.update(with: text)
    }
    
    func updateScrollViewDidScroll() {
        scrollViewDidScroll(collectionView, animated: false)
    }
    
    func scroll(to index: Int) {
        let indexPath = IndexPath(row: index, section: 0)
        collectionView.scrollToItem(
            at: indexPath,
            at: .centeredVertically,
            animated: false)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [self] in
            scrollViewDidScroll(collectionView, animated: false)
        }
    }
}

//MARK: - Sections -
extension DatePickerViewImpl {
    enum Section: Int {
        case main
    }
}

// MARK: - UICollectionViewDelegate
extension DatePickerViewImpl: UICollectionViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        scrollViewDidScroll(scrollView, animated: true)
    }
    
    func scrollViewDidScroll(_ scrollView: UIScrollView, animated: Bool) {
        let centerPoint = CGPoint(x: collectionView.center.x,
                                  y: collectionView.frame.height / 2 + scrollView.contentOffset.y)
        
        let allVisibleCells = collectionView.indexPathsForVisibleItems
        guard let index = collectionView.indexPathForItem(at: centerPoint),
              let centerCell = collectionView.cellForItem(at: index) as? PickerItemCell else { return }
        
        let beforeToCurrent = allVisibleCells.compactMap({ element -> IndexPath? in
            guard element.row < index.row else { return nil }
            return element
        }).sorted(by: { $0 > $1 })
        
        let afterFromCurrent = allVisibleCells.compactMap({ element -> IndexPath? in
            guard element.row > index.row else { return nil }
            return element
        }).sorted(by: { $0 < $1 })
        
        let duration: TimeInterval = animated ? 0.3 : 0.0001
        UIView.animate(withDuration: duration, delay: 0, animations: { [self] in
            let positionRelativeCollectionView = collectionView.convert(centerCell.frame, to: collectionView).origin.y - scrollView.contentOffset.y + centerCell.bounds.height / 2
            let ratioOffset = positionRelativeCollectionView / collectionView.frame.height
            
            var scaleValue: CGFloat = 1
            
            if centerPoint.y > centerCell.frame.midY {
                scaleValue = 0.8 + (2 * ratioOffset) * (1 - 0.8)
            }
            else if centerPoint.y < centerCell.frame.midY {
                scaleValue = 0.8 + (2 * (1 - ratioOffset)) * (1 - 0.8)
            }
            
            beforeToCurrent.animateElementPickerView(with: collectionView, inverted: true, offset: ratioOffset)
            centerCell.transform = CGAffineTransform(scaleX: scaleValue, y: scaleValue)
            centerCell.updateTextColor(with: .white)
            
            afterFromCurrent.animateElementPickerView(with: collectionView, offset: ratioOffset)
        })
    }
    
    private func scrollToItem(with scrollView: UIScrollView) {
        let centerPoint = CGPoint(x: collectionView.center.x,
                                  y: collectionView.frame.height / 2 + scrollView.contentOffset.y)
        guard let index = collectionView.indexPathForItem(at: centerPoint) else { return }
        
        guard !scrollView.isDragging else { return }
        collectionView.scrollToItem(at: index,
                                    at: .centeredVertically,
                                    animated: true)
    }
    
    func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
        scrollToItem(with: scrollView)
    }
    
    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        scrollToItem(with: scrollView)
    }
    
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        collectionView.scrollToItem(
            at: indexPath,
            at: .centeredVertically,
            animated: true)
    }
}
