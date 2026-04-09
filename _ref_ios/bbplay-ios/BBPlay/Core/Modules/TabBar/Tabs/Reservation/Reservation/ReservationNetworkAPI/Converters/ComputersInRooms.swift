import Foundation

enum ComputerStatus {
    case free
    case busy
    case selected
    case unavailable
}

struct Computer: Equatable {
    let name: String
    let roomName: String
    let status: ComputerStatus
    let position: ComputerPosition
    let textSize: CGFloat
    
    static func == (lhs: Computer, rhs: Computer) -> Bool {
        return lhs.name.hashValue == rhs.name.hashValue
    }
}

struct ComputerPosition {
    let top: CGFloat
    let left: CGFloat
    let width: CGFloat
    let height: CGFloat
}

