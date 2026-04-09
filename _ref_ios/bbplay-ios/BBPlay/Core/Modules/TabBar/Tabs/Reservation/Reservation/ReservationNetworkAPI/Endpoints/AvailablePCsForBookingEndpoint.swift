import Foundation
import Alamofire

enum AvailablePCsForBookingEndpoint: Endpoint {
    struct RequestParameters {
        /// ID icafe
        let cafeId: String
        /// Дата, на которую проверяется доступность ПК
        let dateStart: String
        /// Время, на которое проверяется доступность ПК
        let timeStart: String
        /// Длительность бронирования
        let mins: String
        /// Не обязательное поле, включить выключить поиск окна, если не задан, то окно не ищется
        let isFindWindow: Bool?
        /// (он же `product_name`). Не обязательное поле, если выбран пакет, отправляется его общее название для всех зон(в которых он может быть), и происходит доп проверка на то, что пакет может быть забронирован в найденное окно. Если пакет не найден, то свободного окна не будет.
        let priceName: String?
    }

    case availablePCsForBooking(params: RequestParameters)

    var path: String {
        switch self {
            case .availablePCsForBooking:
                return "/available-pcs-for-booking"
        }
    }

    var parameters: [String: String] {
        switch self {
            case .availablePCsForBooking(let params):
                return [
                    "cafeId": params.cafeId,
                    "dateStart": params.dateStart,
                    "timeStart": params.timeStart,
                    "mins": params.mins,
                    "isFindWindow": params.isFindWindow.map(String.init),
                    "priceName": params.priceName
                ].compactMapValues { $0 }
        }
    }
    
    var method: HTTPMethod {
        switch self {
            case .availablePCsForBooking:
                return .get
        }
    }
}
