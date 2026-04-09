import Foundation
import SnapKit

final class LocalEventBottomView: UIView {
    
    private var connectEventAction: EmptyClosure?
    
    private let gradiendLayer = CAGradientLayer()
    
    private let connectEventButton = UIButton()
    private let eventButton = MainButton()
    
    private let buttonTitleLabel = UILabel()
    private let buttonDescriptionLabel = UILabel()
    
    private var stateView: StateView? {
        willSet {
            guard let newValue else { return }
            updateView(with: newValue)
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override var bounds: CGRect {
        willSet {
            guard !newValue.isEmpty else { return }
            gradiendLayer.frame = newValue
        }
    }
}

// MARK: - Private -
private extension LocalEventBottomView {
    func setupUI() {
        isUserInteractionEnabled = true
        
        setupGradiendLayer()
        setupConnectEventButton()
        setupEventButton()
        
        setupDescriptionLabel()
        setupButtonTitleLabel()
    }
    
    func setupConnectEventButton() {
        connectEventButton.layer.cornerRadius = 8
        connectEventButton.layer.borderWidth = 3.scaleIfNeeded()
        connectEventButton.layer.borderColor = Color.borderConnectEventColor()!.cgColor
        
        connectEventButton.setTitle(Localizable.howToJoin(), for: .normal)
        connectEventButton.setTitleColor(Color.textConnectEventColor(), for: .normal)
        connectEventButton.titleLabel?.font = Font.dinRoundProBold(size: 22.scaleIfNeeded())
        connectEventButton.addTarget(self, action: #selector(connectEventButtonTap), for: .touchUpInside)
        
        addSubview(connectEventButton)
        connectEventButton.snp.makeConstraints {
            $0.top.equalToSuperview().inset(67.scaleIfNeeded())
            $0.bottom.equalToSuperview().inset(43.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.height.equalTo(58.scaleIfNeeded())
        }
    }
    
    func setupEventButton() {
        addSubview(eventButton)
        eventButton.snp.makeConstraints {
            $0.top.equalToSuperview().inset(67.scaleIfNeeded())
            $0.bottom.equalToSuperview().inset(43.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.height.equalTo(58.scaleIfNeeded())
        }
    }
    
    func setupGradiendLayer() {
        gradiendLayer.colors = [
            Color.background()!.withAlphaComponent(0).cgColor,
            Color.background()!.withAlphaComponent(1).cgColor
        ]
        
        gradiendLayer.locations = [0, 0.3]
            self.layer.addSublayer(self.gradiendLayer)
    }
    
    func setupDescriptionLabel() {
        buttonDescriptionLabel.font = Font.dinRoundProBold(size: 14.scaleIfNeeded())
        
        eventButton.addSubview(buttonDescriptionLabel)
        buttonDescriptionLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(7.scaleIfNeeded())
            $0.centerX.equalToSuperview()
            $0.height.equalTo(18.scaleIfNeeded())
        }
    }
    
    func setupButtonTitleLabel() {
        buttonTitleLabel.font = Font.dinRoundProBold(size: 20.scaleIfNeeded())

        eventButton.addSubview(buttonTitleLabel)
        buttonTitleLabel.snp.makeConstraints {
            $0.bottom.equalToSuperview().inset(9.scaleIfNeeded())
            $0.centerX.equalToSuperview()
        }
    }
    
    func updateView(with state: StateView) {
        switch state {
            case .canTakeReward:
                buttonDescriptionLabel.textColor = Color.takeRewardButtonColor()?.withAlphaComponent(0.6)
                buttonTitleLabel.textColor = Color.takeRewardButtonColor()
            case .rewardHasBeenTaken:
                buttonDescriptionLabel.textColor = Color.takenRewardButtonColor()
                buttonTitleLabel.textColor = Color.takenRewardButtonColor()
            default: break
        }
        
        eventButton.isHidden = state == .canConnect
        eventButton.setEnable(isEnabled: state == .canTakeReward)
        connectEventButton.isHidden = state != .canConnect
    }
    
    @objc func connectEventButtonTap() {
        connectEventAction?()
    }
}

// MARK: - StateView -
extension LocalEventBottomView {
    enum StateView {
        case canConnect
        case participant
        case canTakeReward
        case rewardHasBeenTaken
    }
}

// MARK: - Public -
extension LocalEventBottomView {
    func updateBottomView(with state: LocalEventBottomView.StateView,
                          description: String?,
                          title: String?)  {
        stateView = state
        
        if state == .participant {
            eventButton.configure(title: title)
            eventButton.setCustomColors(
                textColor: Color.commonText(),
                backgroundColor: Color.yourInPlaceRewardButtonColor(),
                for: .disabled)
        }
        
        if state == .canTakeReward {
            buttonTitleLabel.text = title
            buttonDescriptionLabel.text = description
        }
        
        if state == .rewardHasBeenTaken {
            buttonTitleLabel.text = title
            buttonDescriptionLabel.text = description
        }
    }
    
    func setConnectEventAction(_ action: @escaping EmptyClosure) {
        self.connectEventAction = action
    }
    
    func setEventButtonAction(_ action: @escaping EmptyClosure) {
        eventButton.setActionButton(action)
    }
    
    func updateBottomButton(isEnabled: Bool) {
        eventButton.setEnable(isEnabled: isEnabled)
    }
}
