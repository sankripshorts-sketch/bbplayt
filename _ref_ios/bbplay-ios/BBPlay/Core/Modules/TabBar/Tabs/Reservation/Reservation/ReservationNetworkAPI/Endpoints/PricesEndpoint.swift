import Foundation
import Alamofire

enum PricesEndpoint: Endpoint {
    struct RequestParameters {
        /// ID icafe
        let cafeId: String
        /// ID клиента в icafe, передавать для персонализированной скидки
        let memberId: String?
        /// Дата, на которую хотят забронировать
        let bookingDate: String?
        /// Длительность для расчёта скидки (необязательный)
        let mins: Int?
    }

    case prices(params: RequestParameters)

    var path: String {
        switch self {
        case .prices:
            return "/all-prices-icafe"
        }
    }

    var parameters: [String: String] {
        switch self {
            case .prices(let params):
                return [
                    "cafeId": params.cafeId,
                    "memberId": params.memberId,
                    "bookingDate": params.bookingDate,
                    "mins": params.mins.flatMap(String.init)
                ].compactMapValues { $0 }
        }
    }

    var method: HTTPMethod {
        switch self {
        case .prices:
            return .get
        }
    }
}
