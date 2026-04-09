import Foundation
import UIKit

final class MyReservePresenterImpl {
    
    private weak var view: MyReserveView?
    private let club: Club
    private let myBookings: [MyBooking]
    
    init(club: Club,
         myBookings: [MyBooking]) {
        self.club = club
        self.myBookings = myBookings
    }
    
    func setView(_ view: MyReserveView) {
        self.view = view
    }
}

// MARK: - Private -
private extension MyReservePresenterImpl {
    func updateView() {
        let models = myBookings.compactMap { item -> CardModel? in
            guard let title = makeTitle(with: item),
                  let place = makePlace(with: item),
                  let duration = makeHoursDurationAsString(with: item),
                  let titleColor = makeTitleColor(with: item) else {
                return nil
            }
            
            return CardModel(titleColor: titleColor,
                             title: title,
                             place: place,
                             duration: duration,
                             address: club.adress.adress)
        }
        
        view?.updateMyReserveCard(with: models)
    }
    
    func makeTitle(with booking: MyBooking) -> String? {
        guard let date = makeDateForTitle(with: booking.startTime),
              let time = makeTimeForTitle(with: booking.startTime) else { return nil }
        let title = [date, time].joined(separator: " ")
        return title
    }
    
    func makeDateForTitle(with startTime: String) -> String? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        guard let date = formatter.date(from: startTime) else { return nil }
        
        formatter.setLocalizedDateFormatFromTemplate("E, d MMMM")
        return formatter.string(from: date)
    }
    
    func makeTimeForTitle(with startTime: String) -> String? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        guard let date = formatter.date(from: startTime) else { return nil }
        
        formatter.setLocalizedDateFormatFromTemplate("HH:mm")
        return formatter.string(from: date)
    }
    
    func makePlace(with booking: MyBooking) -> String? {
        let pcNumber = booking.pcName.leaveOnlyNumbers()
        return Localizable.myReservePlace(pcNumber)
    }
    
    func makeHoursDurationAsString(with booking: MyBooking) -> String? {
        return LocalTime.formatDuration(duration: booking.duration)
    }

    func makeTitleColor(with booking: MyBooking) -> UIColor? {
        guard
            let roomType = club.rooms.rooms.first(
                where: { $0.computers.contains { $0.name == booking.pcName }}
            )?.roomType
        else {
            return nil
        }
        return roomType == .gameZone ? Color.gameZoneGreen() : Color.bootCampPink()
    }
}

// MARK: - MyReservePresenter -
extension MyReservePresenterImpl: MyReservePresenter {
    func onViewDidLoad() {
        updateView()
    }
}

// MARK: - CardModel -
extension MyReservePresenterImpl {
    struct CardModel: Hashable {
        let titleColor: UIColor
        let title: String
        let place: String
        let duration: String
        let address: String
    }
}
