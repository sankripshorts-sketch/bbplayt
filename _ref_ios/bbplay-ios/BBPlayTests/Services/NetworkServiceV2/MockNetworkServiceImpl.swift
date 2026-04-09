import Foundation
@testable import BBPlay

final class MockNetworkServiceImpl: NetworkServiceProtocol {

    private let mockRequestWrapper: RequestWrapper

    init(
        mockRequestWrapper: RequestWrapper
    ) {
        self.mockRequestWrapper = mockRequestWrapper
    }

    func request(endpoint: Endpoint) async throws -> RequestWrapper {
        return mockRequestWrapper
    }
}
