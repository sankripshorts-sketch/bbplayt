import Foundation
import SnapKit

final class LoginViewImpl: UIView {
    
    private var registrationAction: EmptyClosure?
    private var recoveryPasswordAction: EmptyClosure?
    private var backgroundActionTap: EmptyClosure?
    private var loginAction: ((String, String) -> Void)?
    private var validateAction: ((String, String) -> Void)?
    
    private let scrollView =  UIScrollView()
    
    private let logo = UIImageView()
    private let textFieldContainer = UIStackView()
    private let nicknameTextField = MainTextField()
    private let passwordTextField = MainTextField()
    private let forgotPasswordLabel = UILabel()
    private let loginButton = MainButton()
    private let labelContainer = UIStackView()
    private let questionLabel = UILabel()
    private let createAccountLabel = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupAction()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }

    private func setupUI() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(backgroundTap))
        addGestureRecognizer(tap)
        backgroundColor = Color.background()
        
        setupLogo()
        
        setupScrollView()
        setupTextFieldContainer()
        setupNicknameTextField()
        setupPasswordTextField()
        setupForgotPasswordLabel()
        setupLoginButton()
        setupLabelContainer()
        setupQuestionLabel()
        setupCreateAccountLabel()
    }

    
    private func setupLogo() {
        logo.image = Image.logo()
        
        addSubview(logo)
        
        logo.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(73.scaleIfNeeded())
            $0.top.equalToSuperview().inset(115.scale())
            $0.height.equalTo(96.scaleIfNeeded())

        }
    }
    
    private func setupScrollView() {
        scrollView.isScrollEnabled = false
        scrollView.isUserInteractionEnabled = true
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.alwaysBounceVertical = true
        scrollView.backgroundColor = .clear
        addSubview(scrollView)
        
        scrollView.snp.makeConstraints {
            $0.top.equalToSuperview().offset(200.scale())
            $0.left.right.equalToSuperview()
            $0.height.equalTo(432.scale())
        }
    }
    
    private func setupTextFieldContainer() {
        textFieldContainer.axis = .vertical
        textFieldContainer.alignment = .trailing
        textFieldContainer.spacing = 16.scale()
        
        scrollView.addSubview(textFieldContainer)
        textFieldContainer.snp.makeConstraints {
            $0.top.equalTo(scrollView.contentLayoutGuide.snp.top).inset(175.scale())
            $0.left.equalTo(scrollView.contentLayoutGuide.snp.left).inset(24.scale())
            $0.right.equalTo(scrollView.contentLayoutGuide.snp.right).inset(24.scale())
            $0.centerX.equalToSuperview()
        }
    }
    
    private func setupNicknameTextField() {
        nicknameTextField.configure(
            with: Localizable.nickname(),
            type: .nickname)
        nicknameTextField.setDelegate(self)

        textFieldContainer.addArrangedSubview(nicknameTextField)
        
        nicknameTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    private func setupPasswordTextField() {
        passwordTextField.configure(
            with: Localizable.password(),
            type: .password)
        passwordTextField.setDelegate(self)

        textFieldContainer.addArrangedSubview(passwordTextField)
        passwordTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    private func setupForgotPasswordLabel() {
        forgotPasswordLabel.isUserInteractionEnabled = true
        forgotPasswordLabel.attributedText = NSAttributedString(
            string: Localizable.forgotPassword(),
            attributes: [
                .font: Font.dinRoundProMedi(size: 16.scale())!,
                .foregroundColor: Color.commonText()!,
                .underlineStyle: NSUnderlineStyle.single.rawValue,
                .underlineColor: Color.commonText()!
            ])
        
        textFieldContainer.addArrangedSubview(forgotPasswordLabel)
        textFieldContainer.setCustomSpacing(4.scale(), after: passwordTextField)
        
        forgotPasswordLabel.snp.makeConstraints {
            $0.height.equalTo(24.scale())
            $0.right.equalToSuperview()
        }
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(questionLabelTap))
        forgotPasswordLabel.addGestureRecognizer(tap)
    }

    private func setupLoginButton() {
        loginButton.configure(title: Localizable.login())
        loginButton.setEnable(isEnabled: false)

        scrollView.addSubview(loginButton)
        loginButton.snp.makeConstraints {
            $0.height.equalTo(58.scale())
            $0.top.equalTo(textFieldContainer.snp.bottom).offset(32.scale())
            $0.bottom.equalTo(scrollView.contentLayoutGuide.snp.bottom).inset(5.scale())
            $0.left.equalTo(scrollView.contentLayoutGuide.snp.left).inset(24.scale())
            $0.right.equalTo(scrollView.contentLayoutGuide.snp.right).inset(24.scale())
        }
    }

    private func setupLabelContainer() {
        labelContainer.isUserInteractionEnabled = true
        labelContainer.spacing = 9
        labelContainer.axis = .horizontal
        labelContainer.alignment = .fill
        
        addSubview(labelContainer)
        labelContainer.snp.makeConstraints {
            $0.top.equalTo(scrollView.snp.bottom).offset(27.scale())
            $0.height.equalTo(26.scale())
            $0.centerX.equalToSuperview()
        }
    }

    private func setupQuestionLabel() {
        questionLabel.textColor = Color.commonText()
        questionLabel.font = Font.dinRoundProBold(size: 16.scale())
        questionLabel.text = Localizable.noAccount()

        labelContainer.addArrangedSubview(questionLabel)
        questionLabel.snp.makeConstraints {
            $0.height.equalTo(26.scale())
        }
    }

    private func setupCreateAccountLabel() {
        createAccountLabel.isUserInteractionEnabled = true
        createAccountLabel.attributedText = NSAttributedString(
            string: Localizable.create(),
            attributes: [
                .font: Font.dinRoundProBold(size: 16.scale())!,
                .foregroundColor: Color.greenText()!,
                .underlineStyle: NSUnderlineStyle.single.rawValue,
                .underlineColor: Color.greenText()!
            ])
    
        labelContainer.addArrangedSubview(createAccountLabel)
        questionLabel.snp.makeConstraints {
            $0.height.equalTo(26.scale())
        }
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(registrationButtonTap))
        createAccountLabel.addGestureRecognizer(tap)
    }
    
    private func logoReduction() {
        logo.snp.updateConstraints {
            $0.left.right.equalToSuperview().inset(112.scaleIfNeeded())
            $0.top.equalToSuperview().inset(68.scale())
            $0.height.equalTo(59.scaleIfNeeded())
        }
        layoutIfNeeded()
    }
    
    private func logoEnlargement() {
        logo.snp.updateConstraints {
            $0.left.right.equalToSuperview().inset(73.scaleIfNeeded())
            $0.top.equalToSuperview().inset(115.scale())
            $0.height.equalTo(96.scaleIfNeeded())
        }
        layoutIfNeeded()
    }
    
    @objc private func registrationButtonTap() {
        registrationAction?()
    }
    
    @objc private func questionLabelTap() {
        recoveryPasswordAction?()
    }
    
    @objc private func backgroundTap() {
        resignResponders()
    }
}

