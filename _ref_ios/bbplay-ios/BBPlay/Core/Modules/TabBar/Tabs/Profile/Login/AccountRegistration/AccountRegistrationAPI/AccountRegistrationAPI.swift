import Foundation
import Alamofire

protocol AccountRegistrationAPI {
    func createAccount(data: RegistrationAccountData) async throws -> CreateAccountResponse
}

extension NetworkService: AccountRegistrationAPI {
    func createAccount(data: RegistrationAccountData) async throws -> CreateAccountResponse {
        let endPoint = "/members"
        return try await request(of: CreateAccountResponse.self,
                                 endPoint: endPoint,
                                 method: .post,
                                 params: data.parameters,
                                 encoding: JSONEncoding.default)
    }
}
