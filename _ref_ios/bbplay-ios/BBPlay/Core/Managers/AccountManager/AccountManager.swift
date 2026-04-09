import Foundation

protocol AccountManager: AnyObject {
    func getAccount() -> Account?
    func getCustomerId() -> String?
    func login(with nickname: String, and password: String) async throws -> CompleteLogin
    func updateAccount() async throws
    func changePassword(newPassword: String) async throws -> PasswordChangeResponse
    func removeAccount()
}
