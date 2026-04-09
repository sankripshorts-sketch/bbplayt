import Foundation

typealias CompleteLogin = AuthManagerImpl.LoginInfo

final class AuthManagerImpl: AuthManager {
    private let accountManager: AccountManager
    private let listeners = NSHashTable<AuthManagerListener>(options: .weakMemory)

    init(accountManager: AccountManager) {
        self.accountManager = accountManager
    }

    var isLoggedIn: Bool {
        guard let account = accountManager.getAccount() else { return false }
        return account.needPhoneVerify == false
    }

    func login(with nickname: String,
               _ password: String
    ) async throws -> CompleteLogin {
        let accountInfo = try await accountManager.login(with: nickname, and: password)
        let endLogin = {
            await accountInfo.endLogin()
            await MainActor.run { [weak self] in
                self?.listeners.allObjects.forEach {
                    $0.login()
                }
            }
        }

        return CompleteLogin(account: accountInfo.account, endLogin: endLogin)
    }

    func updateAccount() async throws {
        try await accountManager.updateAccount()
    }

    func changePassword(newPassword: String) async throws -> PasswordChangeResponse {
        try await accountManager.changePassword(newPassword: newPassword)
    }

    func getAccount() -> Account? {
        accountManager.getAccount()
    }

    func getCustomerId() -> String? {
        accountManager.getCustomerId()
    }

    func logout() {
        accountManager.removeAccount()

        listeners.allObjects.forEach {
            $0.logout()
        }
    }

    func add(listener: AuthManagerListener) {
        listeners.add(listener)
    }
    
    func remove(listener: AuthManagerListener) {
        listeners.remove(listener)
    }
}

// MARK: - FinishLogin
extension AuthManagerImpl {
    struct LoginInfo {
        let account: Account
        let endLogin: () async -> Void?
    }
}
