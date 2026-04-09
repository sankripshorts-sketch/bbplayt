import Foundation
import SnapKit

final class SettingsView: UIView {
    private let titleLabel = UILabel()
    private let scrollView = ScrollView()
    private let scrollViewDelegate = SettingsScrollViewDelegate()
    private let buttonsContainer = ButtonsContainer()

    private let topMask = UIView()
    private let topLayer = CAGradientLayer()
    
    private let botMask = UIView()
    private let botLayer = CAGradientLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupAction()
        setupAppearance()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    private func setupAction() {
        scrollViewDelegate.setTopMaskShow { [weak self] in
            self?.topMask.isHidden = false
        }
        
        scrollViewDelegate.setTopMaskHide { [weak self] in
            self?.topMask.isHidden = true
        }
        
        scrollViewDelegate.setBotMaskShow { [weak self] in
            self?.botMask.isHidden = false
        }
        
        scrollViewDelegate.setBotMaskHide { [weak self] in
            self?.botMask.isHidden = true
        }
    }
    
    private func setupAppearance() {
        addGestureRecognizer(
            UITapGestureRecognizer(
                target: self,
                action: #selector(selfTapped)
            )
        )
        backgroundColor = Color.background()

        addSubview(titleLabel)
        addSubview(scrollView)
        addSubview(topMask)
        addSubview(botMask)
        addSubview(buttonsContainer)

        setupTitleLabel()
        setupButtonsContainer()
        setupScrollView()
        setupTopMask()
        setupBotMask()
    }
    
    private func setupTitleLabel() {
        titleLabel.isUserInteractionEnabled = true
        titleLabel.text = Localizable.settings()
        titleLabel.textColor = .white
        titleLabel.font = Font.dinRoundProBold(size: 28.scale())

        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(104.scale())
            $0.left.equalToSuperview().inset(24.scale())
        }
    }
    
    private func setupScrollView() {
        scrollView.delegate = scrollViewDelegate
        scrollView.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(22.scale())
            $0.horizontalEdges.equalToSuperview()
            $0.bottom.equalTo(buttonsContainer.snp.top).offset(-24.scale())
        }
    }

    private func setupButtonsContainer() {
        buttonsContainer.snp.makeConstraints {
            $0.horizontalEdges.equalToSuperview()
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom)
        }
    }

    private func setupTopMask() {
        topLayer.colors = [
            Color.background()!.withAlphaComponent(1).cgColor,
            Color.background()!.withAlphaComponent(0).cgColor
        ]
        topLayer.frame = CGRect(
            x: 0,
            y: 0,
            width: UIScreen.main.bounds.width,
            height: 45.scale()
        )

        topMask.isHidden = true
        topMask.isUserInteractionEnabled = false
        topMask.layer.addSublayer(topLayer)
        
        topMask.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(20.scale())
            $0.horizontalEdges.equalToSuperview()
            $0.height.equalTo(45.scale())
        }
    }
    
    private func setupBotMask() {
        botLayer.colors = [
            Color.background()!.withAlphaComponent(0).cgColor,
            Color.background()!.withAlphaComponent(1).cgColor
        ]
        botLayer.frame = CGRect(
            x: 0,
            y: 0,
            width: UIScreen.main.bounds.width,
            height: 45.scale()
        )
        botMask.isHidden = false
        botMask.isUserInteractionEnabled = false
        botMask.layer.addSublayer(botLayer)
        botMask.snp.makeConstraints {
            $0.bottom.equalTo(buttonsContainer.snp.top).offset(-24.scale())
            $0.left.right.equalToSuperview()
            $0.height.equalTo(45.scale())
        }
    }

    private func moveUpSaveButton() {
        buttonsContainer.moveUpSaveButton(to: scrollView.changePasswordContainer)
        layoutIfNeeded()
    }
    
    private func moveDownSaveButton() {
        buttonsContainer.moveDownSaveButton()
        layoutIfNeeded()
    }

    @objc private func selfTapped() {
        scrollView.changePasswordContainer.hideTextField()
    }
}

// MARK: - Public -
extension SettingsView {
    func setSaveAction(
        _ action: @escaping (
            (_ oldPassword: String?, _ newPassword: String?) -> Void
        )
    ) {
        buttonsContainer.setSavePasswordButtonAction { [weak self] in
            action(
                self?.scrollView.changePasswordContainer.getOldPassword(),
                self?.scrollView.changePasswordContainer.getNewPassword()
            )
        }
    }
    
    func setLogoutAction(_ action: @escaping EmptyClosure) {
        buttonsContainer.setLogoutAction(action)
    }
    
    func setCheckTextFieldAction(_ action: @escaping ((String, String) -> Void)) {
        scrollView.setCheckTextFieldAction(action)
    }
    
    func setRemoveAccountAction(_ action: @escaping EmptyClosure) {
        scrollView.setRemoveAccountAction(action)
    }
    
    func keyboardShow() {
        let offset = 49.scale()
        scrollView.setContentOffset(CGPoint(x: 0, y: -offset), animated: true)
        moveUpSaveButton()
    }

    func keyboardHide() {
        moveDownSaveButton()
        scrollView.setContentOffset(.zero, animated: true)
    }

    func hideContent(isHidden: Bool) {
        scrollView.hidePersonalInfo(isHidden: isHidden)
        buttonsContainer.setVisibleOnlySaveButton(isVisible: !isHidden)
        scrollView.isScrollEnabled = !isHidden
        botMask.isHidden = true
    }
    
    func update(with model: Model) {
        scrollView.update(with: model)
        buttonsContainer.updateVersionLabel(text: model.versionApp)
    }

    func updateSavePasswordButtonState(isEnabled: Bool) {
        buttonsContainer.updateSavePasswordButtonState(isEnabled: isEnabled)
    }

    func clearPasswordFields() {
        scrollView.changePasswordContainer.clearPasswordFields()
    }
}

// MARK: - Model -
extension SettingsView {
    struct Model {
        let nickname: String
        let phone: String
        let mail: String?
        let name: String
        let surname: String
        let dateOfBirth: String
        let versionApp: String?
    }
}
