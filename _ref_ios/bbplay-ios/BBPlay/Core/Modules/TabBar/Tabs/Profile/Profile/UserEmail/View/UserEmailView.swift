import Foundation

protocol UserEmailView: AnyObject {

    func hideKeyboard(completion: @escaping EmptyClosure)
    func updateButton(isEnabled: Bool)
    func close()

}
