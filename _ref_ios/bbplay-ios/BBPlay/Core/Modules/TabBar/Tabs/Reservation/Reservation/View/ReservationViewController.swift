import Foundation
import UIKit

final class ReservationViewController: UIViewController {
    
    private let mainView = ReservationView()
    private let presenter: ReservationPresenter
    
    init(presenter: ReservationPresenter) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
        setActions()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func loadView() {
        view = mainView
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        presenter.onViewWillAppear()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        mainView.updateAppearance()
    }
    
    private func setActions() {
        mainView.setSelectClubAction { [weak self] in
            self?.presenter.selectClubTapped()
        }
        
        mainView.setSelectDateAction { [weak self] in
            self?.presenter.selectDateTapped()
        }
        
        mainView.setSelectTimeAction { [weak self] in
            self?.presenter.selectTimeTapped()
        }
        
        mainView.setExtendedSearchQuestionMarkAction { [weak self] in
            self?.presenter.extendedSearchQuestionMarkTapped()
        }
        
        mainView.setExtendedSearchSelectionAction { [weak self] in
            self?.presenter.extendedSearchTapped()
        }

        mainView.setReserveButtonAction { [weak self] in
            self?.presenter.reserveButtonTapped()
        }

        mainView.setMyReservationButtonAction { [weak self] in
            self?.presenter.myReservationButtonTapped()
        }

        mainView.setAllPriceButtonAction { [weak self] in
            self?.presenter.termsAndPricesTapped()
        }
        
    }
}

// MARK: - ReservationView -
extension ReservationViewController: ReservationViewInput {
    func contentLoader(_ state: ContentLoaderState) {
        state == .on ? navigationController?.activityIndicatorOn() : navigationController?.activityIndicatorOff()
    }
    
    func updateReservationPC(with rooms: GameRooms) {
        mainView.updateGameRooms(with: rooms)
        
        mainView.setPCRoomTapAction { [weak self] pcName in
            self?.presenter.computerTapped(with: pcName)
        }
    }
    
    func selectedComputer(with pcName: String) {
        mainView.selectedComputer(with: pcName)
    }
    
    func updateSelectClubView(with adress: String) {
        mainView.updateSelectClubView(with: adress)
    }
    
    func updateSelectDateView(with selectedDay: String) {
        mainView.updateSelectDateView(with: selectedDay)
    }
    
    func updateSelectTimeView(with selectedTime: String) {
        mainView.updateSelectTimeView(with: selectedTime)
    }
    
    func updateStateClubView(with state: SelectedView.ViewState) {
        mainView.updateStateClubView(with: state)
    }
    
    func updateStateDateView(with state: SelectedView.ViewState) {
        mainView.updateStateDateView(with: state)
    }
    
    func updateStateTimeView(with state: SelectedView.ViewState) {
        mainView.updateStateTimeView(with: state)
    }

    func updateExtendedSearchView(with state: ExtendedSearchView.State) {
        mainView.updateExtendedSearchView(with: state)
    }
    
    func updateRoomLoaderIndicator(isLoading: Bool) {
        mainView.updateRoomLoaderIndicator(isLoading: isLoading)
    }
    
    func updateStatePCView(with state: SelectedView.ViewState) {
        mainView.updateStatePCView(with: state)
    }
    
    func updateButton(with description: String?, title: String?, state: ReservationButtonState) {
        mainView.updateButton(with: description, title: title, state: state)
    }

    func setVisibleMyReserveButton(isVisible: Bool) {
        mainView.setVisibleMyReserveButton(isVisible: isVisible)
    }
    
    func showErrorAlert(with description: String) {
        showDefaultAlert(description: description)
    }
}

