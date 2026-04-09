import Foundation
import Alamofire

final class NetworkServiceImpl: NetworkServiceProtocol {
    private let requestBuilder: RequestBuilder
    private let urlSession: Session
    private let responseHandler: ResponseHandler

    init(
        requestBuilder: RequestBuilder,
        responseHandler: ResponseHandler,
        urlSession: Session = .default
    ) {
        self.requestBuilder = requestBuilder
        self.responseHandler = responseHandler
        self.urlSession = urlSession
        
        // Надо настроить
        //urlSession.serverTrustManager = .init(allHostsMustBeEvaluated: true, evaluators: [:])
    }
    
    func request(endpoint: Endpoint) async throws -> RequestWrapper {
        return RequestWrapperImpl(
            dataRequest: try requestBuilder.makeRequest(for: urlSession, endpoint: endpoint),
            responseHandler: responseHandler
        )
    }
}
