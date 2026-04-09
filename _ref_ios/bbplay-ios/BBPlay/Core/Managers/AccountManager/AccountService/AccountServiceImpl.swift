import Foundation

enum AccountError {
    case networkError
    case loginInvalid
    case accountInvalid
    case privateKeyInvalid
    case accountInactive
    case passwordInvalid
    case verificationRequired
}

extension AccountError: LocalizedError {
    public var errorDescription: String? {
        switch self {
            case .networkError: return Localizable.networkError()
            case .loginInvalid: return Localizable.loginInvalid()
            case .privateKeyInvalid: return Localizable.privateKeyInvalid()
            case .accountInvalid: return Localizable.accountInvalid()
            case .passwordInvalid: return Localizable.passwordInvalid()
            case .accountInactive: return Localizable.accountInactive()
            case .verificationRequired: return Localizable.verificationRequired()
        }
    }
}

final class AccountServiceImpl: AccountService {

    private let networkService: AccountAPI
    private let accountHandler: AccountHandler
    
    init(networkService: AccountAPI,
         accountHandler: AccountHandler) {
        self.networkService = networkService
        self.accountHandler = accountHandler
    }

    func login(with login: String, and password: String) async throws -> Account {
        let response = try await networkService.login(with: login, password: password)
        return try await accountHandler.converterLoginResponse(with: response)
    }
    
    func updateAccount(with memberId: Int, privateKey: String) async throws -> Account {
        let response = try await networkService.updateAccount(with: memberId)
        return try await accountHandler.converterUpdateAccount(with: response, privateKey: privateKey)
    }
    
    func changePassword(nickname: String, newPassword: String, memberid: Int) async throws -> PasswordChangeResponse {
        return try await networkService.changePassword(newPassword: newPassword, memberid: memberid)
    }
}
