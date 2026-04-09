import Foundation
import UIKit

typealias EventButtonTapAction = ((Int, (((RewardStatus, String) -> Void)?)) async -> Void)?
typealias EventRefreshAction = ((((Event?) -> Void)?) async -> Void)?

final class LocalEventPresenterImpl {

    private weak var view: LocalEventView?
    private let router: LocalEventRouter
    private var event: Event

    private let eventButtonTapAction: EventButtonTapAction
    private let eventRefreshAction: EventRefreshAction
    
    init(event: Event,
         router: LocalEventRouter,
         eventButtonTapAction: EventButtonTapAction,
         eventRefreshAction: EventRefreshAction) {
        self.event = event
        self.router = router
        self.eventButtonTapAction = eventButtonTapAction
        self.eventRefreshAction = eventRefreshAction
    }
}

// MARK: - Sections -
private extension LocalEventPresenterImpl {
    func makeWinningPlaceSection() -> Section<Header, Item> {
        let winningPlaceHeader = makeHeader()
        let winningPlaceItems: [Item] = LocalEventPlace.allCases.compactMap {
            guard $0 != .none else { return nil }
            return Item(cellType: $0, cellInfo: .defaultCellInfo())
        }
        return Section(sectionType: .winningPlace,
                       header: winningPlaceHeader,
                       items: winningPlaceItems)
    }
    
    func makeHeader() -> Header {
        let headerDateTextColor = event.sectionType != .active ? Color.finishedTimeColor() : Color.activeTimeColor()
        let headerDateInfo = HeaderDate(date: event.eventTimeInterval,
                                        textColor: headerDateTextColor!)
        return Header(sectionType: event.sectionType,
                      title: event.eventTitle,
                      date: headerDateInfo,
                      image: event.gameType.imageForHeader,
                      description: event.eventDescription)
    }
    
    func makeTopPlayersSection() -> Section<Header, Item> {
        let topPlayersHeader = Header.defaultInit()
        let topPlayerItems = event.allPlayersInEvent.map {
            let cellInfo = CellInfo(memberId: $0.memberId,
                                    nickname: $0.nickname,
                                    points: $0.points,
                                    currentPlayerRank: event.currentPlayerInEvent?.rank,
                                    rank: $0.rank)
            return Item(cellType: .none, cellInfo: cellInfo)
        }.sorted(by: { $0.cellInfo.rank < $1.cellInfo.rank })
        return Section(sectionType: .topPlayer,
                       header: topPlayersHeader,
                       items: topPlayerItems)
    }
    
    func makeSections() -> LocalEvent<Section<Header, Item>> {
        let winningPlaceSection = makeWinningPlaceSection()
        let topPlayerSection = makeTopPlayersSection()
        return LocalEvent(sections: [winningPlaceSection, topPlayerSection])
    }
    
    func updateMainView() {
        let sections = makeSections()
        view?.update(with: sections)
    }
    
    func updateBottomView() {
        guard let currentPlayer = event.currentPlayerInEvent else {
            view?.updateBottomView(with: .canConnect,
                                   description: nil,
                                   title: nil)
            return
        }

        if event.sectionType == .active {
            let title = Localizable.youInNumberPlace(String(currentPlayer.rank))
            view?.updateBottomView(with: .participant,
                                   description: nil,
                                   title: title)
            return
        }

        if currentPlayer.rewardStatusPlayer == .notTakenReward && event.rewardPlaces.contains(where: { currentPlayer.rank == $0 }) {
            let title = Localizable.takeRewardButton().uppercased()
            let description = makePlaceWithReward()
            view?.updateBottomView(with: .canTakeReward,
                                   description: description,
                                   title: title)
            return
        }
        else if currentPlayer.rewardStatusPlayer == .notTakenReward {
            let title = Localizable.youInNumberPlace(String(currentPlayer.rank))
            view?.updateBottomView(with: .participant,
                                   description: nil,
                                   title: title)
            return
        }
        
        if currentPlayer.rewardStatusPlayer == .takenReward && event.rewardPlaces.contains(where: { currentPlayer.rank == $0 }) {
            let title = makePlaceWithReward()
            let description = Localizable.rewardIsCollected().uppercased()
            view?.updateBottomView(with: .rewardHasBeenTaken,
                                   description: description,
                                   title: title)
            return
        }
        else if currentPlayer.rewardStatusPlayer == .takenReward {
            let title = Localizable.youInNumberPlace(String(currentPlayer.rank))
            view?.updateBottomView(with: .participant,
                                   description: nil,
                                   title: title)
            return
        }
    }
    
