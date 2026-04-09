import Foundation

protocol UserEmailPresenter {

    func viewDidLoad()
    func validateEmail(_ email: String?)
    func didTapNext(email: String?)

}
