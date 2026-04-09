import Alamofire

final class RequestBuilderImpl: RequestBuilder {
    private let configuration: NetworkServiceConfiguration
    private let requestInterceptor: RequestInterceptor

    init(
        configuration: NetworkServiceConfiguration,
        requestInterceptor: RequestInterceptor
    ) {
        self.configuration = configuration
        self.requestInterceptor = requestInterceptor
    }

    func makeRequest(
        for session: Session,
        endpoint: Endpoint
    ) throws -> DataRequest {
        let urlString = endpoint.baseURL ?? configuration.baseURL + endpoint.path
        return session.request(
            try urlString.asURL(),
            method: endpoint.method,
            parameters: endpoint.parameters,
            encoding: endpoint.encoding,
            headers: endpoint.headers ?? configuration.headers,
            interceptor: requestInterceptor,
            requestModifier: nil
        )
    }
}

