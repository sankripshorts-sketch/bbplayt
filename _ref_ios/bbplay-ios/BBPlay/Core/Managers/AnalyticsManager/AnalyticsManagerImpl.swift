import Foundation

final class AnalyticsManagerImpl {
    
    private let appMetrica: AppMetricaBackend

    init(
        appMetrica: AppMetricaBackend
    ) {
        self.appMetrica = appMetrica
    }
    
    private var memberId: String? {
        didSet {
            if oldValue != memberId {
                appMetrica.setUserId(with: memberId)
            }
        }
    }

    private var memberNickname: String?
    
    private func reportEvent(with eventName: String) {
        appMetrica.sendEvent(eventName: eventName, eventParams: defaultParams)
    }
    
    private func reportEvent(with eventName: String, and params: [String: Any]) {
        appMetrica.sendEvent(eventName: eventName, eventParams: params)
    }

    private var defaultParams: [String: Any] {
        var dict = [String: Any]()
        
        if let memberId = memberId {
            dict["memberId"] = memberId
        }
        
        if let memberNickname = memberNickname {
            dict["memberNickname"] = memberNickname
        }
        
        return dict
    }
}

extension AnalyticsManagerImpl: AnalyticsManager {
    func updateAnalyticalInfo(with account: Account?) {
        guard let account = account else {
            memberId = nil
            memberNickname = nil
            return
        }
        
        memberId = String(account.memberId)
        memberNickname = account.memberNickname
    }
    
    func sendEvent(with eventName: AnalyticEventName) {
        reportEvent(with: eventName.localized)
    }
    
    func sendEvent(with eventName: AnalyticEventName, params: AnalyticEventParameters) {
        let param = defaultParams.merge(params.customParameters)
        reportEvent(with: eventName.localized, and: param)
    }
}
