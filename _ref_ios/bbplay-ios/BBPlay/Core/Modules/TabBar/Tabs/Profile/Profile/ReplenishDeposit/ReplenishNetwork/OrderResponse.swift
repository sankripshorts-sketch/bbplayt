import Foundation

struct OrderResponse: Decodable {
    let status: String
    let confirmation: OrderConfirmationResponse?
    
    enum CodingKeys: String, CodingKey {
        case status
        case confirmation
    }
}

struct OrderConfirmationResponse: Decodable {
    let confirmationUrl: String
    
    enum CodingKeys: String, CodingKey {
        case confirmationUrl = "confirmation_url"
    }
}
