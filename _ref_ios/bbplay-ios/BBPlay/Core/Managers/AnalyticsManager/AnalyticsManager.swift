import Foundation

protocol AnalyticsManager: AnyObject {
    func updateAnalyticalInfo(with account: Account?)
    func sendEvent(with eventName: AnalyticEventName)
    func sendEvent(with eventName: AnalyticEventName, params: AnalyticEventParameters)
}
