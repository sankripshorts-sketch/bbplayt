import Foundation

enum Environment {

    case dev
    case prod

}

extension Environment {
    
    static var current: Environment {
#if DEBUG
        return .dev
#else
        return .prod
#endif
    }
}
