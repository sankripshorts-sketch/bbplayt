import Foundation

final class TimeBuilderImpl: TimeBuilder {
    
    private let calendar: Calendar = .current
    private let currentDay: Date
    private let timeTechBreak: TimeTechBreak

    init(
        currentDay: Date,
        timeTechBreak: TimeTechBreak
    ) {
        self.currentDay = currentDay
        self.timeTechBreak = timeTechBreak
    }

    func generateTimeSlots(stepBooking: Int) -> [TimeSlot] {
        guard stepBooking > 0, stepBooking <= 60 else {
            return []
        }

        guard let hourRange = calendar.range(of: .hour, in: .day, for: currentDay) else {
            return []
        }
        
        var timeSlots: [TimeSlot] = []
        
        for hour in hourRange {
            for minute in stride(from: 0, to: 60, by: stepBooking) {
                if let date = createDate(hour: hour, minute: minute) {
                    let timeSlot = createTimeSlot(from: date)
                    timeSlots.append(timeSlot)
                }
            }
        }
        
        if calendar.isDateInToday(currentDay) {
            let now = Date()
            let currentHour = calendar.component(.hour, from: now)
            let currentMinute = calendar.component(.minute, from: now)
            
            timeSlots = timeSlots.filter { timeSlot in
                if timeSlot.time.hour > currentHour {
                    return true
                } else if timeSlot.time.hour == currentHour {
                    return timeSlot.time.minute >= currentMinute
                }
                return false
            }
        }
        
        if let timeStart = timeTechBreak.timeStart {
            timeSlots = timeSlots.filter { timeSlot in
                return !(
                    timeSlot.time.hour == timeStart.hour && timeSlot.time.minute < timeStart.minute
                )
            }
        }

        return timeSlots
    }
    
    private func createDate(hour: Int, minute: Int) -> Date? {
        var components = calendar.dateComponents([.year, .month, .day], from: currentDay)
        components.hour = hour
        components.minute = minute
        components.second = 0
        return calendar.date(from: components)
    }
    
    private func createTimeSlot(from date: Date) -> TimeSlot {
        let hour = calendar.component(.hour, from: date)
        let minute = calendar.component(.minute, from: date)
        let localTime = LocalTime(hour: hour, minute: minute, second: 0)
        
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        let displayTime = formatter.string(from: date)
        
        return TimeSlot(time: localTime, displayTime: displayTime)
    }
}
