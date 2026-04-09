import Foundation
import SnapKit

final class CodeCheckingViewImpl: UIView {
    private var textFieldAction: ((String) -> Void)?
    private var mainButtonAction: ((String) -> Void)?
    private var sendCodeAtion: EmptyClosure?
    
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    
    private let containerView = UIView()
    
    private var fieldContainerView = UIStackView()
    private var textField = CodeTextField()
    
    private var bottomContainerView = UIStackView()
    private var bottomView = UIView()
    
    private let retryCodeSendLabel = UILabel()
    
    private let mainButton = MainButton()
    
    private var keyboardHeight: CGFloat = 0
    
    private var timer: Timer?
    private var formatter = DateFormatter()
    
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
}

// MARK: - Private Extension -
private extension CodeCheckingViewImpl {
    func setupUI() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(hideTextField))
        addGestureRecognizer(tap)

        isUserInteractionEnabled = true
        backgroundColor = Color.background()
        
        setupTitleLabel()
        setupDescriptionLabel()
        
        setupContainerView()
        
        setupMainButton()
        
        setupRetryCodeSendLabel()
        
        setupFieldContainerView()
        setupTextField()
        setupBottomContainerView()
        setupBottomView()
        setupDateFormatter()
    }
    
    @objc func hideTextField() {
        textField.resignFirstResponder()
    }
    
    func setupTitleLabel() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 28.scale()
        paragraphStyle.maximumLineHeight = 28.scale()
        
        titleLabel.attributedText = NSAttributedString(
            string: Localizable.codeCheckingTitle(),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .paragraphStyle: paragraphStyle
            ])
        titleLabel.numberOfLines = 0
        
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(104.scale())
            $0.left.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupDescriptionLabel() {
        descriptionLabel.numberOfLines = 0
        
        addSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).inset(-16.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupContainerView() {
        containerView.isUserInteractionEnabled = true

        addSubview(containerView)
        containerView.snp.makeConstraints {
            $0.bottom.equalToSuperview()
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupMainButton() {
        mainButton.setEnable(isEnabled: false)
        mainButton.configure(title: Localizable.codeCheckingButton())
        
        containerView.addSubview(mainButton)
        mainButton.snp.makeConstraints {
            $0.bottom.equalToSuperview().offset(-76.scale())
            $0.left.right.equalToSuperview()
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupRetryCodeSendLabel() {
        retryCodeSendLabel.attributedText = NSAttributedString(
            string: Localizable.codeCheckingQuestion(),
            attributes: makeStringAttributes())

        let tap = UITapGestureRecognizer(target: self, action: #selector(sendCode))
        retryCodeSendLabel.addGestureRecognizer(tap)
        
        retryCodeSendLabel.isUserInteractionEnabled = true
        retryCodeSendLabel.numberOfLines = 0
        
        containerView.addSubview(retryCodeSendLabel)
        retryCodeSendLabel.snp.makeConstraints {
            $0.bottom.equalTo(mainButton.snp.top).inset(-48.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    func makeStringAttributes() -> [NSAttributedString.Key : Any] {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.maximumLineHeight = 28.scale()
        paragraphStyle.minimumLineHeight = 28.scale()
        paragraphStyle.alignment = .center
        
        return [
            .font: Font.dinRoundProBold(size: 18.scale())!,
            .foregroundColor: R.color.commonText()!,
            .paragraphStyle: paragraphStyle,
            .underlineStyle: true
        ]
    }
    
    func setupFieldContainerView() {
        fieldContainerView.isUserInteractionEnabled = true

        fieldContainerView.spacing = 12
        fieldContainerView.axis = .vertical
        fieldContainerView.alignment = .fill
        fieldContainerView.distribution = .fillProportionally
        
        containerView.addSubview(fieldContainerView)
        fieldContainerView.snp.makeConstraints {
            $0.top.equalToSuperview()
            $0.centerX.equalToSuperview()
            $0.width.equalTo(240.scale())
            $0.bottom.equalTo(retryCodeSendLabel.snp.top).inset(-16.scale())
        }
    }
    
    func setupTextField() {
        textField.setDelegate(self)
        
        fieldContainerView.addArrangedSubview(textField)
        textField.snp.makeConstraints {
            $0.height.equalTo(28.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    func setupBottomContainerView() {
        bottomContainerView.isUserInteractionEnabled = true
        bottomContainerView.axis = .horizontal
        bottomContainerView.distribution = .fillProportionally
        bottomContainerView.spacing = 16
        
        fieldContainerView.addArrangedSubview(bottomContainerView)
        bottomContainerView.snp.makeConstraints {
            $0.height.equalTo(4.scale())
        }
    }
    
    func setupBottomView() {
        for _ in 1...4 {
            let view = UIView()
            view.backgroundColor = .white
            view.layer.cornerRadius = 2
            
            bottomContainerView.addArrangedSubview(view)
            view.snp.makeConstraints {
                $0.height.equalTo(4.scale())
            }
        }
    }
    
    func setupDateFormatter() {
        formatter.dateFormat = "mm:ss"
    }
    
    @objc func sendCode() {
        sendCodeAtion?()
    }
    
    func startTimer(_ nextRequestSMSTime: Int) {
        retryCodeSendLabel.isUserInteractionEnabled = false
        
        timer = Timer.scheduledTimer(
            withTimeInterval: 1,
            repeats: true,
            block: { [weak self] _ in
                let currentCounter = nextRequestSMSTime - Int(Date().timeIntervalSince1970)
                let convertDate = Date(timeIntervalSince1970: TimeInterval(currentCounter))
                let text = Localizable.codeCheckingTimer(self?.formatter.string(from: convertDate) ?? "")
                self?.updateRetryCodeSendLabel(with: text)

                guard currentCounter <= 0 else { return }
                self?.stopTimer()
            }
        )
    }

    func stopTimer() {
        retryCodeSendLabel.isUserInteractionEnabled = true
        updateRetryCodeSendLabel(with: Localizable.codeCheckingQuestion())

        timer?.invalidate()
        timer = nil
    }

    func updateRetryCodeSendLabel(with text: String) {
        retryCodeSendLabel.attributedText = NSAttributedString(
            string: text,
            attributes: makeStringAttributes())
    }
}
// MARK: - Public -
extension CodeCheckingViewImpl {
    func startTimerNext(_ nextRequestSMSTime: Int) {
        startTimer(nextRequestSMSTime)
    }
    
    func changeNumberInLabel(_ phone: String) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 20.scale()
        paragraphStyle.maximumLineHeight = 20.scale()
        
        descriptionLabel.attributedText = NSAttributedString(
            string: Localizable.codeCheckingDescription(phone),
            attributes: [
                .font: Font.dinRoundProBold(size: 20.scale())!,
                .foregroundColor: R.color.newsButtonText()!,
                .paragraphStyle: paragraphStyle
            ])
    }
    
    func stopTimerFromController() {
        stopTimer()
    }
}

// MARK: - Actions -
extension CodeCheckingViewImpl {
    func setTextFieldAction(_ action: @escaping((String) -> Void)) {
        self.textFieldAction = action
    }
    
    func setSendCodeAction(_ action: @escaping EmptyClosure) {
        self.sendCodeAtion = action
    }
    
    func updateScrollPosition(with height: CGFloat) {
        UIView.animate(withDuration: 0.2) { [self] in
            containerView.snp.updateConstraints {
                $0.bottom.equalToSuperview().offset(-height + 44.scale())
            }
            layoutIfNeeded()
        }
    }
    
    func resetScrollPosition() {
        UIView.animate(withDuration: 0.2) { [self] in
            containerView.snp.updateConstraints {
                $0.bottom.equalToSuperview()
            }
            layoutIfNeeded()
        }
    }
    
    func setMainButtonAction(_ action: @escaping((String) -> Void)) {
        self.mainButtonAction = action
    }
    
    func setupAction() {
        mainButton.setActionButton { [weak self] in
            guard let code = self?.textField.text else { return }
            self?.mainButtonAction?(code)
        }
    }
    
    func updateButton(_ isEnable: Bool) {
        mainButton.setEnable(isEnabled: isEnable)
        mainButton.layoutSubviews()
    }
}

// MARK: - MainTextFieldDelegate -
extension CodeCheckingViewImpl: MainTextFieldDelegate {
    func actionTextInput() {
        guard let code = textField.text else { return }
        textFieldAction?(code)
    }
}
