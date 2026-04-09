import Foundation

final class LocalEventsPresenterImpl {
    
    private weak var view: LocalEventsView?
    private let router: LocalEventsRouter
    private let accountManager: AccountManager
    private let networkService: LocalEventsAPI
    private let converter = LocalEventsConverter()
    private var isLoaded = false
    
    private var events: LocalEvents?
    
    init(router: LocalEventsRouter,
         networkService: LocalEventsAPI,
         accountManager: AccountManager) {
        self.router = router
        self.networkService = networkService
        self.accountManager = accountManager
    }
    
    func setView(_ view: LocalEventsView) {
        self.view = view
    }
}

// MARK: - Private -
private extension LocalEventsPresenterImpl {
    func getLocalEvents(isRefreshing: Bool = false) {
        Task {
            do {
                await MainActor.run {
                    guard !isRefreshing else { return }
                    view?.contentLoader(.on)
                }

                let eventsResponse = try await networkService.getLocalEvents()
                let eventList = try await converter.getLocalEventsList(with: eventsResponse)
                let events = try await getEvents(with: eventList)
                
                await MainActor.run {
                    self.events = events
                    isLoaded = true
                    view?.update(with: events)
                    view?.contentLoader(.off)
                    view?.endRefreshing()
                }
            }
            catch let error {
                logger.error(error)
                isLoaded = isLoaded ? isLoaded : false
                await MainActor.run {
                    view?.endRefreshing()
                }
            }
        }
    }
    
    func getEvents(with eventIds: [String]) async throws -> LocalEvents {
        async let events: [Event] = try await withThrowingTaskGroup(
            of: Event.self) { [self] group in
                var events = [Event]()
                for eventId in eventIds {
                    group.addTask { [self] in
                        return try await getEvent(with: eventId)
                    }
                    
                    for try await event in group {
                        events.append(event)
                    }
                }
                return events
                
            }
        
        // Нужно, чтобы показать заглушку если активные ивенты отсутствуют
        guard try await events.contains(where: { $0.sectionType == .active }) else {
            let emptyLocalEvent = await getEmptyLocalEvent()
            let eventWithEmptyLocalEvent = try await [emptyLocalEvent] + events
            return LocalEvents(events: eventWithEmptyLocalEvent)
        }
        
        return try await LocalEvents(events: events)
    }
    
    func getEvent(with id: String) async throws -> Event {
        let eventResponse = try await networkService.getMembersByEvent(with: id)
        let event = try await converter.getEventWithMembers(with: eventResponse)
        
        let rewardStatus = try await getStatusReward(with: event.event)
        
        let currentPlayerInEvent = getCurrentPlayerInEvent(of: event.members, with: rewardStatus)
        
        let sectionType = getSectionType(
            with: event.event.eventStatus,
            currentPlayerInEvent: currentPlayerInEvent)
        
        let eventTimeInterval = getEventTimeInterval(
            with: event.event.startEventTime,
            endEventDate: event.event.endEventTime,
            sectionType: sectionType)
        
        let gameType = try getGameType(with: event.event.gameCode)
        
        let eventTitle = Localizable.tournamentBy(gameType.gameTitle)
        
        let allPlayersInEvent = event.members.map {
            PlayerInEvent(memberId: $0.memberId,
                          nickname: $0.nickname,
                          points: $0.points,
                          rank: $0.rank)
        }
        
        return Event(eventId: event.event.eventId,
                     sectionType: sectionType,
                     gameType: gameType,
                     eventTitle: eventTitle,
                     eventTimeInterval: eventTimeInterval,
                     eventDescription: event.event.description,
                     currentPlayerInEvent: currentPlayerInEvent,
                     allPlayersInEvent: allPlayersInEvent)
    }
    
    func getSectionType(with eventStatus: EventStatus,
                        currentPlayerInEvent: CurrentPlayerInEvent?) -> LocalEventsViewImpl.Section {
        let rewardPlaces = [1, 2, 3]
        
        switch eventStatus {
            case .will: return .noVisible
            case .goes: return .active
            case .completed:
                guard let currentPlayerInEvent else { return .completed }
                if currentPlayerInEvent.rewardStatusPlayer == .notTakenReward && rewardPlaces.contains(where: { currentPlayerInEvent.rank == $0 }) {
                    return .reward
                }
                else {
                    return .completed
                }
        }
    }
    
    func getEventTimeInterval(with startEventDate: Date,
                              endEventDate: Date,
                              sectionType: LocalEventsViewImpl.Section) -> String {
        guard sectionType == .active else { return Localizable.finished() }
        
        let formatter = DateFormatter()
        formatter.setLocalizedDateFormatFromTemplate("dd.MM.yyyy")
        let newStartDate = formatter.string(from: startEventDate)
        let newEndDate = formatter.string(from: endEventDate)
        return String(format: "%@ - %@", arguments: [newStartDate, newEndDate])
    }
    
