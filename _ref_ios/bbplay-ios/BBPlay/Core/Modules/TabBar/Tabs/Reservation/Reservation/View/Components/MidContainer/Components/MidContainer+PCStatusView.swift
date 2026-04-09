import Foundation
import UIKit
import SnapKit

final class PCStatusView: UIStackView {
    private let statusFree = BookingStatusView()
    private let statusBusy = BookingStatusView()
    private let statusSelected = BookingStatusView()
    private let statusUnavailable = BookingStatusView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupAppearance()
    }

    @available(*, unavailable)
    required init(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupAppearance() {
        distribution = .fillProportionally
        axis = .horizontal
        spacing = 8.scale()

        statusFree.setupStatusView(with: .free)
        addArrangedSubview(statusFree)
        
        statusBusy.setupStatusView(with: .busy)
        addArrangedSubview(statusBusy)
        
        statusSelected.setupStatusView(with: .selected)
        addArrangedSubview(statusSelected)
        
        statusUnavailable.setupStatusView(with: .unavailable)
        addArrangedSubview(statusUnavailable)
    }
}
