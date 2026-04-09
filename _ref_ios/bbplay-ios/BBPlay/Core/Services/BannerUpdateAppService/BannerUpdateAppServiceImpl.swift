import Foundation

final class BannerUpdateAppServiceImpl: BannerUpdateAppService {

    private let proxyNetworkService: NetworkServiceProtocol

    private var currentAppVersion: String? {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
    }
    
    init(
        proxyNetworkService: NetworkServiceProtocol
    ) {
        self.proxyNetworkService = proxyNetworkService
    }

    func checkForUpdates() async -> Bool {
        do {
            let iosVersion = try await loadAppVersion()
            return isNewVersion(
                currentVersion: currentAppVersion,
                newVersion: iosVersion
            )
        } catch {
            logger.error(error)
            return false
        }
    }

    private func loadAppVersion() async throws -> String {
        let endpoint = BannerUpdateAppEndpoint.bannerUpdateApp
        let response = try await proxyNetworkService.request(
            endpoint: endpoint
        ).map(
            BannerUpdateAppResponse.self,
            ErrorResponse.self
        )

        return response.toModel().iosVersion
    }

    private func isNewVersion(
        currentVersion: String?,
        newVersion: String
    ) -> Bool {
        guard let currentVersion else { return false }

        let currentVersionComponents = currentVersion.split(separator: ".").map { Int($0) ?? .zero }
        let newVersionComponents = newVersion.split(separator: ".").map { Int($0) ?? .zero }

        let maxCount = max(currentVersionComponents.count, newVersionComponents.count)

        for i in 0..<maxCount {
            let currentValue = i < currentVersionComponents.count ? currentVersionComponents[i] : 0
            let newValue = i < newVersionComponents.count ? newVersionComponents[i] : 0
            
            if currentValue != newValue {
                return newValue > currentValue
            }
        }

        return false
    }
}
