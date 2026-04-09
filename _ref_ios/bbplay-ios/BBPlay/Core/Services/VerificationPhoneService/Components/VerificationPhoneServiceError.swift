import Foundation

enum VerificationPhoneServiceError: Error {
    case memberNotFound(_ description: String)
    case phoneVerified(_ description: String)
    case manyRequests(_ description: String)

    case wrongCode(_ description: String)
    case limitReached(_ description: String)
}
