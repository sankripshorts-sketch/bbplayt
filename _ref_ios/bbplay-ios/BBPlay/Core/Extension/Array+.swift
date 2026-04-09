import Foundation

// MARK: - Subscript -
extension Array {
    subscript (safe index: Int) -> Element? {
        get {
            guard 0 <= index && index < count else {
                return nil
            }
            
            return self[index]
        }
        set {
            guard let element = newValue,
                  0 <= index && index < count && !isEmpty else {
                return
            }
            
            self[index] = element
        }
    }
}
