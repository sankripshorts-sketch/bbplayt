import Foundation
import Alamofire
import Dispatch

/*
 Потомкам, кто будет это продолжать делать...

    27.01.2026 вводятся новые ручки для экрана бронирования:
 1) https://bbplay.bbgms-api.com/available-pcs-for-booking
 2) https://bbplay.bbgms-api.com/struct-rooms-icafe
 3) https://bbplay.bbgms-api.com/all-prices-icafe

 Предполагается написание и использование нового сервиса, который будет более гибкий
 и удобный в использовании, а так же уметь поддерживать расширение своих возможностей.

 Если вы тут из Музыки, он будет немного похож,
 только в разы проще и немного отличаться, главное же идея ;)
 
 После полного переезда требуется удалить текущий сервис.
*/

@available(*, deprecated, message: "Для api v2 использовать новый сервис, NetworkServiceImpl")
class NetworkService {
    enum NetworkEnvironment {
        static let baseProxyUrlProd = "https://bbplay.bbgms-api.com"
        static let baseProxyUrlDev = "https://bbplay-test.bbgms-api.com"
        static let iCafeProxyUrlProd = "https://bbplay.bbgms-api.com/api/v2/cafe/"
        static let iCafeProxyUrlDev = "https://bbplay-test.bbgms-api.com/api/v2/cafe/"

        static var baseProxyUrl: String {
            switch Environment.current {
                case .prod:
                    return baseProxyUrlProd
                case .dev:
                    return baseProxyUrlDev
            }
        }

        static var iCafeProxyUrl: String {
            switch Environment.current {
                case .prod:
                    return iCafeProxyUrlProd
                case .dev:
                    return iCafeProxyUrlDev
            }
        }
    }

    let secretKeyForGetReward = "M0R4SGnGrNnNFkeT2125LFB0cAHbBkXD"

    private let clubsHolder: ClubsHolder
    
    init(clubsHolder: ClubsHolder) {
        self.clubsHolder = clubsHolder
    }
    
    private var clubId: String {
        clubsHolder.getClubId()
    }
    
    let proxyDefaultHeaders = HTTPHeaders([
        HTTPHeader(name: "Key", value: "!A%D*G-KaPdSgVkYp3s6v9y$B?E(H+MbQeThWmZq4t7w!z%C*F)J@NcRfUjXn2r5u8x/A?D(G+KaPdSgVkYp3s6v9y$B&E)H@McQeThWmZq4t7w!z%C*F-JaNdRgUjXn"),
        HTTPHeader(name: "Content-Type", value: "application/json")
    ])

    func request<T: Decodable>(of type: T.Type,
                               for club: String? = nil,
                               endPoint: String,
                               method: HTTPMethod = .get,
                               params: [String: Any]? = nil,
                               encoding: ParameterEncoding = URLEncoding.default,
                               headers: HTTPHeaders? = nil,
                               onBaseUrl: Bool = false) async throws -> T {
        
        await continueWhenGettedValue()
        return try await asyncWaitingRequest(of: type,
                                             for: club,
                                             endPoint: endPoint,
                                             method: method,
                                             params: params,
                                             encoding: encoding,
                                             headers: headers,
                                             onBaseUrl: onBaseUrl)
    }

    private func continueWhenGettedValue() async {
        guard clubId.isEmpty else { return }
        await wait(sec: DEFAULT_WAIT_TIME)
        await continueWhenGettedValue()
    }

    private func asyncWaitingRequest<T: Decodable>(of: T.Type,
                                                   for club: String?,
                                                   endPoint: String,
                                                   method: HTTPMethod = .get,
                                                   params: [String: Any]? = nil,
                                                   encoding: ParameterEncoding,
                                                   headers: HTTPHeaders? = nil,
                                                   onBaseUrl: Bool = false) async throws -> T {
        let clubId = club ?? clubId
        let url: String = onBaseUrl ? NetworkEnvironment.baseProxyUrl.appending(endPoint) : NetworkEnvironment.iCafeProxyUrl.appending(clubId + endPoint)
        
        let headers = headers == nil ? proxyDefaultHeaders : headers

        return try await AF.request(url,
                                    method: method,
                                    parameters: params,
                                    encoding: encoding,
                                    headers: headers)
        .validate(statusCode: [200])
        .serializingDecodable(T.self)
        .value
    }
    
    private func randomCode(length: Int) -> String {
        let radix = 36
        let max = Int(pow(Double(radix), Double(length)))
        let number = Int.random(in: 0..<max)
        return String(number, radix: radix, uppercase: true)
    }
}

// MARK: - Public -
extension NetworkService {
    func getRandomCodeAndKey(memberID: Int, privateKey: String) -> (String, String) {
        let randomString = randomCode(length: 8)
        
        let key = (String(memberID) + randomString + privateKey + secretKeyForGetReward).md5()
        
        return (randomString, key)
    }
}
