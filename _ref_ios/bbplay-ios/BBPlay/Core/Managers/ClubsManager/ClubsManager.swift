import Foundation

@objc
protocol ClubsManagerListener: AnyObject {
    func clubsHasBeenUpdated()
}

protocol ClubsManager: AnyObject {
    var clubsList: [Club] { get }
    
    func getClubId() -> String
    func getCurrentClub() -> Club?

    func setCurrentClub(with id: String)
    
    
    func addListener(_ listener: ClubsManagerListener)
    func removeListener(_ listener: ClubsManagerListener)
}

final class ClubsManagerImpl {
    private let authManager: AuthManager
    private let remoteConfigManager: RemoteConfigManager
    private let networkService: NetworkService
    private let proxyNetworkService: NetworkServiceProtocol
    private let clubsHolder: ClubsHolder
    private var listeners = NSHashTable<ClubsManagerListener>(options: .weakMemory)
    
    private let adressConverter = ReservationAdressConverter()
    private let priceConverter = ReservationPricesConverter()
    private let roomsConverter: RoomsConverter
    
    init(authManager: AuthManager,
         roomsConverter: RoomsConverter = RoomsConverterImpl(),
         remoteConfigManager: RemoteConfigManager,
         networkService: NetworkService,
         proxyNetworkService: NetworkServiceProtocol,
         clubsHolder: ClubsHolder
    ) {
        self.authManager = authManager
        self.roomsConverter = roomsConverter
        self.remoteConfigManager = remoteConfigManager
        self.networkService = networkService
        self.proxyNetworkService = proxyNetworkService
        self.clubsHolder = clubsHolder
        
        remoteConfigManager.addListener(self)
        authManager.add(listener: self)
    }
    
    deinit {
        authManager.remove(listener: self)
        remoteConfigManager.removeListener(self)
    }
    
    var clubsList: [Club] = [] {
        didSet {
            guard !clubsList.isEmpty else {
                Task {
                    await wait(sec: DEFAULT_WAIT_TIME)
                    await updateClubsInfo()
                }
                return
            }
            
            notifyListeners()
        }
    }
}

// MARK: - Private -
private extension ClubsManagerImpl {
    func getClubs() async {
        let clubs = await remoteConfigManager.fetchClubs()
        await MainActor.run { clubsHolder.setClubs(with: clubs) }
        await updateClubsInfo()
    }

    func updateClubsInfo() async {
        let clubsList = await withThrowingTaskGroup(of: [Club].self) { group in
            let clubsIds = self.clubsHolder.getClubs()
            var clubs: [Club] = []
            
            for id in clubsIds {
                do {
                    let adress = try await getCafeAdress(for: id)
                    let prices = try await getPrices(for: id)
                    let rooms = try await getGameRooms(for: id)
                    
                    let club = Club(clubId: id,
                                    adress: adress,
                                    prices: prices,
                                    rooms: rooms)
                    clubs.append(club)
                }
                catch let error {
                    logger.error(error)
                    continue
                }
            }
            return clubs
        }
        
        await MainActor.run {
            self.clubsList = clubsList
        }

    }

    func invalidate() async {
        await getClubs()
        await updateClubsInfo()
    }

    func notifyListeners() {
        listeners.allObjects.forEach {
            $0.clubsHasBeenUpdated()
        }
    }
    
    //MARK: - Update
    func getCafeAdress(for id: String) async throws -> AdressInfo {
        let model = try await networkService.getCafeAdress(for: id)
        return try await adressConverter.convertAdress(with: model)
    }

    func getPrices(for id: String) async throws -> AllPrices {
        let memberId: String?
        if let accountMemberId = authManager.getAccount()?.memberId {
            memberId = String(accountMemberId)
        } else {
            memberId = nil
        }

        let response = try await proxyNetworkService.request(
            endpoint: PricesEndpoint.prices(
                params: .init(
                    cafeId: id,
                    memberId: memberId,
                    bookingDate: nil,
                    mins: nil
                )
            )
        ).map(
            PricesResponse.self,
            ErrorResponse.self
        )

        return await priceConverter.convertPrices(from: response)
    }
    
    func getGameRooms(for id: String) async throws -> GameRooms {
        let roomsResponse = try await proxyNetworkService.request(
            endpoint: RoomsEndpoint.rooms(
                params: .init(cafeId: id)
            )
        ).map(
            RoomsResponse.self,
            ErrorResponse.self
        )

        return roomsConverter.convert(roomResponse: roomsResponse)
    }
}

// MARK: - ClubsManager -
extension ClubsManagerImpl: ClubsManager {
    func setCurrentClub(with id: String) {
        clubsHolder.setCurrentSelectedClub(with: id)
    }

    func getClubId() -> String {
        return clubsHolder.getClubId()
    }

    func getCurrentClub() -> Club? {
        let currentClubId = clubsHolder.getClubId()
        return clubsList.first(where: { $0.clubId == currentClubId })
    }

    func addListener(_ listener: ClubsManagerListener) {
        listeners.add(listener)
    }
    
    func removeListener(_ listener: ClubsManagerListener) {
        listeners.remove(listener)
    }
}

// MARK: - RemoteConfigListener -
extension ClubsManagerImpl: RemoteConfigListener {
    func remoteConfigHasBeenFetched() {
        Task { await getClubs() }
    }
}

extension ClubsManagerImpl: AuthManagerListener {
    func login() {
        Task {
            await invalidate()
        }
    }
    
    func logout() {
        Task {
            await invalidate()
        }
    }
}

struct Club {
    let clubId: String
    let adress: AdressInfo
    let prices: AllPrices
    let rooms: GameRooms
}
