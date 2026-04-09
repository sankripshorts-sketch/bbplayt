import Foundation

extension NSError {
    convenience init(domain: String = #file,
                     code: Int = #line,
                     _ description: String) {
        self.init(
            domain: domain,
            code: code,
            userInfo: [
                NSLocalizedDescriptionKey: description
            ]
        )
    }
}