    func getGameType(with gameCode: String) throws -> GameType {
        guard let gameType = GameType.getGameType(with: gameCode) else {
            let error = NSError(domain: "GameType not found", code: -99)
            throw error
        }
        return gameType
    }
    
    func getStatusReward(with eventInfo: EventInfo) async throws -> RewardStatus {
        guard let account = accountManager.getAccount() else {
            return .noReward
        }
        
        let checkReward = try await networkService.checkReward(with: eventInfo.eventId,
                                                               memberId: String(account.memberId))
        
        switch checkReward.code {
            case 4: return .notTakenReward
            case 3: return .notTakenReward
            case 2: return .takenReward
            default: return .noReward
        }
    }
    
    func getCurrentPlayerInEvent(of allPlayers: [MemberInfo],
                                 with rewardStatus: RewardStatus) -> CurrentPlayerInEvent? {
        guard let account = accountManager.getAccount() else { return nil }
        guard let player = allPlayers.first(where: { $0.nickname == String(account.memberNickname) }) else { return nil }
        return CurrentPlayerInEvent(memberId: player.memberId,
                                    nickname: player.nickname,
                                    points: player.points,
                                    rank: player.rank,
                                    rewardStatusPlayer: rewardStatus)
    }
    
    func getEmptyLocalEvent() async -> Event {
        let emptyString = String()
        return Event(eventId: emptyString,
                     sectionType: .active,
                     gameType: .all,
                     eventTitle: emptyString,
                     eventTimeInterval: emptyString,
                     eventDescription: emptyString,
                     currentPlayerInEvent: nil,
                     allPlayersInEvent: [])
    }
    
    func getReward(with eventId: String, rewardSum: Int) async throws -> (RewardStatus, String) {
        guard let account = accountManager.getAccount() else {
            let error = NSError(domain: "Account exists", code: -99)
            return (.noReward, error.domain)
        }
        
        guard let privateKey = account.memberPrivateKey else {
            let error = NSError(domain: "Private key exists", code: -99)
            return (.noReward, error.domain)
        }
        
        let response = try await networkService.getReward(
            with: eventId,
            memberId: String(account.memberId),
            privateKey: privateKey,
            rewardSum: rewardSum)
        let status = converter.convertGetReward(with: response)
        return status
        
    }
}

// MARK: - LocalEventsPresenter -
extension LocalEventsPresenterImpl: LocalEventsPresenter {
    func onViewDidAppear() {
        getLocalEvents()
    }
    
    func cellDidTap(with eventId: String) {
        guard let event = events?.events.first(where: { $0.eventId == eventId }) else { return }
        router.openEvent(
            with: event,
            eventButtonTapAction: ({ [weak self] rewardSum, rewardStatus in
                guard let self else { return }
                Task {
                    do {
                        let rewardResult = try await self.getReward(with: eventId, rewardSum: rewardSum)
                        rewardStatus?(rewardResult.0, rewardResult.1)
                    }
                    catch let error {
                        let error = error as NSError
                        rewardStatus?(.noReward, error.domain)
                    }
                }
            }), eventRefreshAction: { updateEvent in
                Task(priority: .high) { [weak self] in
                    guard let self else { return }
                    do {
                        let event = try await getEvent(with: eventId)
                        updateEvent?(event)
                    }
                    catch let error {
                        logger.error(error)
                        updateEvent?(nil)
                    }
                }
            })
    }
    
    func pullToRefreshTriggered() {
        getLocalEvents(isRefreshing: true)
    }
}

// MARK: - View Model -
struct LocalEvents {
    let events: [Event]
}

struct Event {
    let uuid = UUID()
    
    let eventId: String
    let sectionType: LocalEventsViewImpl.Section
    
    let gameType: GameType
    let eventTitle: String
    let eventTimeInterval: String
    let eventDescription: String
    
    let currentPlayerInEvent: CurrentPlayerInEvent?
    let allPlayersInEvent: [PlayerInEvent]
    
    let rewardPlaces: [Int] = [1, 2, 3]
}

extension Event: Hashable {
    static func == (lhs: Event, rhs: Event) -> Bool {
        lhs.uuid == rhs.uuid
    }
}

struct CurrentPlayerInEvent: Hashable {
    let memberId: String
    let nickname: String
    let points: String
    let rank: Int
    
    let rewardStatusPlayer: RewardStatus
}

struct PlayerInEvent: Hashable {
    let memberId: String
    let nickname: String
    let points: String
    let rank: Int
}

// MARK: - Reward status -
enum RewardStatus {
    case noReward
    case notTakenReward
    case takenReward
}
