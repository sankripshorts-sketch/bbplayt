import Foundation

struct TimeSlot: Hashable {
    private let id = UUID()

    let time: LocalTime
    let displayTime: String
    
    static func == (lhs: TimeSlot, rhs: TimeSlot) -> Bool {
        lhs.id == rhs.id
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
