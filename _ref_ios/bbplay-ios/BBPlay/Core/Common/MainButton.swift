import Foundation
import SnapKit

final class MainButton: UIView {
    
    private var actionButton: EmptyClosure?
    private let button = UIButton()
    
    private var activeButtonColor = Color.activeGreenButton() {
        didSet {
            layoutSubviews()
        }
    }
    
    private var inactiveButtonColor = Color.inactiveGreenButton() {
        didSet {
            layoutSubviews()
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupRecognizer()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        button.backgroundColor = button.isEnabled ? activeButtonColor : inactiveButtonColor
    }

    private func setupUI() {
        button.titleLabel?.font = Font.dinRoundProBold(size: 22.scale())
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.titleLabel?.minimumScaleFactor = 0.6
        button.setTitleColor(Color.activeButtonText(), for: .normal)
        button.setTitleColor(Color.inactiveButtonText(), for: .disabled)
        button.layer.cornerRadius = 8
        
        addSubview(button)
        button.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    private func setupRecognizer() {
        let tap = UILongPressGestureRecognizer(target: self, action: #selector(buttonLongTap))
        tap.minimumPressDuration = 0.01
        button.addGestureRecognizer(tap)
    }

    func configure(title: String?) {
        button.setTitle(title, for: .normal)
    }

    func setCorners(masks: CACornerMask) {
        button.layer.maskedCorners = masks
    }
    
    func setCustomColors(textColor: UIColor? = nil,
                         backgroundColor: UIColor? = nil,
                         for state: UIControl.State) {
        button.setTitleColor(textColor, for: state)
        
        switch state {
            case .normal: activeButtonColor = backgroundColor
            case .disabled: inactiveButtonColor = backgroundColor
            default: logger.warning("New background color don't set to UIButton")
        }
    }

    func setEnable(isEnabled: Bool) {
        button.isEnabled = isEnabled
        layoutSubviews()
    }
    
    func setEnableWithoutBackgroundUpdate(isEnabled: Bool) {
        button.isEnabled = isEnabled
    }
    
    func setActionButton(_ action: @escaping EmptyClosure) {
        actionButton = action
    }
    
    func setActionButton(_ action: EmptyClosure?) {
        actionButton = action
    }
    
    @objc private func buttonLongTap(_ sender: UIGestureRecognizer) {
        if sender.state == .began {
            self.alpha = 0.7
        }
        else if sender.state == .ended {
            self.alpha = 1
            self.actionButton?()

        }
        else if sender.state == .cancelled || sender.state == .failed {
            self.alpha = 1
        }
    }
}
