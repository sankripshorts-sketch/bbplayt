import Foundation

struct SinglePriceValue: Identifiable {
    let id: Int
    let position: Int
    let groupName: String
    let cost: String
    let bookingDurationMins: Int
    let bookingTime: LocalTime
    let name: String
}
