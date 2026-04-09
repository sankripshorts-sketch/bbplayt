import Foundation

protocol DatePickerPresenter {
    func setView(_ view: DatePickerView)
    func onViewDidLoad()
    func continueButtonTapped(with date: Int)
    func onViewDidLayoutSubviews()
}
