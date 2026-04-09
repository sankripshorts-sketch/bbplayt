import Foundation

struct AvailablePCsForBookingResponse: Decodable {
    let code: Int
    let message: String
    let data: Data
}

// MARK: - Data -
extension AvailablePCsForBookingResponse {
    struct Data: Decodable {
        let timeFrame: String
        let pcList: [PC]
        
        private enum CodingKeys: String, CodingKey {
            case timeFrame = "time_frame"
            case pcList = "pc_list"
        }
    }
}

// MARK: - AvailablePCsForBookingResponse.Data -
extension AvailablePCsForBookingResponse.Data {
    struct PC: Decodable {
        let pcName: String
        let pcAreaName: String
        let pcBoxLeft: CGFloat // Int
        let pcBoxTop: CGFloat // Int
        let pcBoxPosition: String
        let pcComment: String
        let pcConsoleType: Int
        let pcEnabled: Int
        let pcGroupName: String
        let pcIcafeId: Int
        // Следующие поля уникальные для этого ответа, верхние такие же, как в RoomsResponse
        let priceName: String
        let isUsing: Bool
        let startDate: String?
        let startTime: String?
        let endDate: String?
        let endTime: String?
        
        private enum CodingKeys: String, CodingKey {
            case pcName = "pc_name"
            case pcAreaName = "pc_area_name"
            case pcBoxLeft = "pc_box_left"
            case pcBoxTop = "pc_box_top"
            case pcBoxPosition = "pc_box_position"
            case pcComment = "pc_comment"
            case pcConsoleType = "pc_console_type"
            case pcEnabled = "pc_enabled"
            case pcGroupName = "pc_group_name"
            case pcIcafeId = "pc_icafe_id"
            case priceName = "price_name"
            case isUsing = "is_using"
            case startDate = "start_date"
            case startTime = "start_time"
            case endDate = "end_date"
            case endTime = "end_time"
        }
    }
}
