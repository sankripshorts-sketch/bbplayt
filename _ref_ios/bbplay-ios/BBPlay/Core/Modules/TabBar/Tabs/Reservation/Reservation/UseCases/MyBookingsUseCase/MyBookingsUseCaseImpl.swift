import Foundation

final class MyBookingsUseCaseImpl: MyBookingsUseCase {
    
    private let accountManager: AccountManager
    private let networkService: ReservationAPI
    private(set) var myBookings: [MyBooking]?

    init(
        accountManager: AccountManager,
        networkService: ReservationAPI
    ) {
        self.accountManager = accountManager
        self.networkService = networkService
    }

    func loadMyBookings() async throws -> [MyBooking]? {
        guard
            let account = accountManager.getAccount()
        else {
            throw ReservationError.needAuth
        }
        
        let response = try await networkService.getAllReservation()
        myBookings = try convertBookings(
            response: response,
            memberNickname: account.memberNickname
        )
        return myBookings
    }
    
//    func updateMyBookings() {
//        guard let account = accountManager.getAccount() else { return }
//        Task {
//            do {
//                let bookings = try await reservationModel.getBookings(with: account.memberNickname)
//                
//                await MainActor.run {
//                    self.myBookings = bookings
//                    view?.setVisibleMyReserveButton(isVisible: true)
//                }
//            }
//            
//            catch let error {
//                logger.error(error)
//                
//                await MainActor.run {
//                    view?.setVisibleMyReserveButton(isVisible: false)
//                }
//            }
//        }
//    }
    
    private func convertBookings(response: BookingsResponse, memberNickname: String) throws -> [MyBooking] {
        guard response.code == 200 else { throw ReservationError.statusCode }
        guard let data = response.data else { throw ReservationError.emptyData }

        let bookings = data.compactMap { item -> MyBooking? in
            guard item.memberAccount == memberNickname else { return nil }
            return MyBooking(
                pcName: item.productPcName,
                startTime: item.productAvailableDateLocalFrom,
                duration: item.productMins
            )
        }

        return bookings
    }
}
