import Foundation

protocol BannerUpdateAppRouter {
    func openAppStore(by url: URL)
    func showError(message: String)
}
