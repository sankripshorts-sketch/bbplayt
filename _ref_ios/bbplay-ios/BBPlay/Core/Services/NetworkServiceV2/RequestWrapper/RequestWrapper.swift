import Foundation

protocol RequestWrapper {
    func map<Success: Decodable>(_ success: Success.Type) async throws -> Success
    func map<Success: Decodable, Error: Decodable & Swift.Error>(
        _ success: Success.Type,
        _ error: Error.Type
    ) async throws -> Success
}
