import Foundation
import Alamofire

protocol AccountAPI {
    func login(with login: String,
               password: String) async throws -> AccountResponse
    func updateAccount(with memberId: Int) async throws -> UpdateAccountResponse
    func changePassword(newPassword: String, memberid: Int) async throws -> PasswordChangeResponse
}

extension NetworkService: AccountAPI {
    func login(with login: String,
               password: String) async throws -> AccountResponse {
        let endPoint = "/login"

        let params = ["member_name": login,
                      "password": password]
        
        return try await request(of: AccountResponse.self,
                                 endPoint: endPoint,
                                 method: .post,
                                 params: params,
                                 encoding: JSONEncoding.default,
                                 onBaseUrl: true)
    }
    
    func updateAccount(with memberId: Int) async throws -> UpdateAccountResponse {
        let endPoint = "/members/\(memberId)"
        return try await request(of: UpdateAccountResponse.self, endPoint: endPoint)
    }
    
    func changePassword(newPassword: String, memberid: Int) async throws -> PasswordChangeResponse {
        let endPoint = "/members/\(memberid)"
        
        let params = ["member_password": newPassword,
                      "member_confirm": newPassword,
                      "member_is_active" : "1"]

        return try await request(of: PasswordChangeResponse.self,
                                 endPoint: endPoint,
                                 method: .put,
                                 params: params,
                                 encoding: JSONEncoding.default)
    }
}
