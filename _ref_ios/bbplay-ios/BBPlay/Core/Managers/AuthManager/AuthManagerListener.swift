import Foundation

@objc protocol AuthManagerListener: AnyObject {
    func login()
    func logout()
}
