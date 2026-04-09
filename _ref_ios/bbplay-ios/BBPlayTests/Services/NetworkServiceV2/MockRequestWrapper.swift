import Foundation
@testable import BBPlay

final class MockRequestWrapper: RequestWrapper {

    var json: String?
    var errorJson: String?

    var isSuccessMappedSuccess: Bool = false
    var isSuccessMappedError: Bool = false
    
    var isErrorMappedSuccess: Bool = false
    var isErrorMappedError: Bool = false

    func map<Success: Decodable>(_ success: Success.Type) async throws -> Success {
        guard let data = json?.data(using: .utf8) else {
            isSuccessMappedSuccess = false
            throw NSError(domain: "", code: 0, userInfo: nil)
        }

        if let success = try? JSONDecoder().decode(Success.self, from: data) {
            isSuccessMappedSuccess = true
            return success
        } else {
            isSuccessMappedError = true
            throw NSError(domain: "", code: 0, userInfo: nil)
        }
    }

    func map<Success: Decodable, Error: Decodable & Swift.Error>(
        _ success: Success.Type,
        _ error: Error.Type
    ) async throws -> Success {
        if let errorData = errorJson?.data(using: .utf8) {
            do {
                let error = try JSONDecoder().decode(Error.self, from: errorData)
                isErrorMappedSuccess = true
                throw error
            } catch {
                isErrorMappedError = true
                throw error
            }
        }

        if let data = json?.data(using: .utf8) {
            do {
                let success = try JSONDecoder().decode(Success.self, from: data)
                isSuccessMappedSuccess = true
                return success
            } catch {
                isSuccessMappedError = true
                throw NSError(domain: "", code: -1, userInfo: nil)
            }
        } else {
            isSuccessMappedError = true
            throw NSError(domain: "", code: -1, userInfo: nil)
        }
    }

    func reset() {
        json = nil
        errorJson = nil

        isSuccessMappedSuccess = false
        isSuccessMappedError = false

        isErrorMappedSuccess = false
        isErrorMappedError = false
    }
}
