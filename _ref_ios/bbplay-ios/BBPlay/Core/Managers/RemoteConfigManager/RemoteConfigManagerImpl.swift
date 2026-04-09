import Foundation
import FirebaseRemoteConfig

protocol RemoteConfigListener: AnyObject {
    func remoteConfigHasBeenFetched()
}

protocol RemoteConfigManager {
    func fetchClubs() async -> [String]
    
    func addListener(_ listener: RemoteConfigListener)
    func removeListener(_ listener: RemoteConfigListener)
}

final class RemoteConfigManagerImpl {
    
    private let remoteConfig = RemoteConfig.remoteConfig()
    private let networkStatus: NetworkStatusManager
    private let listeners = NSHashTable<AnyObject>(options: .weakMemory)
    
    private var lastStatusFetching: RemoteConfigFetchAndActivateStatus?
    
    // MARK: - init
    init(networkStatus: NetworkStatusManager) {
        self.networkStatus = networkStatus
        networkStatus.addListener(self)

        setupRemoteConfig()
        fetchConfig()
    }
    
    deinit {
        networkStatus.removeListener(self)
    }
    
    private func setupRemoteConfig() {
        let settings = RemoteConfigSettings()
        settings.minimumFetchInterval = 0
        settings.fetchTimeout = 3
        remoteConfig.configSettings = settings
    }
    
    private func fetchConfig(_ retryTimeout: DispatchTime = .now()) {
        guard networkStatus.isOnline else { return }
        
        DispatchQueue.main.asyncAfter(deadline: retryTimeout) { [weak self] in
            self?.remoteConfig.fetchAndActivate() { [weak self] status, error in
                if status == .successFetchedFromRemote {
                    self?.lastStatusFetching = .successFetchedFromRemote
                    logger.info("remote config has been fetched")
                    self?.notifyListeners()
                }
                else {
                    self?.lastStatusFetching = .error
                    logger.warning("remote config not fetched")
                    logger.info("start retry fetching remote config")
                    self?.fetchConfig(.now() + 3)
                    guard let error = error else { return }
                    logger.error(error.localizedDescription)
                }
            }
        }
    }
    
    private func notifyListeners() {
        listeners.allObjects.forEach { listener in
            guard let listener = listener as? RemoteConfigListener else { return }
            listener.remoteConfigHasBeenFetched()
        }
    }
}

// MARK: - RemoteConfigManager -
extension RemoteConfigManagerImpl: RemoteConfigManager {
    func fetchClubs() async -> [String] {
        guard let fetchingJsonClubs = remoteConfig.configValue(forKey: "clubs").jsonValue as? [String: [String]],
              let clubs = fetchingJsonClubs["clubs"] else {
            assertionFailure()
            return []
        }
        logger.info("clubs has been fetched, with: \(clubs)")
        return clubs
    }
    
    func addListener(_ listener: RemoteConfigListener) {
        listeners.add(listener)
    }
    
    func removeListener(_ listener: RemoteConfigListener) {
        listeners.remove(listener)
    }
}

// MARK: - NetworkStatusListener -
extension RemoteConfigManagerImpl: NetworkStatusListener {
    func networkStatusChanged(on status: NetworkStatusManagerImpl.NetworkStatus) {
        guard lastStatusFetching != .successFetchedFromRemote, status == .connected else { return }
        fetchConfig()
    }
}