    func makePlaceWithReward() -> String {
        guard let currentPlayer = event.currentPlayerInEvent else {
            assertionFailure()
            return ""
        }
        
        let place: LocalEventPlace
    
        switch currentPlayer.rank {
            case 1: place = .one
            case 2: place = .two
            case 3: place = .three
            default: place = .none; assertionFailure("Сюда не ходи, что-то ты сделал не так...")
        }

        return String(format: "%@ | %@",
                      place.text,
                      place.price).uppercased()
    }
}

// MARK: - LocalEventPresenter -
extension LocalEventPresenterImpl: LocalEventPresenter {
    func setView(with view: LocalEventView) {
        self.view = view
    }
    
    func onViewWillAppear() {
        updateMainView()
        updateBottomView()
    }
    
    func connectEventButtonTapped() {
        router.openHowToJointBottomSheet()
    }
    
    func eventButtonTapped() {
        view?.updateBottomButton(isEnabled: false)
        
        guard let rank = event.currentPlayerInEvent?.rank else {
            view?.showErrorAlert(with: "Ваш ранг не известен")
            return
        }
        
        let sum: Int?
        
        switch rank {
            case 1: sum = Int(LocalEventPlace.Prices.one)
            case 2: sum = Int(LocalEventPlace.Prices.two)
            case 3: sum = Int(LocalEventPlace.Prices.three)
            default: sum = nil
        }
        
        guard let sum else {
            view?.showErrorAlert(with: "Наградная сумма не получена")
            return
        }

        Task(priority: .high) {
            await eventButtonTapAction?(sum) { [weak self] rewardStatus, message in
                guard let self else { return } // For async execute
                guard rewardStatus == .notTakenReward else {
                    DispatchQueue.main.async { [weak self] in
                        self?.view?.showErrorAlert(with: message)
                        self?.view?.updateBottomButton(isEnabled: true)
                    }
                    return
                }
                
                DispatchQueue.main.async { [weak self] in
                    self?.view?.showSuccessAlert(with: message)
                }
            }
        }
    }
    
    func pullToRefreshTriggered() {
        Task(priority: .high) {
            await eventRefreshAction?() { [weak self] event in
                guard let self else { return }

                guard let event else {
                    view?.endRefreshing()
                    view?.showErrorAlert(with: "Update error")
                    return
                }

                DispatchQueue.main.async { [weak self] in
                    self?.event = event
                    self?.updateMainView()
                    self?.updateBottomView()
                    self?.view?.endRefreshing()
                }
            }
        }
    }
}

//MARK: - Local Event View Model -
struct LocalEvent<T: Hashable>: Hashable {
    let sections: [T]
}

// MARK: - Section
struct Section<U: Hashable, T: Hashable>: Hashable {
    let sectionType: LocalEventViewImpl.CVSection
    let header: U
    let items: [T]
}

// MARK: - Item
struct Item: Hashable {
    let uuid = UUID()
    let cellType: LocalEventPlace
    let cellInfo: CellInfo
    
    static func == (lhs: Item, rhs: Item) -> Bool {
        return lhs.uuid == rhs.uuid
    }
}
// MARK: - CellInfo
struct CellInfo: Hashable {
    let memberId: String
    let nickname: String
    let points: String
    let currentPlayerRank: Int?
    let rank: Int

    static func defaultCellInfo() -> Self {
        let emptyString = String()
        return .init(memberId: emptyString,
                     nickname: emptyString,
                     points: emptyString,
                     currentPlayerRank: -99,
                     rank: -99)
    }
}

// MARK: - Header
struct Header: Hashable {
    let sectionType: LocalEventsViewImpl.Section
    let title: String
    let date: HeaderDate
    let image: UIImage?
    let description: String

    static func defaultInit() -> Self {
        return .init(sectionType: .noVisible,
                     title: "",
                     date: HeaderDate(date: "",
                                      textColor: .alizarin),
                     image: UIImage(),
                     description: "")
    }
}

struct HeaderDate: Hashable {
    let date: String
    let textColor: UIColor
}
