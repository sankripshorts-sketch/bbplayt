import Combine

protocol GeneratePricePickerValuesUseCase {
    func invoke(
        allPrices: AllPrices?,
        selectedTime: LocalTime?,
        dayOfWeek: DayOfWeek?
    ) -> [NewPricePickerValue]?
}
