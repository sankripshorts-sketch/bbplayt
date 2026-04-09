import Foundation

struct BookingsResponse: Decodable {
    let code: Int
    let message: String
    let data: [BookingsDataResponse]?
}

struct BookingsDataResponse: Decodable {
    let memberOfferId: Int
    let productPcName: String
    let memberAccount: String
    let productAvailableDateLocalFrom: String
    let productAvailableDateLocalTo: String
    let productMins: Int
    let productDescription: String
    
    enum CodingKeys: String, CodingKey {
        case memberOfferId = "member_offer_id"
        case productPcName = "product_pc_name"
        case memberAccount = "member_account"
        case productAvailableDateLocalFrom = "product_available_date_local_from"
        case productAvailableDateLocalTo = "product_available_date_local_to"
        case productMins = "product_mins"
        case productDescription = "product_description"
    }
}
