import Foundation
import Dispatch
import Network

protocol NetworkStatusListener: AnyObject {
    func networkStatusChanged(on status: NetworkStatusManagerImpl.NetworkStatus)
}

protocol NetworkStatusManager: AnyObject {
    var isOnline: Bool { get }
    
    func addListener(_ listener: NetworkStatusListener)
    func removeListener(_ listener: NetworkStatusListener)
}

final class NetworkStatusManagerImpl {

    private let networkQueue = DispatchQueue(label: "NetworkStatusManager", qos: .utility)
    private let networkMonitor = NWPathMonitor()
    private let listeners = NSHashTable<AnyObject>(options: .weakMemory)
    
    private var currentNetworkState: NetworkStatus = .unknown
    private var pathStatus: NWPath.Status? {
        didSet {
            guard oldValue != pathStatus  else { return }
            notifyListeners()
        }
    }
    
    private var currentConnection: ConnectionType {
        if networkMonitor.currentPath.usesInterfaceType(.wifi) {
            return .wifi
        }
        else if networkMonitor.currentPath.usesInterfaceType(.cellular) {
            return .internet3G_4G
        }
        else if networkMonitor.currentPath.usesInterfaceType(.wiredEthernet) {
            return .ethernet
        }
        else {
            return .unknown
        }
    }
    
    init() {
        setupNetworkMonitor()
    }
    
    deinit {
        stopMonitoring()
    }
    
    private func setupNetworkMonitor() {
        networkMonitor.pathUpdateHandler = { [weak self] newPath in
            guard let self else { return }
    
            if newPath.status == .satisfied {
                logger.info("Network connected with \(currentConnection)")
                currentNetworkState = .connected
            }
            else {
                if #available(iOS 14.2, *) {
                    logger.warning("Network disconnected, because \(newPath.unsatisfiedReason)")
                }
                else {
                    logger.warning("Network disconnected")
                }
                currentNetworkState = .notConnected
            }
            pathStatus = newPath.status
        }
        networkMonitor.start(queue: networkQueue)
    }
    
    private func stopMonitoring() {
        networkMonitor.cancel()
    }
    
    private func notifyListeners() {
        listeners.allObjects.forEach { listener in
            guard let listener = listener as? NetworkStatusListener else { return }
            listener.networkStatusChanged(on: currentNetworkState)
        }
    }
}

// MARK: - ConnectionType -
private extension NetworkStatusManagerImpl {
    enum ConnectionType {
        case wifi
        case ethernet
        case internet3G_4G
        case unknown
    }
}

//MARK: - NetworkState -
extension NetworkStatusManagerImpl {
    enum NetworkStatus {
        case connected
        case notConnected
        case unknown
    }
}

//MARK: - NetworkStatusManager -
extension NetworkStatusManagerImpl: NetworkStatusManager {
    var isOnline: Bool {
        return currentNetworkState == .connected
    }
    
    func addListener(_ listener: NetworkStatusListener) {
        listeners.add(listener)
    }
    
    func removeListener(_ listener: NetworkStatusListener) {
        listeners.remove(listener)
    }
}
