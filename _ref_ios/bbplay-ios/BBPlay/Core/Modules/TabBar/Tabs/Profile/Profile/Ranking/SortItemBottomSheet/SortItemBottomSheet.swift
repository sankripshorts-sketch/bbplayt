import Foundation
import SnapKit

enum SortType: Int, CaseIterable {
    case assistants = 0
    case defeats
    case victories
    case KDR
    case kills
    case deaths
    case points
    case winRatio
    case none
}

extension SortType {
    var title: String {
        switch self {
            case .assistants: return Localizable.assistants()
            case .defeats: return Localizable.defeats()
            case .victories: return Localizable.victories()
            case .KDR: return Localizable.kdR()
            case .kills: return Localizable.kills()
            case .deaths: return Localizable.deaths()
            case .points: return Localizable.points()
            case .winRatio: return Localizable.winRatio()
            case .none:
                logger.error("switch existing")
                assertionFailure()
                return String()
        }
    }
}

final class SortItemBottomSheet: BaseBottomSheetController {
    
    private let cellHeight = 63.scaleIfNeeded()
    private let collectionViewHeight = 281.scaleIfNeeded()
    
    typealias SortBottomSheetDataSource = UICollectionViewDiffableDataSource<SortItemBottomSheet.Section, SortLeaderboard>
    
    private let saveButtonAction: ((SortType) -> Void)?

    private let saveButton = MainButton()
    private let availableSortType: [SortType]
    private let currentSortType: SortType
    private let topLine = UIView()
    private let bottomLine = UIView()
    
    private lazy var layout: UICollectionViewCompositionalLayout = {
        let itemSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                              heightDimension: .fractionalHeight(1.0))
        let item = NSCollectionLayoutItem(layoutSize: itemSize)
        
        let groupSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                               heightDimension: .absolute(cellHeight))
        let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitems: [item])
        
        let section = NSCollectionLayoutSection(group: group)

        // TODO: - Сделать вычисляемым. 281 - высота коллекции, 63 - высота ее ячейки. Делим все пополам, и вычитаем из коллекции ячейку - получаем красивое центрирование ячейки
        let inset = collectionViewHeight / 2 - cellHeight / 2
        section.contentInsets = .init(top: inset,
                                      leading: 0,
                                      bottom: inset + 1,
                                      trailing: 0)
        
        let layout = UICollectionViewCompositionalLayout(section: section)
        layout.configuration.scrollDirection = .vertical
        return layout
    }()

    private lazy var collectionView = UICollectionView(frame: .zero,
                                                       collectionViewLayout: layout)
    private var dataSource: SortBottomSheetDataSource?

    init(with currentSortType: SortType,
         availableSort: [SortType],
         action: @escaping ((SortType) -> Void)) {
        self.currentSortType = currentSortType
        self.availableSortType = availableSort
        self.saveButtonAction = action
        super.init(with: 517.scale())
        
        self.dataSource = createDataSource(with: collectionView)
        collectionView.delegate = self
        
        setupAction()
        updateCollectionView()
    }

    override func setupUI() {
        super.setupUI()
        setupSaveButton()
        setupCollectionView()
        setupTopLine()
        setupBottomLine()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        scrollViewDidScroll(collectionView)
        
        guard let index = availableSortType.firstIndex(where: { $0 == currentSortType }) else { return }
        collectionView.scrollToItem(at: IndexPath(row: index, section: SortItemBottomSheet.Section.main.rawValue),
                                    at: .centeredVertically,
                                    animated: false)
    }
    
    private func setupSaveButton() {
        saveButton.configure(title: Localizable.save())
        contentView.addSubview(saveButton)
        saveButton.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(contentView.safeAreaLayoutGuide.snp.bottom).inset(43.scale())
            $0.height.equalTo(58.scale())
        }
    }

    private func setupCollectionView() {
        collectionView.backgroundColor = .clear
        collectionView.showsVerticalScrollIndicator = false
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.register(PickerItemCell.self, forCellWithReuseIdentifier: PickerItemCell.identifier)

        contentView.addSubview(collectionView)
        collectionView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(53.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(saveButton.snp.top).offset(-48.scale())
        }
    }
    
    private func setupTopLine() {
        topLine.backgroundColor = Color.pickerViewDivider()
        topLine.layer.cornerRadius = 0.5
        
        contentView.addSubview(topLine)
        topLine.snp.makeConstraints {
            $0.centerY.equalTo(collectionView.snp.centerY).offset(-34.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(1)
        }
    }
    
    private func setupBottomLine() {
        bottomLine.backgroundColor = Color.pickerViewDivider()
        bottomLine.layer.cornerRadius = 0.5
        
        contentView.addSubview(bottomLine)
        bottomLine.snp.makeConstraints {
            $0.centerY.equalTo(collectionView.snp.centerY).offset(34.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(1)
        }
    }
    
    private func createDataSource(with collectionView: UICollectionView) -> SortBottomSheetDataSource {
        let dataSource = SortBottomSheetDataSource(collectionView: collectionView) { collectionView, indexPath, model in
            guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: PickerItemCell.identifier, for: indexPath) as? PickerItemCell else {
                logger.error("cell is nil")
                assertionFailure()
                return UICollectionViewCell()
            }
            cell.update(with: model)
            cell.transform = CGAffineTransform(scaleX: 0.5, y: 0.5)
            return cell
        }
        return dataSource
    }

    private func updateCollectionView() {
        guard var snapshot = dataSource?.snapshot() else { return }
        let models: [SortLeaderboard] = availableSortType.map { type -> SortLeaderboard in
            let title = type.title
            return SortLeaderboard(title: title, type: type)
        }

        snapshot.deleteAllItems()
        snapshot.appendSections([.main])
        snapshot.appendItems(models, toSection: .main)
        dataSource?.apply(snapshot)
    }
}

