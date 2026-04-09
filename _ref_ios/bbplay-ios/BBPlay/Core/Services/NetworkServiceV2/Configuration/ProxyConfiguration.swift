import Alamofire

/// Конфигурация для сетевого сервиса
struct ProxyConfiguration: NetworkServiceConfiguration {
    var baseURL: String {
        switch Environment.current {
            case .prod:
                return "https://bbplay.bbgms-api.com"
            case .dev:
                return "https://bbplay-test.bbgms-api.com"
        }
    }

    var headers: HTTPHeaders {
        return HTTPHeaders(
            [
                HTTPHeader(
                    name: "Key",
                    value: "!A%D*G-KaPdSgVkYp3s6v9y$B?E(H+MbQeThWmZq4t7w!z%C*F)J@NcRfUjXn2r5u8x/A?D(G+KaPdSgVkYp3s6v9y$B&E)H@McQeThWmZq4t7w!z%C*F-JaNdRgUjXn"
                ),
                HTTPHeader(
                    name: "Content-Type",
                    value: "application/json"
                )
            ]
        )
        
    }
}
