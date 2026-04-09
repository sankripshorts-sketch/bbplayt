import Foundation

final class CellConfiguration {
    let haveImage: Bool
    let haveLink: Bool
    let havePoll: Bool
    
    init(haveImage: Bool, haveLink: Bool, havePoll: Bool) {
        self.haveImage = haveImage
        self.haveLink = haveLink
        self.havePoll = havePoll
    }
}

extension CellConfiguration: Hashable {
    static func == (lhs: CellConfiguration, rhs: CellConfiguration) -> Bool {
       ObjectIdentifier(lhs) == ObjectIdentifier(rhs)
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(ObjectIdentifier(self))
    }
}
