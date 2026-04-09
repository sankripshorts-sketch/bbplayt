import Foundation

final class ReservationPresenterImpl {

    weak var viewInput: ReservationViewInput?

    private let clubsManager: ClubsManager
    private let accountManager: AccountManager

    private let router: ReservationRouter
    private let availableComputerUseCase: AvailableComputerUseCase
    private let myBookingsUseCase: MyBookingsUseCase
    private let reservationUseCase: ReservationUseCase
    private let dateFormatter = DateFormatter()
    private let reservationButtonFormatter: ReservationButtonFormatter

    private var isLoaded = false

    init(
        clubsManager: ClubsManager,
        accountManager: AccountManager,
        router: ReservationRouter,
        availableComputerUseCase: AvailableComputerUseCase,
        myBookingsUseCase: MyBookingsUseCase,
        reservationUseCase: ReservationUseCase,
        reservationButtonFormatter: ReservationButtonFormatter = ReservationButtonFormatterImpl()
    ) {
        self.clubsManager = clubsManager
        self.accountManager = accountManager
        self.router = router
        self.availableComputerUseCase = availableComputerUseCase
        self.myBookingsUseCase = myBookingsUseCase
        self.reservationUseCase = reservationUseCase
        self.reservationButtonFormatter = reservationButtonFormatter

        clubsManager.addListener(self)
    }

    deinit {
        clubsManager.removeListener(self)
    }

    private var isCurrentDateCorrect: Bool {
        let date = Date().description
        let symbols = Set(["AM", "PM"])
        let components = Set(date.components(separatedBy: " "))
        return components.intersection(symbols).isEmpty
    }

    private var club: Club? {
        let clubId = clubsManager.getClubId()
        guard !clubId.isEmpty else { return nil }
        return clubsManager.clubsList.first(where: { $0.clubId == clubId })
    }

    // MARK: - Selected club
    private var selectedClub: String? {
        willSet {
            guard newValue != selectedClub else { return }
            viewInput?.updateStateDateView(with: .active)
        }
    }

    // MARK: - Selected date
    private var selectedDate: DatePickerSelectedData? {
        willSet {
            guard newValue != selectedDate else { return }
            viewInput?.updateStateTimeView(with: .active)
            selectedTimeAndPrices = nil
            selectedPC = nil
            availableComputerUseCase.clear()
            resetView()
        }
    }

    private var selectedTimeAndPrices: NewPricePickerValue?
    private var selectedProduct: SinglePriceValue?

    // MARK: - ExtendedSearch
    private var isExtendedSearch: Bool = false {
        willSet {
            guard newValue != isExtendedSearch else {
                viewInput?.updateExtendedSearchView(with: .unavailable)
                return
            }
            
            viewInput?.updateExtendedSearchView(
                with: newValue ? .active : .inactive
            )
            
            updateAvailableComputers(isExtendedSearch: newValue)
            selectedPC = nil
        }
    }

    // MARK: - Selected pc
    private var selectedPC: SelectedPCModel? {
        willSet {
            guard newValue != selectedPC else { return }
            updateSelectedProduct(selectedPC: newValue)
            updateReservationButton(selectedPC: newValue)
        }
    }
    
    private func reload() {
        isLoaded = false
        load()
    }
    
    private func load() {
        guard !isLoaded else { return }
        viewInput?.contentLoader(.on)
        
        guard let club else { return }
        isLoaded = true

        selectedClub = club.clubId
        viewInput?.updateSelectClubView(with: club.adress.adress)
        updateAvailableComputers(isExtendedSearch: isExtendedSearch)

        viewInput?.contentLoader(.off)

        guard selectedTimeAndPrices == nil else { return }
        viewInput?.updateStatePCView(with: .deselected)
        updateReservationButton(selectedPC: selectedPC)
        viewInput?.updateReservationPC(with: club.rooms)
        viewInput?.updateExtendedSearchView(with: .unavailable)
    }
    
    private func updateAvailableComputers(isExtendedSearch: Bool) {
        guard let club else { return }
        
        guard
            let selectedDate,
            let selectedTimeAndPrices
        else {
            Task {
                await MainActor.run {
                    viewInput?.updateRoomLoaderIndicator(isLoading: false)
                }
            }
            return
        }

        Task {
            await MainActor.run {
                viewInput?.updateRoomLoaderIndicator(isLoading: true)
            }

            do {
                let availablePCs = try await availableComputerUseCase.availablePCs(
                    data: .init(
                        cafeID: club.clubId,
                        dateStart: selectedDate.stringRepresentationDate,
                        timeStart: selectedTimeAndPrices.bookingTime.toString(),
                        mins: selectedTimeAndPrices.bookingDurationMins.formatted(),
                        isExtendedSearch: isExtendedSearch,
                        priceName: nil
                    )
                )

                await MainActor.run {
                    viewInput?.updateReservationPC(
                        with:
                            makeGameRooms(
                                club: club,
                                availablePCs: availablePCs)
                    )
                    viewInput?.updateStatePCView(with: .active)
                    updateReservationButton(selectedPC: selectedPC)
                    viewInput?.updateRoomLoaderIndicator(isLoading: false)
                    
                    if let selectedPC {
                        viewInput?.selectedComputer(with: selectedPC.name)
                    }
                }
            } catch {
                await MainActor.run {
                    viewInput?.showErrorAlert(with: error.localizedDescription)
                    viewInput?.updateRoomLoaderIndicator(isLoading: false)
                }
            }
        }
    }
    
