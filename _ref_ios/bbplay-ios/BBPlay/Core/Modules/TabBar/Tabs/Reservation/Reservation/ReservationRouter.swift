import Foundation
import UIKit

final class ReservationRouter: Router {
    
    private let authManager: AuthManager
    private let analyticsManager: AnalyticsManager
    private let networkService: NetworkService
    
    init(authManager: AuthManager,
         analyticsManager: AnalyticsManager,
         networkService: NetworkService,
         navigationController: UINavigationController?) {
        self.authManager = authManager
        self.analyticsManager = analyticsManager
        self.networkService = networkService
        super.init(navigationController: navigationController)
    }
    
    func openClubBottomSheet(with adress: String) {
        let viewController = makeClubsButtomSheetViewController(with: adress)
        present(viewController, animated: true)
    }
    
    func openAllPricesAlert(with info: PriceInfo, adress: String) {
        let alert = makeAllPricesAlert(with: info, adress: adress)
        present(alert, animated: true)
    }
    
    func openDatePicker(didFinish: @escaping (DatePickerSelectedData) -> Void) {
        let viewController = makeDatePickerViewController(didFinish: didFinish)
        present(viewController, animated: true)
    }
    
    func openTimePicker(
        with currentDay: Date,
        allPrices: AllPrices,
        didFinish: @escaping (NewPricePickerValue?) -> Void
    ) {
        let viewController = makeTimePickerViewController(
            with: currentDay,
            allPrices: allPrices,
            didFinish: didFinish
        )
        present(viewController, animated: true)
    }

    func openExtendedSearchAlert() {
        let viewController = ExtendedSearchAlert()
        present(viewController, animated: true)
    }
    
    func openSuccessReservationAlert() {
        let viewController = SuccessReserveBottomSheet()
        present(viewController, animated: true)
    }
    
    func openMyReserveScreen(with club: Club, myBookings: [MyBooking]) {
        let viewController = makeMyReserveViewController(with: club, myBookings: myBookings)
        push(viewController)
        needShowNavigationBar()
    }
    
    @MainActor
    func showAlert(with title: String, and description: String) {
        let alert =  UIAlertController(title: title, message: description, preferredStyle: .alert)
        let action = UIAlertAction(title: Localizable.okey(), style: .default) { [weak self] _ in
            self?.dismiss()
        }
        
        alert.addAction(action)
        present(alert, animated: true)
    }

    func openReplenishScreen(inputData: ReplenishPresenterImpl.InputData?) {
        let viewController = makeReplenishViewController(inputData: inputData)
        push(viewController)
        needShowNavigationBar()
    }

    func openUserEmailScreen(
        didFinish: @escaping (UserEmailPresenterImpl.OutputData) -> Void
    ) {
        let viewController = makeUserEmailViewController(didFinish: didFinish)
        push(viewController)
        needShowNavigationBar()
    }

    func showReplenishAlert(with title: String, and description: String, completion: @escaping EmptyClosure) {
        let alert =  UIAlertController(title: title, message: description, preferredStyle: .alert)
        let action = UIAlertAction(title: Localizable.okey(), style: .default) { [weak self] _ in
            self?.dismiss() {
                completion()
            }
        }
        
        alert.addAction(action)
        present(alert, animated: true)
    }
    
    private func makeClubsButtomSheetViewController(with adress: String) -> ClubsBottomSheetViewController {
        let viewController = ClubsBottomSheetViewController(adress: adress)
        return viewController
    }
    
    private func makeAllPricesAlert(with info: PriceInfo, adress: String) -> PriceBottomSheetAlert {
        let presenter = PriceBottomSheetPresenterImpl()
        let viewController = PriceBottomSheetAlert(priceInfo: info, presenter: presenter, adress: adress)
        return viewController
    }
    
    private func makeDatePickerViewController(
        didFinish: @escaping (DatePickerSelectedData) -> Void
    ) -> DatePickerViewController {
        let presenter = DatePickerPresenterImpl()
        let viewController = DatePickerViewController(
            presenter: presenter,
            didFinish: didFinish
        )
        return viewController
    }
    
    private func makeTimePickerViewController(
        with currentDay: Date,
        allPrices: AllPrices,
        didFinish:  @escaping (NewPricePickerValue?) -> Void
    ) -> TimePickerViewController {
        let timeBuilder = TimeBuilderImpl(
            currentDay: currentDay,
            timeTechBreak: allPrices.timeTechBreak
        )
        let timeStorage = TimeStorageImpl()
        let productStorage = ProductStorageImpl()
        let generatePricePickerValuesUseCase = GeneratePricePickerValuesUseCaseImpl()
        let presenter = TimePickerPresenter(
            timeBuilder: timeBuilder,
            timeStorage: timeStorage,
            productStorage: productStorage,
            generatePricesUseCase: generatePricePickerValuesUseCase,
            allPrices: allPrices,
            currentDay: currentDay,
            didFinish: didFinish
        )
        let viewController = TimePickerViewController(output: presenter)
        return viewController
    }
    
    private func makeMyReserveViewController(with club: Club, myBookings: [MyBooking]) -> MyReserveViewController {
        let presenter = MyReservePresenterImpl(club: club, myBookings: myBookings)
        let viewController = MyReserveViewController(presenter: presenter)
        presenter.setView(viewController)
        return viewController
    }
    
    private func makeReplenishViewController(
        inputData: ReplenishPresenterImpl.InputData?
    ) -> ReplenishViewController {
        let converter = ReplenishConverter()
        let presenter = ReplenishPresenterImpl(
            inputData: inputData,
            authManager: authManager,
            analyticsManager: analyticsManager,
            networkService: networkService,
            converter: converter
        )
        let viewController = ReplenishViewController(presenter: presenter)
        presenter.view = viewController
        return viewController
    }
    
    private func makeUserEmailViewController(
        didFinish: @escaping (UserEmailPresenterImpl.OutputData) -> Void
    ) -> UserEmailViewController {
        let presenter = UserEmailPresenterImpl(didFinish: didFinish)
        let viewController = UserEmailViewController(presenter: presenter)
        presenter.view = viewController
        return viewController
    }

}
