import Foundation

final class SMSServiceDataStorage {
    private let storage = UserDefaults.standard
    
    private let accountManager: AccountManager
    
    private var userId: Int? {
        accountManager.getAccount()?.memberId
    }

    init(accountManager: AccountManager) {
        self.accountManager = accountManager
    }

    func saveEncodedData(_ value: String, memberId: Int) {
        storage.set(value,forKey: Keys.encodedDataKey.forMemberId(userId ?? memberId)
        )
    }

    func loadEncodedData(_ memberId: Int) -> String? {
        storage.string(forKey: Keys.encodedDataKey.forMemberId(userId ?? memberId))
    }
    
    func saveNextRequestSMSTime(_ value: Int, memberId: Int) {
        storage.set(value, forKey: Keys.nextRequestSMSTime.forMemberId(userId ?? memberId))
    }
    
    func loadNextRequestSMSTime(_ memberId: Int) -> Int {
        storage.integer(forKey: Keys.nextRequestSMSTime.forMemberId(userId ?? memberId))
    }
}

// MARK: - Private extension -
private extension SMSServiceDataStorage {
    enum Keys {
        static let encodedDataKey = "encodedDataKey"
        static let nextRequestSMSTime = "nextRequestSMSTime"
    }
}

// MARK: - String+ -
private extension String {
    static let unknown = "unknown"
    
    func forMemberId(_ memberId: Int?) -> String {
        let id: String = memberId == nil ? .unknown : String(memberId!)
        return [self, id].joined(separator: "_")
    }
}
