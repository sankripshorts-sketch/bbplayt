import Foundation

protocol ReservationUseCase {
    func addReservation(data: ReservationUseCaseData) async throws
}
