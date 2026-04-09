import Foundation

// TODO: - вернуть логику очишения хранилищ после перезагрузки апы или как там щас логика
let reservationTimeKey = "reservationTimeKey"
let reservationDurationKey = "reservationDurationKey"

final class TimePickerPresenter: TimePickerViewOutput {
    private let didFinish: (NewPricePickerValue?) -> Void

    private weak var viewInput: TimePickerViewInput?
    private let timeBuilder: TimeBuilder
    private let timeStorage: TimeStorage
    private let productStorage: ProductStorage
    private let generatePricesUseCase: GeneratePricePickerValuesUseCase
    private let allPrices: AllPrices
    private let currentDay: Date
    
    private let calendar = Calendar.current

    private var timeSlots: [TimeSlot] = []
    private var displayProducts: [ProductDisplayItem] = []
    
    private var pricePickerValues: [NewPricePickerValue]?

    private var selectedTime: LocalTime?
    private var selectedProduct: NewPricePickerValue?

    private var restoredTimeIndex: Int?
    private var restoredProductIndex: Int?

    init(
        timeBuilder: TimeBuilder,
        timeStorage: TimeStorage,
        productStorage: ProductStorage,
        generatePricesUseCase: GeneratePricePickerValuesUseCase,
        allPrices: AllPrices,
        currentDay: Date,
        didFinish: @escaping (NewPricePickerValue?) -> Void
    ) {
        self.timeBuilder = timeBuilder
        self.timeStorage = timeStorage
        self.productStorage = productStorage
        self.generatePricesUseCase = generatePricesUseCase
        self.allPrices = allPrices
        self.currentDay = currentDay
        self.didFinish = didFinish
    }

    // MARK: - NewTimePickerPresenter
    func setViewInput(_ viewInput: TimePickerViewInput) {
        self.viewInput = viewInput
    }
    
    func onViewDidLoad() {
        setupTimeSlots()
        restoreTime()
        updateDisplayProducts()
        restoreProduct()
    }
    
    func onViewDidLayoutSubviews() {
        scrollToSavedSelection()
    }
    
    func didSelectTime(at index: Int) {
        let timeSlot = timeSlots[safe: index]
        selectedTime = timeSlot?.time
        updateDisplayProducts()
        updateSelectedProduct()
    }

    func didSelectProduct(at index: Int) {
        guard let displayProduct = displayProducts[safe: index] else { return }
        selectedProduct = pricePickerValues?.first(where: { $0.name == displayProduct.displayName })
    }

    func confirmSelection() {
        saveSelectedTime(time: selectedTime)
        saveSelectedProduct(name: selectedProduct?.name)

        assert(
            selectedTime == selectedProduct?.bookingTime, "выбранное время, и время бронирования продукта должны совпадать"
        )

        viewInput?.dismiss { [weak self] in
            self?.didFinish(self?.selectedProduct)
        }
    }

    func cancelSelection() {
        viewInput?.close()
    }
    
    // TODO: - сделать синк двух коллекций
    private func updateSelectedProduct() {
        // плохо, очень плохо.
        // проблема: после открытия если продукт какой то выбран,
        // меняя время и нажимая кнопку подтвердить, продукт со старым временем выкидывается.
        // тут таким образом просто время обновляем, все остальное вроде коррект.
        // так же фиксит отсутсвие продукта после проматывания времени перерыва
        selectedProduct = pricePickerValues?.first(where: { $0.name == selectedProduct?.name }) ?? pricePickerValues?[safe: 0]
    }

    private func updateDisplayProducts() {
        guard let selectedTime else {
            viewInput?.showUnavailableView()
            return
        }

        pricePickerValues = generatePricesUseCase.invoke(
            allPrices: allPrices,
            selectedTime: selectedTime,
            dayOfWeek: makeDayOfWeek()
        )?.sorted(by: { $0.position < $1.position })

        guard let pricePickerValues,!pricePickerValues.isEmpty else {
            viewInput?.updateButtonState(state: .deselected)
            viewInput?.updateProducts(with: [.empty])
            return
        }

        displayProducts = pricePickerValues.enumerated().map { index, value in
            ProductDisplayItem(id: index, displayName: value.name)
        }

        viewInput?.updateProducts(with: displayProducts)
        viewInput?.updateButtonState(state: .active)
    }

    private func setupTimeSlots() {
        timeSlots = timeBuilder.generateTimeSlots(stepBooking: allPrices.stepBooking)
        
        guard !timeSlots.isEmpty else {
            viewInput?.showUnavailableView()
            return
        }

        if selectedTime == nil, let firstTime = timeSlots.first {
            selectedTime = firstTime.time
        }

        viewInput?.updateTimes(with: timeSlots)
    }

    private func makeDayOfWeek() -> DayOfWeek? {
        let weekday = calendar.component(.weekday, from: currentDay)
        let adjustedWeekday = weekday == 1 ? 7 : weekday - 1
        return DayOfWeek(rawValue: adjustedWeekday)
    }

    private func scrollToSavedSelection() {
        viewInput?.scrollToItems(timeIndex: restoredTimeIndex, productIndex: restoredProductIndex)
    }

    private func saveSelectedTime(time: LocalTime?) {
        timeStorage.saveSelectedTime(time: time)
    }

    private func saveSelectedProduct(name: String?) {
        productStorage.saveSelectedProduct(name: name)
    }

    private func restoreTime() {
        guard
            let restoredTime = timeStorage.restoreSelectedTime(),
            let timeSlotIndex = timeSlots.firstIndex(where: { $0.time == restoredTime })
        else {
            return
        }
        restoredTimeIndex = timeSlotIndex
        selectedTime = restoredTime
    }

    private func restoreProduct() {
        guard
            let savedProductName = productStorage.restoreSelectedProduct(from: displayProducts.map(\.displayName)),
            let displayProductIndex = displayProducts.firstIndex(where: { $0.displayName == savedProductName })
        else {
            return
        }

        restoredProductIndex = displayProductIndex
        selectedProduct = pricePickerValues?.first(where: { $0.name == savedProductName })
    }
}
