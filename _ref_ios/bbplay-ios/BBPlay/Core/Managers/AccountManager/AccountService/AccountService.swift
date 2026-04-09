import Foundation

protocol AccountService: AnyObject {
    func login(with nickname: String, and password: String) async throws -> Account
    func updateAccount(with memberId: Int, privateKey: String) async throws -> Account
    func changePassword(nickname: String,
                        newPassword: String,
                        memberid: Int) async throws -> PasswordChangeResponse
}
