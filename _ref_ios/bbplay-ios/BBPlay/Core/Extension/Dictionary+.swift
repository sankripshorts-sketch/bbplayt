import Foundation

extension Dictionary {
    mutating func mergeInPlace(_ dictionary: Dictionary?) {
        guard let dictionary = dictionary else { return }
        for (key, value) in dictionary {
            updateValue(value, forKey: key)
        }
    }

    func merge(_ dictionary: Dictionary?) -> Dictionary {
        guard var dictionary = dictionary else { return self }
        dictionary.mergeInPlace(self)
        return dictionary
    }
}
