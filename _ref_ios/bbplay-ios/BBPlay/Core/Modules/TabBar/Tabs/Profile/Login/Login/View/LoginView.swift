import Foundation

protocol LoginView: AnyObject {
    func resignResponders()
    func updateButton(_ isEnabled: Bool)
    func contentUp()
    func contentDown()
}
