import Foundation

struct LocalTime: Comparable, Hashable {
    let hour: Int
    let minute: Int
    let second: Int
    
    init(hour: Int = 0, minute: Int = 0, second: Int = 0) {
        self.hour = hour
        self.minute = minute
        self.second = second
    }
    
    init(seconds: Int) {
        self.hour = Int((seconds / 3600) % 24)
        self.minute = Int((seconds % 3600) / 60)
        self.second = Int(seconds % 60)
    }
    
    func isAfter(_ other: LocalTime) -> Bool {
        return self > other
    }
    
    func plusTimeOffset(minutes: Int) -> LocalTime {
        let totalMinutes = hour * 60 + minute + Int(minutes)
        let newHour = (totalMinutes / 60) % 24
        let newMinute = totalMinutes % 60
        return LocalTime(hour: newHour, minute: newMinute, second: second)
    }
    
    func minutesForwardTo(_ other: LocalTime) -> Int {
        let selfMinutes = hour * 60 + minute
        let otherMinutes = other.hour * 60 + other.minute
        return otherMinutes - selfMinutes
    }

    func toString() -> String {
        return String(format: "%02d:%02d", hour, minute)
    }

    static func < (lhs: LocalTime, rhs: LocalTime) -> Bool {
        if lhs.hour != rhs.hour { return lhs.hour < rhs.hour }
        if lhs.minute != rhs.minute { return lhs.minute < rhs.minute }
        return lhs.second < rhs.second
    }
    
    static let startOfDay = LocalTime(hour: 0, minute: 0)
    static let endOfDay = LocalTime(hour: 23, minute: 59)
    
    static func formatDuration(duration: Int) -> String {
        let hours = duration / 60
        let minutes = duration % 60
        
        if hours == 0 {
            return "\(minutes) мин"
        } else if minutes == 0 {
            return "\(hours) ч"
        } else {
            return "\(hours) ч \(minutes) мин"
        }
    }
}
