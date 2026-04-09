import Foundation
import Alamofire

final class ResponseHandlerImpl: ResponseHandler {
    private let decoder: JSONDecoder
    private let errorValidation: ErrorValidation

    init(
        decoder: JSONDecoder = JSONDecoder(),
        errorValidation: ErrorValidation = DefaultErrorValidation()
    ) {
        self.decoder = decoder
        self.errorValidation = errorValidation
    }

    func handle<Success: Decodable>(
        to type: Success.Type,
        from response: AFDataResponse<Data>
    ) throws -> Success {
        if let error = response.error {
            throw HandleError.requestFailed(error)
        }

        guard let data = response.data else {
            throw HandleError.noData
        }

        if let statusCode = response.response?.statusCode,
           !(200...299).contains(statusCode) {
            throw HandleError.serverError(statusCode, data)
        }

        do {
            return try decoder.decode(type, from: data)
        } catch {
            throw HandleError.decodingFailed(error)
        }
    }

    func handle<Success: Decodable, Error: Decodable & Swift.Error>(
        to type: Success.Type,
        error: Error.Type,
        from response: AFDataResponse<Data>
    ) throws -> Success {
        if let error = response.error {
            throw HandleError.requestFailed(error)
        }
        
        guard let data = response.data else {
            throw HandleError.noData
        }
        
        if let statusCode = response.response?.statusCode,
           !(200...299).contains(statusCode) {
            throw HandleError.serverError(statusCode, data)
        }
        
        try errorValidation.validate(from: data)
        
        do {
            return try decoder.decode(type, from: data)
        } catch let decodingError {
            throw HandleError.decodingFailed(decodingError)
        }
    }
}

// MARK: - HandleError -
extension ResponseHandlerImpl {
    private enum HandleError: Error {
        case requestFailed(Error)
        case serverError(Int, Data)
        case noData
        case decodingFailed(Error)
    }
}
