import Foundation

struct BannerUpdateAppResponse: Decodable {
    let code: Int
    let message: String
    let data: BannerUpdateAppData
    
    struct BannerUpdateAppData: Decodable {
        let androidVersion: String
        let iosVersion: String
        
        enum CodingKeys: String, CodingKey {
            case androidVersion = "android_version"
            case iosVersion = "ios_version"
        }
    }
    
    func toModel() -> BannerUpdateAppModel {
        return .init(iosVersion: data.iosVersion)
    }
}
