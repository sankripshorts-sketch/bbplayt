import Foundation
import Alamofire

enum RoomsEndpoint: Endpoint {
    struct RequestParameters {
        /// ID icafe
        let cafeId: String
    }

    case rooms(params: RequestParameters)

    var path: String {
        switch self {
            case .rooms:
                return "/struct-rooms-icafe"
        }
    }

    var parameters: [String: String] {
        switch self {
            case .rooms(let params):
                return ["cafeId": params.cafeId]
        }
    }
    
    var method: HTTPMethod {
        switch self {
            case .rooms:
                return .get
        }
    }
}
