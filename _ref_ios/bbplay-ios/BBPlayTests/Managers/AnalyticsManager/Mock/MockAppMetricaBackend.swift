import Foundation
@testable import BBPlay

final class MockAppMetricaBackend: AppMetricaBackend {

    var eventName: String?
    var eventParams: [String: Any]?

    var userId: String?

    var sendEventCalledCount: Int = 0
    var setUserIdCalledCount: Int = 0

    func sendEvent(eventName: String, eventParams: [String: Any]? = nil) {
        self.eventName = eventName
        self.eventParams = eventParams
        sendEventCalledCount += 1
    }

    func setUserId(with id: String?) {
        userId = id
        setUserIdCalledCount += 1
    }

}
