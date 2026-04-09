import Alamofire

/// Протокол для сущности сетевого сервиса
protocol Endpoint {
    var baseURL: String? { get }
    var path: String { get }
    var method: HTTPMethod { get }
    var headers: HTTPHeaders? { get }
    var parameters: [String: String] { get }
    var encoding: ParameterEncoding { get }
    var timeout: TimeInterval { get }
}

extension Endpoint {
    /// Если пустое - возьмем из сетевого сервиса.
    var baseURL: String? { nil }
    
    /// Базовое значение
    var headers: HTTPHeaders? { nil }
    
    /// Базовое значение
    var parameters: [String: String] { [:] }

    /// Базовое значение
    var encoding: ParameterEncoding { URLEncoding.default }

    /// Базовое значение
    var timeout: TimeInterval { 60 }
}
