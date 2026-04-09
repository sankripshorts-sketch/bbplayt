import Foundation

final class TimeStorageImpl: TimeStorage {

    private enum Keys {
        static let selectedTimeKey = "selected_time_key"
    }
    
    private let userDefaults: UserDefaults

    init(
        userDefaults: UserDefaults = .standard
    ) {
        self.userDefaults = userDefaults
    }

    func saveSelectedTime(time: LocalTime?) {
        guard let time else { return }
        let timeString = "\(time.hour):\(time.minute)"
        userDefaults.set(timeString, forKey: Keys.selectedTimeKey)
    }

    func restoreSelectedTime() -> LocalTime? {
        let timeString = userDefaults.string(forKey: Keys.selectedTimeKey)

        let timeSplit = timeString?.split(separator: ":")
        guard let hourString = timeSplit?.first, let minuteString = timeSplit?.last else { return nil }
        guard let hour = Int(hourString), let minute = Int(minuteString) else { return nil }
        return LocalTime(hour: hour, minute: minute)
    }
}
