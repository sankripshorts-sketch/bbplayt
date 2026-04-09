import Foundation

final class ProxyRequestAdapterImpl: RequestAdapter {
    private let configuration: NetworkServiceConfiguration

    init(
        configuration: NetworkServiceConfiguration
    ) {
        self.configuration = configuration
    }

    /// Можно использовать для обогащения иными параметрами
    func adapt(urlRequest: inout URLRequest) throws {
        try urlRequest.validate()
    }
}
