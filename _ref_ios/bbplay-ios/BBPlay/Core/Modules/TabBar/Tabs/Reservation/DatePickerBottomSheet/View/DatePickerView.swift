import Foundation

protocol DatePickerView: AnyObject {
    func update(with date: DatePickerPresenterImpl.DatePicker)
    func dimiss(outputModel: DatePickerSelectedData)
    func scroll(to index: Int)
}
