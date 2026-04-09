import Foundation
import SnapKit

final class ComputerView: UIView {
    
    let pcName: String
    private let computerLabel = UILabel()
    
    private var pcTapAction: StringClosure?
    
    private(set) var computerStatus: ComputerStatus! {
        willSet {
            updateColors(with: newValue)
        }
    }
    
    init(frame: CGRect, model: ComputerView.Model) {
        self.pcName = model.name
        super.init(frame: frame)
        changeComputerStatus(on: model.status)
        setupUI()
        updateView(with: model)
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    func changeComputerStatus(on computerStatus: ComputerStatus) {
        self.computerStatus = computerStatus
    }
    
    func setAction(_ action: @escaping StringClosure) {
        self.pcTapAction = action
    }
}

// MARK: - Private -
private extension ComputerView {
    func setupUI() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(pcTapHandler))
        addGestureRecognizer(tap)
        
        isUserInteractionEnabled = true
        layer.cornerRadius = 4
        setupComputerLabel()
    }
    
    func setupComputerLabel() {
        addSubview(computerLabel)
        computerLabel.snp.makeConstraints {
            $0.center.equalToSuperview()
        }
    }
    
    func updateView(with model: Model) {
        tag = model.name.leaveOnlyNumbers().hash
        
        computerLabel.font = Font.dinRoundProBold(size: model.textSize)
        computerLabel.text = model.name.leaveOnlyNumbers()
    }
    
    func updateColors(with status: ComputerStatus) {
        let textColor: UIColor
        switch status {
            case .free:
                backgroundColor = Color.bookingStatusText()!
                textColor = Color.freePcText()!
            case .busy:
                backgroundColor = .clear
                textColor = Color.bookingStatusText()!
                setupLayer(with: Color.bookingStatusText()!)
            case .selected:
                backgroundColor = Color.selectedPc()!
                textColor = .white
            case .unavailable:
                backgroundColor = Color.unavailablePc()
                textColor = .white
        }
        
        computerLabel.textColor = textColor
    }
    
    func setupLayer(with color: UIColor) {
        layer.borderWidth = 2
        layer.borderColor = color.cgColor
    }

    @objc func pcTapHandler() {
        guard computerStatus != .busy, computerStatus != .unavailable else { return }
        pcTapAction?(pcName)
    }
}

// MARK: - Computer View Model -
extension ComputerView {
    struct Model {
        let status: ComputerStatus
        let name: String
        let textSize: CGFloat
    }
}
