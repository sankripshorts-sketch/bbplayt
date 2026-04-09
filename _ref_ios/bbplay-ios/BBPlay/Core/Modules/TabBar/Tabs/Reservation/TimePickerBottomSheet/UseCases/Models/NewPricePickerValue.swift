import Foundation

struct NewPricePickerValue {
    let position: Int
    let name: String
    let bookingDurationMins: Int
    let bookingTime: LocalTime
    let pricesByGroupName: [String: SinglePriceValue]
    
    var bookingDuration: LocalTime {
        let seconds = bookingDurationMins * 60
        return LocalTime(seconds: seconds)
    }
}
