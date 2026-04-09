import Foundation
import Alamofire

final class RequestWrapperImpl: RequestWrapper {
    private let dataRequest: DataRequest
    private let responseHandler: ResponseHandler

    init(
        dataRequest: DataRequest,
        responseHandler: ResponseHandler
    ) {
        self.dataRequest = dataRequest
        self.responseHandler = responseHandler
    }

    func map<Success: Decodable>(_ success: Success.Type) async throws -> Success {
        return try await withCheckedThrowingContinuation { continuation in
            dataRequest
                .validate()
                .responseData { [responseHandler] response in
                    do {
                        let result = try responseHandler.handle(
                            to: Success.self,
                            from: response
                        )
                        continuation.resume(returning: result)
                    } catch {
                        continuation.resume(throwing: error)
                    }
                }
        }
    }

    func map<Success: Decodable, Error: Decodable & Swift.Error>(
        _ success: Success.Type,
        _ error: Error.Type
    ) async throws -> Success {
        return try await withCheckedThrowingContinuation { continuation in
            dataRequest
                .validate()
                .responseData { [responseHandler] response in
                    do {
                        let result = try responseHandler.handle(
                            to: success,
                            error: error,
                            from: response
                        )
                        continuation.resume(returning: result)
                    } catch {
                        continuation.resume(throwing: error)
                    }
                }
        }
    }
}
