import Foundation
import Alamofire

enum BannerUpdateAppEndpoint: Endpoint {
    case bannerUpdateApp

    var path: String {
        switch self {
            case .bannerUpdateApp:
                return "/app-version"
        }
    }
    
    var method: HTTPMethod {
        switch self {
            case .bannerUpdateApp:
                return .get
        }
    }
}
