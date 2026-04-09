import Foundation

protocol MyBookingsUseCase {
    var myBookings: [MyBooking]? { get }
    func loadMyBookings() async throws -> [MyBooking]?
}
