import Foundation
import UIKit

final class ClubsPresenterImpl {

    private weak var view: ClubsView?
    private let router: ClubsRouter
    private let maps: Maps
    private let phoneCall: PhoneCall
    private let socialMedia: SocialMedia
    private let clubsManager: ClubsManager

    private var isLoaded = false

    init(router: ClubsRouter,
         maps: Maps,
         phoneCall: PhoneCall,
         socialMedia: SocialMedia,
         clubsManager: ClubsManager) {
        self.router = router
        self.maps = maps
        self.phoneCall = phoneCall
        self.socialMedia = socialMedia
        self.clubsManager = clubsManager
        
        clubsManager.addListener(self)
    }
    
    deinit {
        clubsManager.removeListener(self)
    }
    
    func setView(_ view: ClubsView) {
        self.view = view
    }

    private func loaderOnIfNeeded() {
        guard !isLoaded else { return }
        view?.contentLoader(.on)
    }
    
    private func updateView() {
        guard !clubsManager.clubsList.isEmpty else { return }
        
        let models = clubsManager.clubsList.compactMap { club -> ClubModel? in
            guard let clubType = self.makeClubType(with: club.clubId) else { return nil }
            return ClubModel(
                id: club.clubId,
                clubType: clubType,
                adress: club.adress.adress,
                phone: club.adress.phone,
                socialLink: club.adress.website,
                mapAction: { [weak self] in
                    self?.openMap(club.adress.lat, club.adress.lng)
                },
                phoneAction: { [weak self] in
                    self?.phoneCallTap(with: club.adress.phone)
                },
                socialAction: { [weak self] in
                    self?.openSocialMedia(with: club.adress.website)
                })
        }
        view?.updateView(with: models.reversed())
        view?.contentLoader(.off)
        isLoaded = true
    }
    
    private func makeClubType(with clubId: String) -> ClubModel.ClubType? {
        switch clubId {
        case "74922": return .sovetskaya
        case "76301": return .astrahanskaya
        default: return nil
        }
    }
    
    private func openMap(_ lat: Double, _ lng: Double) {
        guard let alert = maps.getAlertWithMaps(
                latitude: lat,
                longitude: lng) else {
            logger.error("\(self) alert with maps is nil")
            assertionFailure()
            return
        }
        router.present(alert, animated: true)
    }
    
    private func phoneCallTap(with phoneNumber: String) {
        phoneCall.call(number: phoneNumber)
    }
    
    private func openSocialMedia(with link: String) {
        socialMedia.openSocialMedia(with: link)
    }
}

extension ClubsPresenterImpl: ClubsPresenter {
    func onViewWillAppear() {
        loaderOnIfNeeded()
    }

    func feedbackButtonTap() {
        router.openFeedback()
    }
}

// MARK: - ClubsManagerListener -
extension ClubsPresenterImpl: ClubsManagerListener {
    func clubsHasBeenUpdated() {
        Task { @MainActor in
            updateView()
        }
    }
}
