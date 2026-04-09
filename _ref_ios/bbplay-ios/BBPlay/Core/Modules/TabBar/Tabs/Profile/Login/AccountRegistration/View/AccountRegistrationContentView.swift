import Foundation
import SnapKit

final class AccountRegistrationContentView: UIView {
    
    private var termsOfUseAction: EmptyClosure?
    private var textFieldAction: ((ValidationModel) -> Void)?
    private var registrationAction: ((RegistrationModel) -> Void)?

    private lazy var scrollView: UIScrollView = {
        let view = UIScrollView(frame : .zero)
        view.frame = self.bounds
        view.contentInsetAdjustmentBehavior = .never
        view.alwaysBounceVertical = true
        view.isScrollEnabled = false
        view.contentSize = CGSize(width: self.frame.width,
                                  height: self.frame.height + 400)
        
        return view
    }()

    private let scrollViewDelegate = RegistrationScrollViewDelegate()

    private let conteinerView = UIView()

    private let titleLabel = UILabel()
    private let topMaskContainer = UIView()
    private let topMaskLayer = CAGradientLayer()
    private let bottomMaskContainer = UIView()
    private let bottomMaskLayer = CAGradientLayer()
    
    private let fieldsScrollView = UIScrollView()

    private let fieldsContainer = UIStackView()
    private let nicknameTextField = MainTextField()
    private let phoneTextField = PhoneTextField()
    private let nameTextField = MainTextField()
    private let mailTextField = MainTextField()
    private let invalidMailLabel = UILabel()
    private let surnameTextField = MainTextField()
    private let dateOfBirthTextField = DateTextField()
    private let passwordTextField = MainTextField()

    private let checkBoxContainer = UIStackView()
    private let checkBoxView = CheckBoxView()
    private let termsOfUseLabel = UILabel()
    
    private let bottomContainer = BottomContainerView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        scrollView.delegate = scrollViewDelegate
        setupUI()
        setupAction()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func setupUI() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(hideTextField))
        addGestureRecognizer(tap)
        isUserInteractionEnabled = true
        backgroundColor = Color.background()
        
        setupTitleLabel()
        setupBottomContainer()

        setupFiewldScrollView()
        setupFieldsContainer()
        
        setupDownMaskContainer()
        setupTopMaskContainer()
        
        setupNicknameTextField()
        setupPhoneTextField()
        setupMailTextField()
        setupInvalidMailLabel()
        setupNameTextField()
        setupSurnameTextField()
        setupDateOfBirthTextField()
        setupPasswordTextField()
        setupCheckBoxContainer()
        setupCheckBoxView()
        setupTermsOfUseLabel()
    }

}

// MARK: - Private Extension -

private extension AccountRegistrationContentView {

    func setupTopMaskContainer() {
        topMaskLayer.colors = [Color.background()?.withAlphaComponent(1).cgColor ?? UIColor.clear,
                            Color.background()?.withAlphaComponent(0).cgColor ?? UIColor.clear]
        topMaskLayer.frame = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 35.scale())
        
        topMaskContainer.alpha = 0
        topMaskContainer.isUserInteractionEnabled = false
        topMaskContainer.layer.addSublayer(topMaskLayer)
        fieldsScrollView.addSubview(topMaskContainer)
        
