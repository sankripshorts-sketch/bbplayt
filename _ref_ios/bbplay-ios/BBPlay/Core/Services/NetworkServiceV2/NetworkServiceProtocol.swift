import Foundation
import Alamofire

@available(*, deprecated, message: "переименовать в NetworkService после удаления старого класса")
protocol NetworkServiceProtocol {
    func request(endpoint: Endpoint) async throws -> RequestWrapper
}
