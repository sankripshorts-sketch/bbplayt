import Foundation

protocol ProductStorage {
    func saveSelectedProduct(name: String?)
    func restoreSelectedProduct(from names: [String]) -> String?
}
