import Foundation

final class ReplenishConverter {
    
    func convertStatus(from status: String) -> PaymentState {
        switch status {
            case "succeeded": return .success
            case "pending": return .pending
            case "canceled": return .error
            default: return .pending
        }
    }

}
