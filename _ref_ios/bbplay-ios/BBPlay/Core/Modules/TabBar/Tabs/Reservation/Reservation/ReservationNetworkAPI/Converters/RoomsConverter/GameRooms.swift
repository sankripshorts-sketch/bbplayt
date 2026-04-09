import Foundation
import UIKit

struct GameRooms {
    let roomSize: CGSize
    let rooms: [GameRoom]
}

// MARK: - GameRoom -
extension GameRooms {
    struct GameRoom {
        let name: String
        let roomFrame: RoomFrame
        let computers: [Computer]
        let textColor: UIColor?
        let borderColor: UIColor?
    }
}

// MARK: - GameRoom.RoomFrame -
extension GameRooms.GameRoom {
    struct RoomFrame {
        let x: CGFloat
        let y: CGFloat
        let height: CGFloat
        let width: CGFloat
    }
}

extension GameRooms.GameRoom {
    enum RoomType {
        case bootCamp
        case gameZone
        case undefined
    }

    var roomType: RoomType {
        if name.contains("BootCamp") {
            return .bootCamp
        }
        else if name.contains("GameZone") {
            return .gameZone
        }
        else {
            assertionFailure("room type not exist, with \(name)")
            return .undefined
        }
    }
}

