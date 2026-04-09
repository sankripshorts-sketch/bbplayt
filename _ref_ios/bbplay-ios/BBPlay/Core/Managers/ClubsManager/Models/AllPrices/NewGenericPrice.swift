import Foundation

struct NewGenericPrice {
    let id: Int
    let position: Int
    let name: String
    private let minimalDuration: Int
    let duration: Int
    let price: String
    let groupName: String
    let showWeekDays: Set<DayOfWeek>
    let productShowTimeStart: LocalTime
    let productShowTimeEnd: LocalTime
    
    var isTimeFixed: Bool {
        return duration == minimalDuration
    }
    
    enum BookingDecision {
        case allowed(durationMinutes: Int)
        case denied
    }
    
    func toSinglePriceValue(bookingTime: LocalTime, timeTechBreak: TimeTechBreak) -> SinglePriceValue? {
        switch decideBookingAvailability(bookingTime: bookingTime, timeTechBreak: timeTechBreak) {
            case .allowed(let durationMinutes):
                return SinglePriceValue(
                    id: id,
                    position: position,
                    groupName: groupName,
                    cost: price,
                    bookingDurationMins: durationMinutes,
                    bookingTime: bookingTime,
                    name: name
                )
            case .denied:
                return nil
        }
    }
    
    private func decideBookingAvailability(bookingTime: LocalTime, timeTechBreak: TimeTechBreak) -> BookingDecision {
        if duration <= 0 || minimalDuration <= 0 || minimalDuration > duration {
            return .denied
        }

        if timeIsNotProductShowTime(bookingTime) {
            return .denied
        }

        guard let actualDuration = getActualDurationOrNull(
            bookingStartTime: bookingTime,
            timeTechBreak: timeTechBreak
        ) else {
            return .denied
        }
        
        return .allowed(durationMinutes: actualDuration)
    }
    
    // MARK: - Time math helpers
    
    private func timeIsNotProductShowTime(_ bookingTime: LocalTime) -> Bool {
        if productShowTimeStart < productShowTimeEnd {
            return bookingTime < productShowTimeStart || bookingTime >= productShowTimeEnd
        } else {
            return bookingTime < productShowTimeStart && bookingTime >= productShowTimeEnd
        }
    }
    
    private func getActualDurationOrNull(
        bookingStartTime: LocalTime,
        timeTechBreak: TimeTechBreak
    ) -> Int? {
        if isBreakable(bookingStartTime: bookingStartTime, timeTechBreak: timeTechBreak) {
            return nil
        } else {
            return isTimeFixed ? duration : durationForUnfixedProduct(bookingStartTime: bookingStartTime)
        }
    }
    
    private func durationForUnfixedProduct(bookingStartTime: LocalTime) -> Int? {
        if bookingStartTime.isAfter(productShowTimeEnd) {
            return nil
        }
        
        let endProductTime = productShowTimeStart.plusTimeOffset(minutes: duration)
        return Int(bookingStartTime.minutesForwardTo(endProductTime))
    }
    
    private func isBreakable(bookingStartTime: LocalTime, timeTechBreak: TimeTechBreak) -> Bool {
        guard let startBreakTime = timeTechBreak.timeStart else {
            return false
        }

        let endBreakTime = startBreakTime.plusTimeOffset(minutes: timeTechBreak.mins)
        let bookingEndTime = bookingStartTime.plusTimeOffset(minutes: minimalDuration)
        return isOverlapping((bookingStartTime, bookingEndTime), with: (startBreakTime, endBreakTime))
    }
    
    // MARK: - Companion object methods
    
    static func from(price: NewPrice, position: Int) -> NewGenericPrice {
        return NewGenericPrice(
            id: NewGenericPrice.priceId,
            position: position,
            name: LocalTime.formatDuration(duration: price.duration),
            minimalDuration: price.duration,
            duration: price.duration,
            price: price.totalPrice,
            groupName: price.groupName,
            showWeekDays: DayOfWeek.allCases,
            productShowTimeStart: LocalTime.startOfDay,
            productShowTimeEnd: LocalTime.endOfDay
        )
    }

    static func from(product: NewProduct, position: Int) -> NewGenericPrice {
        return NewGenericPrice(
            id: product.productId,
            position: position,
            name: product.productName,
            minimalDuration: product.minimalDuration,
            duration: product.duration,
            price: product.totalPrice,
            groupName: product.groupName,
            showWeekDays: product.productShowWeekday,
            productShowTimeStart: product.productShowTimeStart,
            productShowTimeEnd: product.productShowTimeEnd
        )
    }
    
    // MARK: - Static constants
    private static let priceId: Int = -1
    
    private func isOverlapping(_ interval1: (LocalTime, LocalTime), with interval2: (LocalTime, LocalTime)) -> Bool {
        let (start1, end1) = interval1
        let (start2, end2) = interval2
        return start1 < end2 && start2 < end1
    }
}
