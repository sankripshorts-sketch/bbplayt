import Foundation
import AppMetricaCore

protocol AppMetricaBackend {
    func sendEvent(eventName: String, eventParams: [String: Any]?)
    func setUserId(with id: String?)
}

extension AppMetricaBackend {
    func sendEvent(eventName: String) {
        sendEvent(eventName: eventName, eventParams: nil)
    }
}

final class AppMetricaBackendImpl: AppMetricaBackend {
    func sendEvent(eventName: String, eventParams: [String: Any]? = nil) {
        guard isRelease() else { return }
        AppMetrica.reportEvent(name: eventName, parameters: eventParams) { error in
            assertionFailure(error.localizedDescription)
        }
    }

    func setUserId(with id: String?) {
        AppMetrica.userProfileID = id
    }

    private func isRelease() -> Bool {
        return Environment.current == .prod
    }
}
