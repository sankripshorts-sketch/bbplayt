import Foundation

protocol ReservationViewInput: AnyObject {
    func contentLoader(_ state: ContentLoaderState)
    func updateReservationPC(with rooms: GameRooms)
    func selectedComputer(with pcName: String)
    func updateSelectClubView(with adress: String)
    func updateSelectDateView(with selectedDay: String)
    func updateSelectTimeView(with selectedTime: String)
    
    func updateStateClubView(with state: SelectedView.ViewState)
    func updateStateDateView(with state: SelectedView.ViewState)
    func updateStateTimeView(with state: SelectedView.ViewState)
    func updateExtendedSearchView(with state: ExtendedSearchView.State)
    func updateRoomLoaderIndicator(isLoading: Bool)
    func updateStatePCView(with state: SelectedView.ViewState)
    func updateButton(with description: String?, title: String?, state: ReservationButtonState)
    func setVisibleMyReserveButton(isVisible: Bool)
    
    func showErrorAlert(with description: String)
}

extension ReservationViewInput {
    func updateButton(with description: String? = nil, title: String? = nil, state: ReservationButtonState) {
        updateButton(with: description, title: title, state: state)
    }
}
