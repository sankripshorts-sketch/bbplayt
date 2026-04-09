import Foundation

protocol TimeStorage {
    func saveSelectedTime(time: LocalTime?)
    func restoreSelectedTime() -> LocalTime?
}
