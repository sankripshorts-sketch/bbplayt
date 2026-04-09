import Foundation

struct ClubsInfo: Hashable {
    let isSelected: Bool
    let type: CellType
    let adress: String
    
    enum CellType {
        case adress
        case newClub
    }
}