    func makeGameRooms(
        club: Club,
        availablePCs: [AvailablePCsForBookingResponse.Data.PC]
    ) -> GameRooms {
        return .init(
            roomSize: club.rooms.roomSize,
            rooms: club.rooms.rooms.map { room -> GameRooms.GameRoom in
                return .init(
                    name: room.name,
                    roomFrame: room.roomFrame,
                    computers: room.computers.map { computer -> Computer in
                        guard
                            let newAvailablePC = availablePCs.first(
                                where: { $0.pcName == computer.name }
                            )
                        else {
                            return computer
                        }

                        let group = selectedTimeAndPrices?.pricesByGroupName[newAvailablePC.pcGroupName]
                        let status: ComputerStatus
                        if isExtendedSearch,
                            newAvailablePC.isUsing,
                            newAvailablePC.startTime != nil {
                            status = .free
                        } else if newAvailablePC.isUsing || newAvailablePC.pcGroupName != group?.groupName {
                            status = .busy
                        } else {
                            status = computer.status
                        }

                        return .init(
                            name: computer.name,
                            roomName: computer.roomName,
                            status: status,
                            position: computer.position,
                            textSize: computer.textSize
                        )
                    },
                    textColor: room.textColor,
                    borderColor: room.borderColor
                )
            }
        )
    }

    private func updateMyBookings() {
        Task {
            do {
                guard let myBookings = try await myBookingsUseCase.loadMyBookings() else { return }

                await MainActor.run {
                    viewInput?.setVisibleMyReserveButton(
                        isVisible: !myBookings.isEmpty
                    )
                }
            } catch {
                logger.error(error)

                await MainActor.run {
                    viewInput?.setVisibleMyReserveButton(isVisible: false)
                }
            }
        }
    }

    func updateViewWithSelectedTimes() {
        viewInput?.updateStatePCView(with: .deselected)
        viewInput?.updateButton(state: .inactive)
        viewInput?.updateExtendedSearchView(with: isExtendedSearch ? .active : .inactive)
        updateAvailableComputers(isExtendedSearch: isExtendedSearch)
    }

    private func resetView() {
        viewInput?.updateStateTimeView(with: .deselected)
        isExtendedSearch = false
        viewInput?.updateExtendedSearchView(with: .unavailable)
        viewInput?.updateStatePCView(with: .deselected)
        viewInput?.updateButton(state: .inactive)

        guard let club else { return }
        viewInput?.updateReservationPC(with: club.rooms)
    }

    private func updateSelectedProduct(selectedPC: SelectedPCModel?) {
        guard let selectedPC else { return }
        selectedProduct = selectedTimeAndPrices?.pricesByGroupName[selectedPC.groupName]
    }

    private func updateReservationButton(selectedPC: SelectedPCModel?) {
        guard let selectedPC, let selectedProduct else {
            viewInput?.updateButton(state: .inactive)
            return
        }

        let title: String?
        let description: String?

        if isExtendedSearch, let timeStart = selectedPC.timeStart {
            title = reservationButtonFormatter.title(cost: selectedProduct.cost)
            description = reservationButtonFormatter.description(
                pcName: selectedPC.name.leaveOnlyNumbers(),
                timeStart: timeStart.toString(),
                duration: selectedTimeAndPrices?.bookingDurationMins.formatted()
            )
        } else {
            title = reservationButtonFormatter.title(cost: selectedProduct.cost)
            description = reservationButtonFormatter.description(
                pcName: selectedPC.name.leaveOnlyNumbers(),
                timeStart: selectedTimeAndPrices?.bookingTime.toString(),
                duration: selectedTimeAndPrices?.bookingDurationMins.formatted()
            )
        }

        viewInput?.updateButton(with: description, title: title, state: .active)
    }

    private func openReplenishScreen() {
        let memberEmail = accountManager.getAccount()?.memberEmail
        let isValidEmail: Bool = memberEmail?.makeValidEmail() != nil

        router.showReplenishAlert(
            with: Localizable.error(),
            and: ReservationUseCaseError.balanceInvalid.localizedDescription,
            completion: { [weak self] in
                guard let self else { return }
                if isValidEmail {
                    self.router.openReplenishScreen(inputData: nil)
                } else {
                    self.router.openUserEmailScreen(
                        didFinish: { [weak self] outputData in
                            self?.router.openReplenishScreen(
                                inputData: .init(
                                    email: outputData.email,
                                    openScreenCallback: {
                                        outputData.closeAction()
                                    }
                                )
                            )
                        }
                    )
                }
            }
        )
    }
}

