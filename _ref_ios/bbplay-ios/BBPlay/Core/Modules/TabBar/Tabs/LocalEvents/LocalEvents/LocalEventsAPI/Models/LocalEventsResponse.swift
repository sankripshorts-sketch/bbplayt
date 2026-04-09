import Foundation

struct LocalEventsResponse: Decodable {
    let code: Int
    let message: String
    let data: [LocalEventsDataResponse]?
}

struct LocalEventsDataResponse: Decodable {
    let eventId: String

    enum CodingKeys: String, CodingKey {
        case eventId = "event_id"
    }
}
