import Alamofire

/* Позволит создавать несколько разных сервисов с разными конфигурациями */

/// Протокол конфигурации сетевого сервиса.
protocol NetworkServiceConfiguration {
    var baseURL: String { get }
    var headers: HTTPHeaders { get }
}
