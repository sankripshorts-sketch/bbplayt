import Foundation

protocol BannerUpdateAppService {
    func checkForUpdates() async -> Bool
}
