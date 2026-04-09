import Alamofire

/// Создает дата реквест с конфигурацией сетевого сервиса и эндпоинта для текущей сессии
protocol RequestBuilder {
    func makeRequest(for session: Session, endpoint: Endpoint) throws -> DataRequest
}
