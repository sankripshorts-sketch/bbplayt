import Foundation

protocol TimeBuilder {
    func generateTimeSlots(stepBooking: Int) -> [TimeSlot]
}
