import Foundation

final class AccountManagerImpl {

    private let userAccountKey = "userAccountKey"
    private let customerIdKey = "customerIdKey"
    private let storage = UserDefaults.standard
    private let accountService: AccountService
    private let analyticsManager: AnalyticsManager

    private var account: Account? {
        get {
            load()
        }
        set {
            save(newValue)
            generateCustomerIdIfNeeded(with: newValue)
            analyticsManager.updateAnalyticalInfo(with: newValue)
        }
    }
    
    private var customerId: String? {
        get {
            loadCustomerId()
        }
        set {
            saveCustomerId(newValue)
        }
    }
    
    init(accountService: AccountService,
         analyticsManager: AnalyticsManager) {
        self.accountService = accountService
        self.analyticsManager = analyticsManager
    }
    
    private func generateCustomerIdIfNeeded(with newAccount: Account?) {
        guard let account = newAccount else {
            customerId = nil
            return
        }
        
        guard customerId == nil else { return }
        
        customerId = "\(UUID())" + "-\(account.memberId)"
    }
}

extension AccountManagerImpl: AccountManager {
    func getAccount() -> Account? {
        return account
    }
    
    func getCustomerId() -> String? {
        return customerId
    }
    
    func login(with nickname: String, and password: String) async throws -> CompleteLogin {
        let account = try await accountService.login(with: nickname, and: password)
        let saveLogin = { [weak self] in
            self?.account = account
        }

        return .init(account: account, endLogin: saveLogin)
    }
    
    func updateAccount() async throws {
        guard let account else {
            throw AccountError.accountInvalid
        }

        guard let privateKey = account.memberPrivateKey else {
            throw AccountError.privateKeyInvalid
        }
        
        return self.account = try await accountService.updateAccount(
            with: account.memberId,
            privateKey: privateKey)
    }
    
    func changePassword(newPassword: String) async throws -> PasswordChangeResponse {
        guard let account else {
            throw AccountError.accountInvalid
        }
        
        return try await accountService.changePassword(
            nickname: account.memberNickname,
            newPassword: newPassword,
            memberid: account.memberId)
    }
    
    func removeAccount() {
        account = nil
    }
}

// MARK: - Storage -
extension AccountManagerImpl {
    private func save(_ value: Account?) {
        guard let value = value else {
            storage.removeObject(forKey: userAccountKey)
            logger.info("Account has been removed")
            return
        }

        guard let data = try? JSONEncoder().encode(value) else {
            logger.error("Error encode account")
            assertionFailure()
            return
        }
        
        logger.info("Account has been save")
        storage.set(data, forKey: userAccountKey)
    }
    
    private func load() -> Account? {
        guard let data = storage.object(forKey: userAccountKey) as? Data else {
            logger.info("Account is nil")
            return nil
        }
        
        guard let account = try? JSONDecoder().decode(Account.self, from: data) else {
            logger.error("Account decode error")
            return nil
        }

        return account
    }
}

extension AccountManagerImpl {
    private func saveCustomerId(_ value: String?) {
        guard let value = value else {
            storage.removeObject(forKey: customerIdKey)
            logger.info("CustomerId has been removed")
            return
        }
        
        guard let data = try? JSONEncoder().encode(value) else {
            logger.error("Error encode customerId")
            assertionFailure()
            return
        }
        
        logger.info("CustomerId has been save")
        storage.set(data, forKey: customerIdKey)
    }
    
    private func loadCustomerId() -> String? {
        guard let data = storage.object(forKey: customerIdKey) as? Data else {
            logger.info("CustomerId is nil")
            return nil
        }
        
        guard let customerId = try? JSONDecoder().decode(String.self, from: data) else {
            logger.error("CustomerId decode error")
            assertionFailure()
            return nil
        }
        
        logger.info("CustomerId has been loaded")
        return customerId
    }
}
