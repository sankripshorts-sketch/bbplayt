import Foundation
import UIKit
import SnapKit

extension ReservationView {
    final class TopContainer: UIView {
        private let selectClubView = SelectedView()
        private let selectDateView = SelectedView()
        private let selectTimeView = SelectedView()
        private let extendedSearchView = ExtendedSearchView()
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init?(coder: NSCoder) { nil }
        
        func setSelectClubAction(_ action: @escaping EmptyClosure) {
            selectClubView.setAction(action)
        }
        
        func setSelectDateAction(_ action: @escaping EmptyClosure) {
            selectDateView.setAction(action)
        }
        
        func setSelectTimeAction(_ action: @escaping EmptyClosure) {
            selectTimeView.setAction(action)
        }
        
        func updateSelectClubView(with adress: String) {
            selectClubView.updateView(with: adress)
        }
        
        func updateSelectDateView(with selectedDay: String) {
            selectDateView.updateView(with: selectedDay)
        }
        
        func updateSelectTimeView(with selectedTime: String) {
            selectTimeView.updateView(with: selectedTime)
        }
        
        func updateStateClubView(with state: SelectedView.ViewState) {
            selectClubView.updateStateView(with: state)
        }
        
        func updateStateDateView(with state: SelectedView.ViewState) {
            selectDateView.updateStateView(with: state)
        }
        
        func updateStateTimeView(with state: SelectedView.ViewState) {
            selectTimeView.updateStateView(with: state)
        }
        
        func updateExtendedSearchView(with state: ExtendedSearchView.State) {
            extendedSearchView.update(state: state)
        }
        
        func setExtendedSearchQuestionMarkAction(
            _ action: @escaping EmptyClosure
        ) {
            extendedSearchView.setQuestionMarkAction(action)
        }
        
        func setExtendedSearchSelectionAction(
            _ action: @escaping EmptyClosure
        ) {
            extendedSearchView.setSelectionAction(action)
        }
        
        private func setupAppearance() {
            selectClubView.setup(with: .club)
            addSubview(selectClubView)
            selectClubView.snp.makeConstraints {
                $0.top.horizontalEdges.equalToSuperview()
                $0.height.equalTo(58.scale())
            }
            
            selectDateView.setup(with: .date)
            addSubview(selectDateView)
            selectDateView.snp.makeConstraints {
                $0.top.equalTo(selectClubView.snp.bottom).offset(16.scale())
                $0.horizontalEdges.equalToSuperview()
                $0.height.equalTo(58.scale())
            }
            
            selectTimeView.setup(with: .time)
            addSubview(selectTimeView)
            selectTimeView.snp.makeConstraints {
                $0.top.equalTo(selectDateView.snp.bottom).offset(16.scale())
                $0.horizontalEdges.equalToSuperview()
                $0.height.equalTo(58.scale())
            }
            
            addSubview(extendedSearchView)
            extendedSearchView.snp.makeConstraints {
                $0.top.equalTo(selectTimeView.snp.bottom).offset(16.scale())
                $0.horizontalEdges.equalToSuperview()
                $0.bottom.equalToSuperview()
            }
        }
    }
}
