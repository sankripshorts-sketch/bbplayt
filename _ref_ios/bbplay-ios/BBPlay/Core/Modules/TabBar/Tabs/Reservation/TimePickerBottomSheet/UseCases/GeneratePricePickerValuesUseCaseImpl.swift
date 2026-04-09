import Combine

class GeneratePricePickerValuesUseCaseImpl: GeneratePricePickerValuesUseCase {
    func invoke(
        allPrices: AllPrices?,
        selectedTime: LocalTime?,
        dayOfWeek: DayOfWeek?
    ) -> [NewPricePickerValue]? {
        guard
            let selectedTime,
            let allPrices,
            !allPrices.isEmpty
        else {
            return nil
        }
        return generatePrices(
            selectedTime: selectedTime,
            allPrices: allPrices,
            dayOfWeek: dayOfWeek
        )
    }

    private func generatePrices(
        selectedTime: LocalTime,
        allPrices: AllPrices,
        dayOfWeek: DayOfWeek?
    ) -> [NewPricePickerValue] {
        return allPrices.toGenericPrices().compactMap { price in
                guard let dayOfWeek, price.showWeekDays.contains(dayOfWeek) else { return nil }
                return price.toSinglePriceValue(
                    bookingTime: selectedTime,
                    timeTechBreak: allPrices.timeTechBreak
                )
            }
            .grouped(by: { $0.name })
            .map { (name: String, values: [SinglePriceValue]) in
                NewPricePickerValue(
                    position: values.first!.position,
                    name: name,
                    bookingDurationMins: values.first!.bookingDurationMins,
                    bookingTime: values.first!.bookingTime,
                    pricesByGroupName: Dictionary(
                        uniqueKeysWithValues: values.map { ($0.groupName, $0) }
                    )
                )
            }
    }
}

private extension Array where Element == SinglePriceValue {
    func grouped(by keySelector: (Element) -> String) -> [String: [Element]] {
        return Dictionary(grouping: self, by: keySelector)
    }
}
