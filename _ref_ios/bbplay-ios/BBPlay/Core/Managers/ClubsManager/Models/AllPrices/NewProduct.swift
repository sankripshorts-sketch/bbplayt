import Foundation

struct NewProduct {
    let productId: Int
    let productName: String
    let productPrice: String
    let totalPrice: String
    let productShowWeekday: Set<DayOfWeek>
    let productEnableClient: Bool
    let duration: Int
    let minimalDuration: Int
    let isCalcDuration: Bool
    let productShowTimeStart: LocalTime
    let productShowTimeEnd: LocalTime
    let groupName: String
}
