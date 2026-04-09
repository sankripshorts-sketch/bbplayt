import Foundation

/*

    заменил для удобства некоторые типы из контракта на другие.
    пометил следующим образом:
 
    let areaFrameX: CGFloat // Int
    где // Int - тип поля по контракту.

*/

struct RoomsResponse: Decodable {
    let code: Int
    let message: String
    let data: RoomData
}

// MARK: - RoomData -
extension RoomsResponse {
    struct RoomData: Decodable {
        let rooms: [Room]
    }
}

// MARK: - RoomData.Room -
extension RoomsResponse.RoomData {
    struct Room: Decodable {
        let areaName: String
        let areaIndex: Int
        let areaFrameX: CGFloat // Int
        let areaFrameY: CGFloat // Int
        let areaFrameWidth: CGFloat // Int
        let areaFrameHeight: CGFloat // Int
        let areaAllowBooking: Int
        let pcsList: [PC]
        let colorBorder: String?
        let colorText: String?

        private enum CodingKeys: String, CodingKey {
            case areaName = "area_name"
            case areaIndex = "area_index"
            case areaFrameX = "area_frame_x"
            case areaFrameY = "area_frame_y"
            case areaFrameWidth = "area_frame_width"
            case areaFrameHeight = "area_frame_height"
            case areaAllowBooking = "area_allow_booking"
            case pcsList = "pcs_list"
            case colorBorder = "color_border"
            case colorText = "color_text"
        }
    }
}

// MARK: - RoomData.Room.PCRoom -
extension RoomsResponse.RoomData.Room {
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
        }
    }
}
