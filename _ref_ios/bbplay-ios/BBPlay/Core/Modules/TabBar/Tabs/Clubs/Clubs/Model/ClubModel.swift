import Foundation
import UIKit

struct ClubModel {
    let id: String
    let clubType: ClubType
    let adress: String
    let phone: String
    let socialLink: String
    let mapAction: EmptyClosure
    let phoneAction: EmptyClosure
    let socialAction: EmptyClosure
}

extension ClubModel: Hashable {
    static func == (lhs: ClubModel, rhs: ClubModel) -> Bool {
        return lhs.id == rhs.id
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

extension ClubModel {
    enum ClubType {
        case sovetskaya
        case astrahanskaya
    }

    var background: UIImage {
        switch clubType {
        case .sovetskaya:
            return Image.clubCardBackground()!
        case .astrahanskaya:
            return Image.clubAstrakhanskaya()!
        }
    }
}
