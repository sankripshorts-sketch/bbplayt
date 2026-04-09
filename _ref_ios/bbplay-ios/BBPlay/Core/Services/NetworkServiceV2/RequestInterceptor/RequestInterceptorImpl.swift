import Alamofire

final class RequestInterceptorImpl: RequestInterceptor {
    private let requestAdapters: [RequestAdapter]
    private let maxRetryCount: Int = 3

    init(
        requestAdapters: [RequestAdapter]
    ) {
        self.requestAdapters = requestAdapters
    }

    func adapt(
        _ urlRequest: URLRequest,
        for session: Session,
        completion: @escaping (Result<URLRequest, Error>) -> Void
    ) {
        var urlRequest = urlRequest

        do {
            try requestAdapters.forEach {
                try $0.adapt(urlRequest: &urlRequest)
            }
            completion(.success(urlRequest))
        } catch {
            completion(.failure(error))
        }
    }

    func retry(
        _ request: Request,
        for session: Session,
        dueTo error: Error,
        completion: @escaping (RetryResult) -> Void
    ) {
        if let responseCode = error.asAFError?.responseCode, responseCode >= 500 {
            completion(.retry)
            return
        }

        guard request.retryCount <= maxRetryCount else {
            completion(.doNotRetryWithError(error))
            return
        }

        request.isCancelled ? completion(.doNotRetry) : completion(.retry)
    }
}
