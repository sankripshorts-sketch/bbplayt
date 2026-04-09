import Foundation

final class DatePickerPresenterImpl {
    enum Keys {
        /// Ключ для сохранения выбранной даты
        static let reservationDate = "reservation_date_key"
    }

    private weak var view: DatePickerView?

    private let storage = UserDefaults.standard
    private let daysDate: [DatePicker.Day]? = makeDays()

    private var savedDay: Date? {
        get {
            storage.object(forKey: Keys.reservationDate) as? Date
        }
        set {
            storage.set(newValue, forKey: Keys.reservationDate)
            removeSavedTimesAndDurations()
        }
    }
    
    private func updateCollectionView() {
        guard let daysDate else { return }
        let model = DatePicker(dates: daysDate)
        view?.update(with: model)
    }

    private static func makeDays() -> [DatePicker.Day]? {
        let date = Date()

        var calendar = Calendar(identifier: .gregorian)
        if let utcTimeZone = TimeZone(secondsFromGMT: 0) {
            calendar.timeZone = utcTimeZone
        } else {
            calendar.timeZone = TimeZone.current
        }

        guard let rangeDays = calendar.range(of: .day, in: .month, for: date) else {
            return nil
        }

        let dateFormatter = DateFormatter()
        dateFormatter.setLocalizedDateFormatFromTemplate("E, d MMM")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)

        let days: [DatePicker.Day] = rangeDays.compactMap { value in
            calendar.date(bySetting: .day, value: value, of: date)
        }
            .sorted(by: { $0 < $1 })
            .map { .init(date: $0, day: dateFormatter.string(from: $0)) }
        
        return days
    }

    private func scrollToItemIfNeeded() {
        guard let savedDay = savedDay,
              let daysDate = daysDate,
              let index = daysDate.firstIndex(where: { $0.date == savedDay }) else {
            return
        }
        
        view?.scroll(to: index)
    }

    private func removeSavedTimesAndDurations() {
        storage.removeObject(forKey: reservationTimeKey)
        storage.removeObject(forKey: reservationDurationKey)
    }
}

// MARK: - DatePickerPresenter -
extension DatePickerPresenterImpl: DatePickerPresenter {
    func setView(_ view: DatePickerView) {
        self.view = view
    }
    
    func onViewDidLoad() {
        updateCollectionView()
    }
    
    func onViewDidLayoutSubviews() {
        scrollToItemIfNeeded()
    }
    
    func continueButtonTapped(with index: Int) {
        guard let date = daysDate?[index].date else { return }
        savedDay = date

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withFullDate]
        let dateStart = dateFormatter.string(from: date)

        view?.dimiss(
            outputModel: .init(
                date: date,
                stringRepresentationDate: dateStart
            )
        )
    }
}

extension DatePickerPresenterImpl {
    struct DatePicker {
        struct Day: Hashable {
            let uuid = UUID()
            let date: Date
            let day: String
            
            static func == (lhs: Day, rhs: Day) -> Bool {
                return lhs.uuid == rhs.uuid
            }
            
            func hash(into hasher: inout Hasher) {
                hasher.combine(uuid)
            }
        }

        let dates: [Day]
    }
}
