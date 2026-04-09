import Foundation

protocol ReservationButtonFormatter {
    func title(cost: String) -> String?
    func description(pcName: String, timeStart: String?, duration: String?) -> String?
}