extension LoginViewImpl {
    func resignResponders() {
        nicknameTextField.resignFirstResponder()
        passwordTextField.resignFirstResponder()
    }
    
    func updateButton(_ isEnabled: Bool) {
        loginButton.setEnable(isEnabled: isEnabled)
        loginButton.layoutSubviews()
    }
    
    func contentUp() {
        scrollView.setContentOffset(CGPoint(x: 0, y: 170.scale()), animated: true)
        logoReduction()
    }
    
    func contentDown() {
        scrollView.setContentOffset(CGPoint(x: 0, y: 0), animated: true)
        logoEnlargement()
    }
}

// MARK: - Set Actions -
extension LoginViewImpl {
    func setRegistrationAction(_ action: @escaping EmptyClosure) {
        self.registrationAction = action
    }
    
    func setRecoveryPasswordAction(_ action: @escaping EmptyClosure) {
        self.recoveryPasswordAction = action
    }
    
    
    func setBackgroundAction(_ action: @escaping EmptyClosure) {
        self.backgroundActionTap = action
    }
    
    func setLoginAction(_ action: @escaping ((String, String) -> Void)) {
        self.loginAction = action
    }
    
    func setTextFieldValidationAction(_ action: @escaping ((String, String) -> Void)) {
        self.validateAction = action
    }
    
    private func setupAction() {
        loginButton.setActionButton { [weak self] in
            self?.loginAction?(self?.nicknameTextField.text ?? "",
                               self?.passwordTextField.text ?? "")
        }
    }
}

extension LoginViewImpl: MainTextFieldDelegate {
    func actionTextInput() {
        guard let nickname = nicknameTextField.text,
              let password = passwordTextField.text else {
            return
        }

        validateAction?(nickname, password)
    }
}
