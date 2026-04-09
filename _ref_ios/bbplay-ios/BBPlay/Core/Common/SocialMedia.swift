import Foundation
import UIKit

final class SocialMedia {
    func openSocialMedia(with link: String) {
        guard let webVkURL = URL(string: "http://\(link)") else {
            logger.error("\(self) vk url missing")
            assertionFailure()
            return
        }
        UIApplication.shared.open(webVkURL, options: [:], completionHandler: nil)
    }
}
