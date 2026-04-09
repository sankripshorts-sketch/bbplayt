import Foundation

struct AddReservationResponse: Decodable {
    let code: Int
    let message: String?
    let incorrectParameter: String?
    
    enum CodingKeys: String, CodingKey {
        case code, message
        case incorrectParameter = "Incorrect parameter"
    }
}