// MARK: - ReservationPresenter -
extension ReservationPresenterImpl: ReservationPresenter {
    func onViewWillAppear() {
        load()
        updateMyBookings()
    }
    
    func selectClubTapped() {
        guard let club else { return }
        router.openClubBottomSheet(with: club.adress.adress)
    }
    
    func selectDateTapped() {
        guard isCurrentDateCorrect else {
            viewInput?.showErrorAlert(with: Localizable.deviceTimeError())
            return
        }

        router.openDatePicker(
            didFinish: { [weak self] data in
                guard let self else { return }
                selectedDate = data
                dateFormatter.setLocalizedDateFormatFromTemplate("E, d MMM")
                let selectedDay = dateFormatter.string(from: data.date)
                viewInput?.updateSelectDateView(with: selectedDay)
            }
        )
    }

    func selectTimeTapped() {
        guard isCurrentDateCorrect else {
            viewInput?.showErrorAlert(with: Localizable.deviceTimeError())
            return
        }

        guard let currentDay = selectedDate?.date, let club else { return }

        router.openTimePicker(
            with: currentDay,
            allPrices: club.prices,
            didFinish: { [weak self] selectedTimeAndPrices in
                self?.selectedTimeAndPrices = selectedTimeAndPrices
                self?.selectedPC = nil
                self?.updateViewWithSelectedTimes()
                guard
                    let title = self?.makeTitleForSelectedTimeView(selectedTimeAndPrices: selectedTimeAndPrices)
                else {
                    return
                }
                self?.viewInput?.updateSelectTimeView(with: title)
            }
        )
    }

    func makeTitleForSelectedTimeView(selectedTimeAndPrices: NewPricePickerValue?) -> String? {
        guard let selectedTimeAndPrices else { return nil }
        return Localizable.titleOnSelectedView(
            selectedTimeAndPrices.bookingTime.toString(),
            LocalTime.formatDuration(duration: selectedTimeAndPrices.bookingDurationMins)
        )
    }

    func extendedSearchTapped() {
        guard selectedTimeAndPrices != nil else {
            viewInput?.updateExtendedSearchView(with: .unavailable)
            return
        }
        isExtendedSearch.toggle()
    }

    func extendedSearchQuestionMarkTapped() {
        router.openExtendedSearchAlert()
    }

    func computerTapped(with pcName: String) {
        guard let pc = availableComputerUseCase.availablePC(by: pcName) else { return }

        selectedPC = .init(
            name: pc.name,
            isUsing: pc.isUsing,
            dateStart: pc.dateStart,
            timeStart: pc.timeStart,
            groupName: pc.groupName
        )

        viewInput?.selectedComputer(with: pcName)
    }

    func reserveButtonTapped() {
        viewInput?.updateButton(state: .loading)
        viewInput?.updateStatePCView(with: .deselected)
        Task {
            do {
                try await reservationUseCase.addReservation(
                    data: .init(
                        pcName: selectedPC?.name,
                        startDate: selectedDate?.stringRepresentationDate,
                        product: selectedProduct,
                        extendedDateStart: selectedPC?.dateStart,
                        extendedTimeStart: selectedPC?.timeStart,
                        isExtendedSearch: isExtendedSearch
                    )
                )

                await MainActor.run {
                    router.openSuccessReservationAlert()
                    selectedPC = nil
                }

                updateMyBookings()
                updateAvailableComputers(isExtendedSearch: isExtendedSearch)
            } catch ReservationUseCaseError.balanceInvalid {
                await MainActor.run {
                    openReplenishScreen()
                    updateReservationButton(selectedPC: selectedPC)
                    viewInput?.updateStatePCView(with: .active)
                }
            } catch ReservationUseCaseError.accountNotFound {
                // TODO: Router
                await MainActor.run {
                    viewInput?.showErrorAlert(
                        with: ReservationUseCaseError.accountNotFound.localizedDescription
                    )
                    updateReservationButton(selectedPC: selectedPC)
                    viewInput?.updateStatePCView(with: .active)
                }
            } catch let error {
                logger.error(error)
                await MainActor.run {
                    router.showAlert(
                        with: Localizable.error(),
                        and: error.localizedDescription
                    )
                    updateReservationButton(selectedPC: selectedPC)
                    viewInput?.updateStatePCView(with: .active)
                }
            }
        }
    }

    func myReservationButtonTapped() {
        guard let club, let myBookings = myBookingsUseCase.myBookings else { return }
        router.openMyReserveScreen(with: club, myBookings: myBookings)
    }

    func termsAndPricesTapped() {
        guard let club else { return }
//        router.openAllPricesAlert(with: club.prices, adress: club.adress.adress)
    }
}

// MARK: - ClubsManagerListener -
extension ReservationPresenterImpl: ClubsManagerListener {
    func clubsHasBeenUpdated() {
        reload()
    }
}