        topMaskContainer.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview()
            $0.height.equalTo(35.scale())
        }
    }
    
    func setupDownMaskContainer() {
        bottomMaskLayer.colors = [
            Color.background()?.withAlphaComponent(0).cgColor ?? UIColor.clear,
            Color.background()?.withAlphaComponent(1).cgColor ?? UIColor.clear
        ]
        bottomMaskLayer.frame = CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 35.scale())
        
        bottomMaskContainer.alpha = 1
        bottomMaskContainer.isUserInteractionEnabled = false
        bottomMaskContainer.layer.addSublayer(bottomMaskLayer)
        
        fieldsScrollView.addSubview(bottomMaskContainer)
        
        bottomMaskContainer.snp.makeConstraints {
            $0.bottom.equalTo(bottomContainer.snp.top).offset(-24.scale())
            $0.left.right.equalToSuperview()
            $0.height.equalTo(50.scale())
        }
    }
    
    @objc func hideTextField() {
        nicknameTextField.resignFirstResponder()
        phoneTextField.resignFirstResponder()
        nameTextField.resignFirstResponder()
        surnameTextField.resignFirstResponder()
        dateOfBirthTextField.resignFirstResponder()
        passwordTextField.resignFirstResponder()
    }
    
    @objc func termsOfUseLabelTap() {
        termsOfUseAction?()
    }
    
    @objc func toggleCheckBox() {
        checkBoxView.update(
            state: checkBoxView.currentState == .active ? .inactive : .active
        )
        actionTextInput()
    }

    func setupAction() {
        scrollViewDelegate.setTopActionHide { [weak self] in
            UIView.animate(withDuration: 0.2) {
                self?.topMaskContainer.alpha = 0
            }
        }
        
        scrollViewDelegate.setTopActionShow { [weak self] in
            UIView.animate(withDuration: 0.2) {
                self?.topMaskContainer.alpha = 1
            }
        }
        
        scrollViewDelegate.setBottomActionHide { [weak self] in
            UIView.animate(withDuration: 0.2) {
                self?.bottomMaskContainer.alpha = 1
            }
        }
        
        scrollViewDelegate.setBottomActionShow { [weak self] in
            UIView.animate(withDuration: 0.2) {
                self?.bottomMaskContainer.alpha = 0
            }
        }

        bottomContainer.setRegistrationAction { [weak self] in
            guard let self else { return }
            self.registrationAction?(
                .init(
                    nickname: self.nicknameTextField.text,
                    phone: self.phoneTextField.text,
                    email: self.mailTextField.text,
                    name: self.nameTextField.text,
                    surname: self.surnameTextField.text,
                    date: self.dateOfBirthTextField.text,
                    password: self.passwordTextField.text
                )
            )
        }
    }

    func scrollContent() {
        switch passwordTextField.getState() {
        case .active:
            fieldsScrollView.setContentOffset(CGPoint(x: 0, y: 221.scale()), animated: true)
        default:
            break
        }
        switch dateOfBirthTextField.getState() {
        case .active:
            fieldsScrollView.setContentOffset(CGPoint(x: 0, y: 221.scale()), animated: true)
        default:
            break
        }
        switch surnameTextField.getState() {
        case .active:
            fieldsScrollView.setContentOffset(CGPoint(x: 0, y: 0), animated: true)
        default:
            break
        }
    }
    
    func setupTitleLabel() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(hideTextField))
        
        titleLabel.addGestureRecognizer(tap)
        titleLabel.isUserInteractionEnabled = true
        titleLabel.font = Font.dinRoundProBold(size: 28.scale())
        titleLabel.text = Localizable.newAccount()
        
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(104.scale())
            $0.left.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupBottomContainer() {
        addSubview(bottomContainer)
        bottomContainer.snp.makeConstraints {
            $0.right.left.equalToSuperview()
            $0.bottom.equalToSuperview().inset(34.scale() + UIView.safeAreaBottom)
        }
    }

    func setupFiewldScrollView() {
        fieldsScrollView.delegate = scrollViewDelegate
        fieldsScrollView.showsVerticalScrollIndicator = false
        
        addSubview(fieldsScrollView)
        fieldsScrollView.snp.makeConstraints {
            $0.left.right.equalToSuperview()
            $0.top.equalTo(titleLabel.snp.bottom).offset(24.scale())
            $0.bottom.equalTo(bottomContainer.snp.top).offset(-40.scale())
        }
    }
    
    func setupFieldsContainer() {
        fieldsContainer.axis = .vertical
        fieldsContainer.spacing = 16.scale()
        
        fieldsScrollView.addSubview(fieldsContainer)
        fieldsContainer.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.left.equalToSuperview().inset(24.scale())
            $0.centerX.equalToSuperview()
        }
    }
    
    func setupNicknameTextField() {
        fieldsContainer.addArrangedSubview(nicknameTextField)

        nicknameTextField.configure(with: Localizable.nickname(), type: .nickname)
        nicknameTextField.setDelegate(self)
        nicknameTextField.snp.makeConstraints {
            $0.left.right.equalToSuperview()
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupPhoneTextField() {
        fieldsContainer.addArrangedSubview(phoneTextField)
        
        phoneTextField.configure(with: Localizable.phone(), type: .phoneNumber)
        phoneTextField.setDelegate(self)
        phoneTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
        }
    }

    func setupMailTextField() {
        fieldsContainer.addArrangedSubview(mailTextField)
        mailTextField.configure(with: Localizable.email(), type: .mail)
        
        mailTextField.setDelegate(self)
        mailTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
        }
    }

    func setupInvalidMailLabel() {
        fieldsContainer.addArrangedSubview(invalidMailLabel)

        invalidMailLabel.text = Localizable.invalidEmailAddress()
        invalidMailLabel.font = Font.dinRoundProMedi(size: 20.scale())
        invalidMailLabel.textColor = Color.incorrectText()
        invalidMailLabel.isHidden = true
        invalidMailLabel.snp.makeConstraints {
            $0.horizontalEdges.equalToSuperview().inset(19.scale())
            $0.height.equalTo(22.scale())
        }
    }
    
    func setupNameTextField() {
        fieldsContainer.addArrangedSubview(nameTextField)
        
        nameTextField.configure(with: Localizable.name(), type: .name)
        nameTextField.setDelegate(self)
        nameTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupSurnameTextField() {
        fieldsContainer.addArrangedSubview(surnameTextField)
        
        surnameTextField.configure(with: Localizable.surname(), type: .surname)
        surnameTextField.setDelegate(self)
        surnameTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupDateOfBirthTextField() {
        fieldsContainer.addArrangedSubview(dateOfBirthTextField)
        
        dateOfBirthTextField.configure(with: Localizable.dateOfBirth(), type: .dateOfBirth)
        dateOfBirthTextField.setDelegate(self)
        dateOfBirthTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupPasswordTextField() {
        fieldsContainer.addArrangedSubview(passwordTextField)
        
        passwordTextField.configure(with: Localizable.password(), type: .password)
        passwordTextField.setDelegate(self)
        passwordTextField.snp.makeConstraints {
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupCheckBoxContainer() {
        checkBoxContainer.isUserInteractionEnabled = true
        checkBoxContainer.spacing = 12
        checkBoxContainer.axis = .horizontal
        checkBoxContainer.alignment = .center
        
        fieldsContainer.addArrangedSubview(checkBoxContainer)
        checkBoxContainer.snp.makeConstraints {
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupCheckBoxView() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(toggleCheckBox))
        
        checkBoxView.addGestureRecognizer(tap)
        checkBoxView.layer.cornerRadius = 16

        checkBoxContainer.addArrangedSubview(checkBoxView)
        checkBoxView.snp.makeConstraints {
            $0.height.width.equalTo(32.scale())
        }

        checkBoxView.update(state: .active)
    }
    
    func setupTermsOfUseLabel() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(termsOfUseLabelTap))
        
        let underlineText = Localizable.termsOnUseUnderline()
        let text = Localizable.termsOnUseBase(underlineText)
        let rangeUnderline = NSMutableAttributedString(string: text).mutableString.range(of: underlineText)
        
        let attributedText = NSMutableAttributedString(
            string: text,
            attributes: [
                .font: Font.dinRoundProBold(size: 16.scale())!,
                .foregroundColor: Color.commonText()!,
            ])
        attributedText.addAttributes(
            [
                .underlineStyle: NSUnderlineStyle.single.rawValue
            ],
            range: rangeUnderline
        )
        
        termsOfUseLabel.addGestureRecognizer(tap)
        termsOfUseLabel.isUserInteractionEnabled = true
        termsOfUseLabel.attributedText = attributedText
        termsOfUseLabel.numberOfLines = 2
        
        checkBoxContainer.addArrangedSubview(termsOfUseLabel)
        checkBoxView.snp.makeConstraints {
            $0.size.equalTo(32.scale())
        }
    }

}

// MARK: - Actions -

extension AccountRegistrationContentView {
    
    func updateScrollPosition() {
        scrollContent()
    }
    
    func resetScrollPosition() {
        scrollView.setContentOffset(CGPoint(x: 0, y: 0), animated: true)
    }
    
    func setLoginAction(_ action: @escaping EmptyClosure) {
        bottomContainer.setLoginAction(action)
    }

    func setRegistrationAction(_ action: @escaping ((RegistrationModel) -> Void)) {
        self.registrationAction = action
    }
    
    func setTextFieldAction(_ action: @escaping ((ValidationModel) -> Void)) {
        self.textFieldAction = action
    }
    
    func setTermsOfUseAction(_ action: @escaping EmptyClosure) {
        self.termsOfUseAction = action
    }

    func updateButton(_ isEnabled: Bool) {
        bottomContainer.updateButton(isEnabled)
    }
}

// MARK: - MainTextFieldDelegate -

extension AccountRegistrationContentView: MainTextFieldDelegate {

    func actionTextInput() {
        textFieldAction?(
            .init(
                nickname: nicknameTextField.text,
                phone: phoneTextField.text,
                email: mailTextField.text,
                name: nameTextField.text,
                surname: surnameTextField.text,
                date: dateOfBirthTextField.text,
                password: passwordTextField.text,
                checkBoxIsActive: checkBoxView.currentState == .active
            )
        )
    }

    func chagedState(
        _ type: MainTextField.TextFieldType,
        state: MainTextField.TextFieldState
    ) {
        switch type {
            case .mail:
                let spacing = state == .incorrect ? 4 : 16
                invalidMailLabel.isHidden = state != .incorrect
                fieldsContainer.setCustomSpacing(spacing.scale(), after: mailTextField)
                fieldsContainer.layoutIfNeeded()
            default:
                return
        }
    }

}

// MARK: - ValidationModel -

extension AccountRegistrationContentView {

    struct ValidationModel {
        let nickname: String?
        let phone: String?
        let email: String?
        let name: String?
        let surname: String?
        let date: String?
        let password: String?
        let checkBoxIsActive: Bool
    }

}

// MARK: - RegistrationModel -

extension AccountRegistrationContentView {

    struct RegistrationModel {
        let nickname: String?
        let phone: String?
        let email: String?
        let name: String?
        let surname: String?
        let date: String?
        let password: String?
    }
    
}
