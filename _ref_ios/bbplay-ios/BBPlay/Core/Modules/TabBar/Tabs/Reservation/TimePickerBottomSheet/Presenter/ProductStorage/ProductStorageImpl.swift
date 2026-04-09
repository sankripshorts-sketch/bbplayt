import Foundation

final class ProductStorageImpl: ProductStorage {
    private enum Keys {
        static let selectedProductIdKey = "selected_product_id_key"
    }

    private let userDefaults: UserDefaults

    init(
        userDefaults: UserDefaults = .standard
    ) {
        self.userDefaults = userDefaults
    }
    
    func saveSelectedProduct(name: String?) {
        userDefaults.set(name, forKey: Keys.selectedProductIdKey)
    }

    func restoreSelectedProduct(from names: [String]) -> String? {
        let productName = userDefaults.string(forKey: Keys.selectedProductIdKey)
        return names.first(where: { $0 == productName })
    }
}
