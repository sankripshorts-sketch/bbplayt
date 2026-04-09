import Foundation

protocol ReservationPresenter: AnyObject {
    func onViewWillAppear()

    func selectClubTapped()
    func selectDateTapped()
    func selectTimeTapped()
    func extendedSearchTapped()
    func extendedSearchQuestionMarkTapped()

    func computerTapped(with pcName: String)
    func reserveButtonTapped()
    func myReservationButtonTapped()
    
    func termsAndPricesTapped()
}
