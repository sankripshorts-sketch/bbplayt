import Foundation

final class ReservationButtonFormatterImpl: ReservationButtonFormatter {

    /// тут цена продукта или чет такое, пока хардкод
    func title(cost: String) -> String? {
        let localizablePrice = Localizable.rub(cost)
        return Localizable.titleReserveButton(localizablePrice)
    }

    func description(
        pcName: String,
        timeStart: String?,
        duration: String?
    ) -> String? {
        let isoDateFormatter = ISO8601DateFormatter()
        
        guard let timeStart = formatTimeStart(timeStart: timeStart),
              let duration,
              let durationMinutes = Double(duration),
              let startDate = isoDateFormatter.date(
                from: "2000-01-01T\(timeStart):00Z"
              )
        else {
            return nil
        }

        isoDateFormatter.formatOptions = [.withFullTime]
        let endDate = startDate.addingTimeInterval(durationMinutes * 60)
        let endStringTime = isoDateFormatter.string(from: endDate)
        let endDateComponents = endStringTime.split(separator: ":")
        let endTimeShort = endDateComponents.prefix(2).joined(separator: ":")

        return Localizable.descriptionOnReserveButton(
            pcName,
            timeStart,
            endTimeShort
        )
    }
    
    private func formatTimeStart(timeStart: String?) -> String? {
        guard let timeStart else { return nil }
        let timeStartComponents = timeStart.split(separator: ":")
        return timeStartComponents.prefix(2).joined(separator: ":")
    }
}
