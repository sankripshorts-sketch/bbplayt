import Foundation

protocol ErrorValidation {
    func validate(from data: Data) throws
}
