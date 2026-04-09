import Foundation

protocol ProfilePresenter: AnyObject {
    func openSettings()
    func openBonusRublesAlert()
    func openReplenishScreen()
    func goToRanking()
    func onViewDidAppear()
    func refresh()
    func needLogout()
}
