import Foundation

extension Date {
    func toString() -> String {
        return DefaultLogger.dateFormatter.string(from: self as Date)
    }
}
