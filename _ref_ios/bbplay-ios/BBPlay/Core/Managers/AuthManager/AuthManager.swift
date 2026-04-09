import Foundation

protocol AuthManager: AnyObject {
    var isLoggedIn: Bool { get }
    func login(with nickname: String,
               _ password: String) async throws -> CompleteLogin
    func updateAccount() async throws
    func changePassword(newPassword: String) async throws -> PasswordChangeResponse
    func getAccount() -> Account?
    func getCustomerId() -> String?
    func logout()
    func add(listener: AuthManagerListener)
    func remove(listener: AuthManagerListener)
}

extension AuthManager {
    func login(with nickname: String,
               _ password: String) async throws -> CompleteLogin {
        return try await login(with: nickname, password)
    }
}