// MARK: - UICollectionViewDelegate
extension SortItemBottomSheet: UICollectionViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        let centerPoint = CGPoint(x: collectionView.center.x,
                                  y: collectionViewHeight / 2 + scrollView.contentOffset.y)

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

        UIView.animate(withDuration: 0.3, delay: 0, animations: { [self] in
            let positionRelativeCollectionView = collectionView.convert(centerCell.frame, to: collectionView).origin.y - scrollView.contentOffset.y + centerCell.bounds.height / 2
            let ratioOffset = positionRelativeCollectionView / collectionViewHeight
            
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

        updateConstraintForLines(with: centerCell.bounds)
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
    
    private func scrollToItem(with scrollView: UIScrollView) {
        let centerPoint = CGPoint(x: collectionView.center.x,
                                  y: collectionViewHeight / 2 + scrollView.contentOffset.y)
        guard let index = collectionView.indexPathForItem(at: centerPoint) else { return }
        
        guard !scrollView.isDragging else { return }
        collectionView.scrollToItem(at: index,
                                    at: .centeredVertically,
                                    animated: true)
    }
    
    private func updateConstraintForLines(with rect: CGRect) {
        topLine.snp.updateConstraints {
            $0.centerY.equalTo(collectionView.snp.centerY).offset(rect.height / 2)
        }

        bottomLine.snp.updateConstraints {
            $0.centerY.equalTo(collectionView.snp.centerY).offset(-rect.height / 2)
        }
    }
}

// MARK: - Set Action -
extension SortItemBottomSheet {
    func setupAction() {
        saveButton.setActionButton { [weak self] in
            guard let self = self else {
                logger.error("self is nil")
                assertionFailure()
                return
            }
            
            let centerPoint = CGPoint(x: self.collectionView.center.x,
                                      y: self.collectionView.bounds.height / 2 + self.collectionView.bounds.origin.y)
            guard let index = self.collectionView.indexPathForItem(at: centerPoint)?.row else { return }
            let sortType = self.availableSortType[index]
            self.saveButtonAction?(sortType)
        }
    }
}

extension SortItemBottomSheet {
    enum Section: Int, CaseIterable {
        case main
    }
}

// MARK: - Extension for array
extension Array {
    func animateElementPickerView(with collectionView: UICollectionView, inverted: Bool = false, offset: CGFloat) where (Element) == IndexPath {
        self.forEach { element in
            guard let cell = collectionView.cellForItem(at: element) as? PickerItemCell else { return }
            switch  self.firstIndex(of: element) {
                case 0:
                    let scaleValue = inverted ? 0.65 + offset * (1 - 0.65) : 0.65 + (1 - offset) * (1 - 0.65)
                    cell.transform = CGAffineTransform(scaleX: scaleValue, y: scaleValue)
                    cell.updateTextColor(with: Color.pickerViewTextDark()!)
                case 1:
                    let scaleValue = inverted ? 0.3 + offset * (1 - 0.3) : 0.3 + (1 - offset) * (1 - 0.3)
                    cell.transform = CGAffineTransform(scaleX: scaleValue, y: scaleValue)
                    cell.updateTextColor(with: Color.pickerViewTextVeryDark()!)
                default:
                    let scaleValue = inverted ? 0.1 + offset * (1 - 0.1) : 0.1 + (1 - offset) * (1 - 0.1)
                    cell.transform = CGAffineTransform(scaleX: scaleValue, y: scaleValue)
                    cell.updateTextColor(with: Color.pickerViewTextVeryDark()!.withAlphaComponent(0.6))
            }
        }
    }
}

// MARK: - Model For Sort -

struct SortLeaderboard {
    let uuid = UUID()
    
    let title: String
    let type: SortType
}

extension SortLeaderboard: Hashable {
    static func == (
        lhs: SortLeaderboard,
        rhs: SortLeaderboard) -> Bool {
            return lhs.uuid == rhs.uuid
        }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(uuid)
    }
}
