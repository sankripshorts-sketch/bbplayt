import Alamofire

protocol ResponseHandler {
    func handle<Success: Decodable>(
        to type: Success.Type,
        from response: AFDataResponse<Data>
    ) throws -> Success
    func handle<Success: Decodable, Error: Decodable & Swift.Error>(
        to type: Success.Type,
        error: Error.Type,
        from response: AFDataResponse<Data>
    ) throws -> Success
}
