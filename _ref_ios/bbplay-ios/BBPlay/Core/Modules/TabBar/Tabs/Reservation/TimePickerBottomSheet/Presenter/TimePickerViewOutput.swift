import Foundation

protocol TimePickerViewOutput {
    func setViewInput(_ viewInput: TimePickerViewInput)
    func onViewDidLoad()
    func onViewDidLayoutSubviews()
    func didSelectTime(at index: Int)
    func didSelectProduct(at index: Int)
    func confirmSelection()
    func cancelSelection()
}
