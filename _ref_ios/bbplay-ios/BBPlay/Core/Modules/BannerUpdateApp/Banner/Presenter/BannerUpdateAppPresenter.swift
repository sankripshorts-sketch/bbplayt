import Foundation
import UIKit

final class BannerUpdateAppPresenter: BannerUpdateAppViewOutput {
    private enum Constants {
        static let deeplink = "itms-apps://itunes.apple.com/app/"
        static let appID = "id6445922172"
    }

    weak var viewInput: BannerUpdateAppViewInput?
    private let router: BannerUpdateAppRouter
    
    init(
        router: BannerUpdateAppRouter
    ) {
        self.router = router
    }

    func updateButtonTapped() {
        let urlString = Constants.deeplink + Constants.appID
        guard let url = URL(string: urlString) else { return }
        
        if UIApplication.shared.canOpenURL(url) {
            router.openAppStore(by: url)
        } else {
            router.showError(
                message: "Can't open AppStore"
            )
        }
       
    }
}
