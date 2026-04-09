import Foundation
import SnapKit

final class BookingStatusView: UIView {
    private let icon = UIView()
    private let label = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    func setupStatusView(with status: ComputerStatus) {
        let color: UIColor
        let text: String
        let layerColor: UIColor?

        switch status {
            case .free:
                color = Color.bookingStatusText()!
                text = Localizable.statusFree()
                layerColor = nil
            case .busy:
                color = .clear
                text = Localizable.statusBusy()
                layerColor = Color.bookingStatusText()!
            case .selected:
                color = Color.selectedCell()!
                text = Localizable.statusSelected()
                layerColor = nil
            case .unavailable:
                color = Color.unavailablePc()!
                text = Localizable.statusUnavailable()
                layerColor = nil
        }

        setupStatusView(
            backgroundColor: color,
            text: text,
            layerColor: layerColor
        )
    }
}

// MARK: - Private -
private extension BookingStatusView {
    func setupUI() {
        setupIcon()
        setupLabel()
    }
    
    func setupIcon() {
        icon.layer.cornerRadius = 4
        addSubview(icon)
        
        icon.snp.makeConstraints {
            $0.left.equalToSuperview()
            $0.top.bottom.equalToSuperview().inset(6.scale())
            $0.size.equalTo(12.scale())
        }
    }
    
    func setupLabel() {
        label.font = Font.dinRoundProBold(size: 12.scale())
        label.numberOfLines = 1
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.5
        label.textColor = Color.bookingStatusText()
        addSubview(label)
        
        label.snp.makeConstraints {
            $0.left.equalTo(icon.snp.right).offset(4.scale())
            $0.right.equalToSuperview()
            $0.centerY.equalTo(icon.snp.centerY)
        }
    }
    
    func setupStatusView(
        backgroundColor: UIColor,
        text: String,
        layerColor: UIColor? = nil
    ) {
        if let layerColor {
            setupViewFromLayer(
                backgroundColor: backgroundColor,
                text: text,
                layerColor: layerColor
            )
        } else {
            setupViewFromWithoutLayer(
                backgroundColor: backgroundColor,
                text: text
            )
        }
    }
    
    func setupViewFromWithoutLayer(
        backgroundColor: UIColor,
        text: String
    ) {
        icon.backgroundColor = backgroundColor
        label.text = text
    }
    
    func setupViewFromLayer(
        backgroundColor: UIColor,
        text: String,
        layerColor: UIColor
    ) {
        icon.layer.borderWidth = 2
        icon.layer.borderColor = layerColor.cgColor
        icon.backgroundColor = backgroundColor
        label.text = text
    }
}
